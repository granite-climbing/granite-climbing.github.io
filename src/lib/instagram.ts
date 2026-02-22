/**
 * Instagram Graph API - Hashtag Media Search
 *
 * The actual API calls are handled by the Cloudflare Worker proxy
 * located at /workers/instagram-proxy/.
 *
 * The client (BoulderDetail) calls the Worker via NEXT_PUBLIC_INSTAGRAM_API_URL.
 * This module contains shared types and is kept as a reference.
 *
 * Setup:
 * 1. Deploy the Worker: cd workers/instagram-proxy && pnpm deploy
 * 2. Set secrets: wrangler secret put INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_USER_ID
 * 3. Set NEXT_PUBLIC_INSTAGRAM_API_URL=https://granite-instagram-proxy.<account>.workers.dev
 *
 * Rate limits:
 * - 30 unique hashtags per 7 days per user
 * - 25 API calls per hashtag per 7 days
 */

const INSTAGRAM_API_BASE = 'https://graph.facebook.com/v21.0';

export interface InstagramMedia {
  id: string;
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
}

interface HashtagSearchResponse {
  data: { id: string }[];
}

interface MediaResponse {
  data: {
    id: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink: string;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  }[];
}

// Simple in-memory cache for hashtag IDs
const hashtagIdCache = new Map<string, { id: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function searchHashtagMedia(
  tag: string,
  accessToken: string,
  userId: string
): Promise<InstagramMedia[]> {
  // Step 1: Get hashtag ID (with cache)
  const hashtagId = await getHashtagId(tag, userId, accessToken);
  if (!hashtagId) return [];

  // Step 2: Get recent media
  const mediaUrl = `${INSTAGRAM_API_BASE}/${hashtagId}/recent_media?user_id=${userId}&fields=id,media_url,thumbnail_url,permalink,media_type&limit=30&access_token=${accessToken}`;

  const res = await fetch(mediaUrl);
  if (!res.ok) return [];

  const data: MediaResponse = await res.json();

  return data.data.map((item) => ({
    id: item.id,
    media_url: item.media_url || '',
    thumbnail_url: item.thumbnail_url,
    permalink: item.permalink,
    media_type: item.media_type,
  }));
}

async function getHashtagId(
  tag: string,
  userId: string,
  accessToken: string
): Promise<string | null> {
  const cached = hashtagIdCache.get(tag);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.id;
  }

  const searchUrl = `${INSTAGRAM_API_BASE}/ig_hashtag_search?q=${encodeURIComponent(tag)}&user_id=${userId}&access_token=${accessToken}`;

  const res = await fetch(searchUrl);
  if (!res.ok) return null;

  const data: HashtagSearchResponse = await res.json();
  if (data.data.length === 0) return null;

  const hashtagId = data.data[0].id;
  hashtagIdCache.set(tag, { id: hashtagId, timestamp: Date.now() });

  return hashtagId;
}
