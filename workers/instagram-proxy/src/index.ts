/**
 * Cloudflare Worker - Instagram Graph API Proxy
 *
 * Proxies Instagram hashtag media searches from the static GitHub Pages site.
 * Keeps the access token secure on the server side.
 *
 * Environment variables (set via `wrangler secret put`):
 *   INSTAGRAM_ACCESS_TOKEN  - Long-lived user access token
 *   INSTAGRAM_USER_ID       - Instagram Business Account ID
 *
 * Environment variables (set in wrangler.toml [vars]):
 *   ALLOWED_ORIGIN          - CORS origin (e.g. https://granite-climbing.github.io)
 */

interface Env {
  INSTAGRAM_ACCESS_TOKEN: string;
  INSTAGRAM_USER_ID: string;
  ALLOWED_ORIGIN: string;
  DB: D1Database;  // D1 database binding for beta videos
}

const INSTAGRAM_API = 'https://graph.facebook.com/v21.0';

// In-memory hashtag ID cache (lives as long as the Worker instance)
const hashtagCache = new Map<string, { id: string; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',  // Allow POST
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Route beta video endpoints
    if (url.pathname === '/beta-videos') {
      if (request.method === 'GET') {
        return handleGetBetaVideos(request, env, corsHeaders);
      } else if (request.method === 'POST') {
        return handleSubmitBetaVideo(request, env, corsHeaders);
      } else {
        return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
      }
    }

    // Default: hashtag search (existing functionality)
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Validate secrets are configured
    if (!env.INSTAGRAM_ACCESS_TOKEN || !env.INSTAGRAM_USER_ID) {
      return jsonResponse({ error: 'Instagram API not configured' }, 500, corsHeaders);
    }

    const hashtag = url.searchParams.get('hashtag');

    if (!hashtag) {
      return jsonResponse({ error: 'Missing ?hashtag= parameter' }, 400, corsHeaders);
    }

    try {
      const media = await searchHashtagMedia(hashtag, env);
      // FIX: Return { data } instead of { media } to match frontend expectation
      return jsonResponse({ data: media }, 200, corsHeaders);
    } catch {
      return jsonResponse({ error: 'Failed to fetch Instagram data' }, 502, corsHeaders);
    }
  },
};

async function searchHashtagMedia(tag: string, env: Env) {
  // Step 1: Get hashtag ID (cached)
  const hashtagId = await getHashtagId(tag, env);
  if (!hashtagId) return [];

  // Step 2: Fetch recent media
  const mediaUrl =
    `${INSTAGRAM_API}/${hashtagId}/recent_media` +
    `?user_id=${env.INSTAGRAM_USER_ID}` +
    `&fields=id,media_url,thumbnail_url,permalink,media_type` +
    `&limit=30` +
    `&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`;

  const res = await fetch(mediaUrl);
  if (!res.ok) return [];

  const data = (await res.json()) as {
    data: {
      id: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink: string;
      media_type: string;
    }[];
  };

  return data.data.map((item) => ({
    id: item.id,
    media_url: item.media_url || '',
    thumbnail_url: item.thumbnail_url,
    permalink: item.permalink,
    media_type: item.media_type,
  }));
}

async function getHashtagId(tag: string, env: Env): Promise<string | null> {
  const cached = hashtagCache.get(tag);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.id;
  }

  const searchUrl =
    `${INSTAGRAM_API}/ig_hashtag_search` +
    `?q=${encodeURIComponent(tag)}` +
    `&user_id=${env.INSTAGRAM_USER_ID}` +
    `&access_token=${env.INSTAGRAM_ACCESS_TOKEN}`;

  const res = await fetch(searchUrl);
  if (!res.ok) return null;

  const data = (await res.json()) as { data: { id: string }[] };
  if (data.data.length === 0) return null;

  const id = data.data[0].id;
  hashtagCache.set(tag, { id, ts: Date.now() });

  return id;
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

// Extract Instagram post ID from URL
function extractInstagramPostId(url: string): string | null {
  // Match Instagram post URL patterns:
  // https://www.instagram.com/p/ABC123/
  // https://instagram.com/p/ABC123/
  // https://www.instagram.com/reel/ABC123/
  const match = url.match(/instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}

// Handle GET /beta-videos?problem=<slug>
async function handleGetBetaVideos(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const problemSlug = url.searchParams.get('problem');

  if (!problemSlug) {
    return jsonResponse({ error: 'Missing problem parameter' }, 400, corsHeaders);
  }

  try {
    // Query database for approved videos
    const { results } = await env.DB.prepare(
      'SELECT id, instagram_url, submitted_at FROM beta_videos WHERE problem_slug = ? AND status = ? ORDER BY submitted_at DESC'
    ).bind(problemSlug, 'approved').all();

    return jsonResponse({ videos: results }, 200, corsHeaders);
  } catch (error) {
    console.error('Database error:', error);
    return jsonResponse({ error: 'Failed to fetch beta videos' }, 500, corsHeaders);
  }
}

// Handle POST /beta-videos
async function handleSubmitBetaVideo(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json() as { problemSlug?: string; instagramUrl?: string };
    const { problemSlug, instagramUrl } = body;

    // Validate inputs
    if (!problemSlug || !instagramUrl) {
      return jsonResponse({ error: 'Missing required fields' }, 400, corsHeaders);
    }

    // Extract Instagram post ID from URL
    const postId = extractInstagramPostId(instagramUrl);
    if (!postId) {
      return jsonResponse({ error: 'Invalid Instagram URL format' }, 400, corsHeaders);
    }

    // Check for duplicate
    const existing = await env.DB.prepare(
      'SELECT id FROM beta_videos WHERE problem_slug = ? AND instagram_post_id = ?'
    ).bind(problemSlug, postId).first();

    if (existing) {
      return jsonResponse({ error: 'Video already submitted for this problem' }, 409, corsHeaders);
    }

    // Insert into database
    const result = await env.DB.prepare(
      'INSERT INTO beta_videos (problem_slug, instagram_url, instagram_post_id, submitted_at, status) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      problemSlug,
      instagramUrl,
      postId,
      new Date().toISOString(),
      'approved'  // Auto-approve for MVP
    ).run();

    return jsonResponse({ success: true, id: result.meta.last_row_id }, 201, corsHeaders);
  } catch (error) {
    console.error('Submission error:', error);
    return jsonResponse({ error: 'Failed to submit beta video' }, 500, corsHeaders);
  }
}
