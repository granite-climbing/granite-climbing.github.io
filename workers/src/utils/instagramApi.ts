/**
 * Shared Instagram Graph API utilities
 * Used by both the public hashtag search endpoint and the admin hashtag search endpoint
 */

export const INSTAGRAM_API = 'https://graph.facebook.com/v21.0';

// In-memory hashtag ID cache (lives as long as the Worker instance)
const hashtagCache = new Map<string, { id: string; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface InstagramMediaItem {
  id: string;
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  media_type: string;
  username?: string;
  timestamp?: string;
}

export interface HashtagMediaResult {
  items: InstagramMediaItem[];
  nextCursor: string | null;
}

interface OembedInfo {
  author_name?: string;
  thumbnail_url?: string;
}

/**
 * Fetch oEmbed info for a single Instagram post permalink.
 * Returns author_name (username) and thumbnail_url.
 * Uses App access token ({APP_ID}|{APP_SECRET}) — no user token needed.
 * > https://developers.facebook.com/docs/instagram-platform/oembed
 */
export async function fetchOembedInfo(
  permalink: string,
  appToken: string
): Promise<OembedInfo | null> {
  const res = await fetch(
    `${INSTAGRAM_API}/instagram_oembed` +
      `?url=${encodeURIComponent(permalink)}` +
      `&fields=author_name,thumbnail_url` +
      `&access_token=${appToken}`
  );
  const text = await res.text();
  if (!res.ok) {
    console.warn(`[oembed] failed for ${permalink}: ${res.status} ${text}`);
    return null;
  }
  const json = JSON.parse(text) as OembedInfo;
  console.log(`[oembed] ${permalink}: author_name=${json.author_name ?? 'null'} thumbnail=${json.thumbnail_url ? 'yes' : 'no'}`);
  return json;
}


/**
 * Search recent media for a hashtag using the Instagram Graph API.
 * Returns raw results without oEmbed enrichment — username/thumbnail
 * are fetched via oEmbed only at registration time (POST /beta-videos).
 */
export async function searchHashtagMedia(
  tag: string,
  accessToken: string,
  userId: string,
  after?: string
): Promise<HashtagMediaResult> {
  const hashtagId = await getHashtagId(tag, accessToken, userId);
  if (!hashtagId) return { items: [], nextCursor: null };

  // Available fields per API docs:
  // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/top-media
  // Note: thumbnail_url is NOT a supported field for this endpoint
  // Note: media_url is not returned for CAROUSEL_ALBUM type
  let mediaUrl =
    `${INSTAGRAM_API}/${hashtagId}/top_media` +
    `?user_id=${userId}` +
    `&fields=id,media_type,media_url,permalink,timestamp,comments_count,like_count` +
    `&limit=50` +
    `&access_token=${accessToken}`;
  if (after) mediaUrl += `&after=${encodeURIComponent(after)}`;

  const res = await fetch(mediaUrl);
  const rawText = await res.text();
  console.log('[hashtag] top_media raw:', rawText);

  if (!res.ok) {
    console.error('[hashtag] top_media failed:', res.status, rawText);
    return { items: [], nextCursor: null };
  }

  const data = JSON.parse(rawText) as {
    data?: {
      id: string;
      media_type?: string;
      media_url?: string;
      permalink?: string;
      timestamp?: string;
      comments_count?: number;
      like_count?: number;
    }[];
    paging?: { cursors?: { after?: string }; next?: string };
  };
  console.log('[hashtag] top_media count:', data.data?.length ?? 0);

  const items: InstagramMediaItem[] = (data.data ?? [])
    .filter((item) => item.permalink)
    .map((item) => ({
      id: item.id,
      media_url: item.media_url || '',
      permalink: item.permalink!,
      media_type: item.media_type || 'IMAGE',
      timestamp: item.timestamp,
    }));

  const nextCursor = data.paging?.next ? (data.paging.cursors?.after ?? null) : null;

  return { items, nextCursor };
}

/**
 * Get or cache the Instagram hashtag ID for a given tag string
 */
export async function getHashtagId(
  tag: string,
  accessToken: string,
  userId: string
): Promise<string | null> {
  const cached = hashtagCache.get(tag);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.id;
  }

  const searchUrl =
    `${INSTAGRAM_API}/ig_hashtag_search` +
    `?q=${encodeURIComponent(tag)}` +
    `&user_id=${userId}` +
    `&access_token=${accessToken}`;

  const res = await fetch(searchUrl);
  if (!res.ok) return null;

  const data = (await res.json()) as { data: { id: string }[] };
  if (data.data.length === 0) return null;

  const id = data.data[0].id;
  hashtagCache.set(tag, { id, ts: Date.now() });

  return id;
}
