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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only allow GET
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Validate secrets are configured
    if (!env.INSTAGRAM_ACCESS_TOKEN || !env.INSTAGRAM_USER_ID) {
      return jsonResponse({ error: 'Instagram API not configured' }, 500, corsHeaders);
    }

    const url = new URL(request.url);
    const tag = url.searchParams.get('tag');

    if (!tag) {
      return jsonResponse({ error: 'Missing ?tag= parameter' }, 400, corsHeaders);
    }

    try {
      const media = await searchHashtagMedia(tag, env);
      return jsonResponse({ media }, 200, corsHeaders);
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
