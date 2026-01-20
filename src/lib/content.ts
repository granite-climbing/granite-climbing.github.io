import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getAssetPath } from './utils';

const contentDirectory = path.join(process.cwd(), 'content');

// 사이트 설정 가져오기
export function getSiteSettings() {
  const filePath = path.join(contentDirectory, 'settings', 'site.md');

  if (!fs.existsSync(filePath)) {
    return {
      heroImage: getAssetPath('/images/hero-sample.jpg'),
      slogan1: 'DREAM to DREAM!',
      slogan2: 'WORK LESS, CLIMB MORE!',
    };
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data } = matter(fileContents);

  return {
    heroImage: getAssetPath(data.heroImage || '/images/hero-sample.jpg'),
    slogan1: data.slogan1 || 'DREAM to DREAM!',
    slogan2: data.slogan2 || 'WORK LESS, CLIMB MORE!',
  };
}

// Crag 목록 가져오기
export function getAllCrags() {
  const cragsDirectory = path.join(contentDirectory, 'crags');

  if (!fs.existsSync(cragsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(cragsDirectory);
  const crags = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const filePath = path.join(cragsDirectory, fileName);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContents);

      // 난이도 범위 처리 (새 필드 또는 기존 형식 지원)
      let difficultyMin = data.difficultyMin || 'V0';
      let difficultyMax = data.difficultyMax || 'V10';

      // 기존 difficulty 필드 호환성 (V2-V10 형식)
      if (!data.difficultyMin && !data.difficultyMax && data.difficulty) {
        const match = data.difficulty.match(/^(V\d+)(?:-(V\d+))?$/);
        if (match) {
          difficultyMin = match[1];
          difficultyMax = match[2] || match[1];
        }
      }

      return {
        slug,
        title: data.title || '',
        thumbnail: getAssetPath(data.thumbnail || ''),
        difficultyMin,
        difficultyMax,
        description: data.description || '',
        problemCount: data.problemCount || 10,
      };
    });

  return crags;
}

// Culture (Trable + Rock Trip) 목록 가져오기
export function getAllCultureItems() {
  const items: Array<{
    slug: string;
    title: string;
    date: string;
    thumbnail: string;
    excerpt: string;
    type: 'trable' | 'rocktrip';
  }> = [];

  // Trable
  const trableDirectory = path.join(contentDirectory, 'culture', 'trable');
  if (fs.existsSync(trableDirectory)) {
    const trableFiles = fs.readdirSync(trableDirectory);
    trableFiles
      .filter((fileName) => fileName.endsWith('.md'))
      .forEach((fileName) => {
        const slug = fileName.replace(/\.md$/, '');
        const filePath = path.join(trableDirectory, fileName);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContents);

        items.push({
          slug,
          title: data.title || '',
          date: data.date ? formatDate(data.date) : '',
          thumbnail: data.thumbnail || '',
          excerpt: data.excerpt || '',
          type: 'trable',
        });
      });
  }

  // Rock Trip
  const rocktripDirectory = path.join(contentDirectory, 'culture', 'rocktrip');
  if (fs.existsSync(rocktripDirectory)) {
    const rocktripFiles = fs.readdirSync(rocktripDirectory);
    rocktripFiles
      .filter((fileName) => fileName.endsWith('.md'))
      .forEach((fileName) => {
        const slug = fileName.replace(/\.md$/, '');
        const filePath = path.join(rocktripDirectory, fileName);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContents);

        items.push({
          slug,
          title: data.title || '',
          date: data.date ? formatDate(data.date) : '',
          thumbnail: data.thumbnail || '',
          excerpt: data.excerpt || '',
          type: 'rocktrip',
        });
      });
  }

  // 날짜순 정렬 (최신순)
  items.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return items;
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0].replace(/-/g, '.');
}
