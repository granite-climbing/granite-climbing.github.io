#!/usr/bin/env node
/**
 * sync-problems.mjs
 * Reads content/problems/*.md and upserts (slug, title) into D1 `problems` table.
 *
 * Usage:
 *   node scripts/sync-problems.mjs [--remote]
 *
 * Flags:
 *   --remote   Target the remote (production) D1 database (default: local)
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const problemsDir = join(root, 'content', 'problems');
const remote = process.argv.includes('--remote');

/** Parse YAML frontmatter from a Markdown file — handles only simple key: value pairs */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = value;
  }
  return result;
}

const files = readdirSync(problemsDir).filter((f) => f.endsWith('.md'));
const problems = [];

for (const file of files) {
  const content = readFileSync(join(problemsDir, file), 'utf8');
  const fm = parseFrontmatter(content);
  if (fm.slug && fm.title) {
    problems.push({ slug: fm.slug, title: fm.title });
  } else {
    const slug = file.replace(/\.md$/, '');
    if (fm.title) {
      problems.push({ slug, title: fm.title });
    } else {
      console.warn(`[skip] ${file}: missing slug or title`);
    }
  }
}

console.log(`Found ${problems.length} problems`);

// Build a single SQL statement with all upserts
const values = problems
  .map(({ slug, title }) => {
    const escapedSlug = slug.replace(/'/g, "''");
    const escapedTitle = title.replace(/'/g, "''");
    return `('${escapedSlug}', '${escapedTitle}')`;
  })
  .join(',\n  ');

const sql = `INSERT OR REPLACE INTO problems (slug, title) VALUES\n  ${values};`;

const remoteFlag = remote ? '--remote' : '--local';
const cmd = `npx wrangler d1 execute granite ${remoteFlag} --command "${sql.replace(/"/g, '\\"')}"`;

console.log(`Executing D1 upsert (${remote ? 'remote' : 'local'})...`);
try {
  execSync(cmd, { cwd: join(root, 'workers'), stdio: 'inherit' });
  console.log('Done.');
} catch (err) {
  console.error('Failed:', err.message);
  process.exit(1);
}
