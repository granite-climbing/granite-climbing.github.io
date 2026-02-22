/**
 * Instagram Hashtag Search Handler
 * Proxies Instagram Graph API hashtag search requests
 */

import { jsonResponse } from '../utils/response';

interface Env {
  INSTAGRAM_ACCESS_TOKEN: string;
  INSTAGRAM_USER_ID: string;
}

const INSTAGRAM_API = 'https://graph.facebook.com/v21.0';

// In-memory hashtag ID cache (lives as long as the Worker instance)
const hashtagCache = new Map<string, { id: string; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Handle Instagram hashtag search requests
 */
export async function handleHashtagSearch(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Validate secrets are configured
  if (!env.INSTAGRAM_ACCESS_TOKEN || !env.INSTAGRAM_USER_ID) {
    return jsonResponse({ error: 'Instagram API not configured' }, 500, corsHeaders);
  }

  const url = new URL(request.url);
  const hashtag = url.searchParams.get('hashtag');

  if (!hashtag) {
    return jsonResponse({ error: 'Missing ?hashtag= parameter' }, 400, corsHeaders);
  }

  try {
    const media = await searchHashtagMedia(hashtag, env);
    return jsonResponse({ data: media }, 200, corsHeaders);
  } catch (error) {
    console.error('Hashtag search error:', error);
    return jsonResponse({ error: 'Failed to fetch Instagram data' }, 502, corsHeaders);
  }
}

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
