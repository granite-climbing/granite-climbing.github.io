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
}

/**
 * Search recent media for a hashtag using the Instagram Graph API
 */
export async function searchHashtagMedia(
  tag: string,
  accessToken: string,
  userId: string
): Promise<InstagramMediaItem[]> {
  const hashtagId = await getHashtagId(tag, accessToken, userId);
  if (!hashtagId) return [];

  const mediaUrl =
    `${INSTAGRAM_API}/${hashtagId}/recent_media` +
    `?user_id=${userId}` +
    `&fields=id,media_url,thumbnail_url,permalink,media_type` +
    `&limit=30` +
    `&access_token=${accessToken}`;

  const res = await fetch(mediaUrl);
  if (!res.ok) {
    const errText = await res.text();
    console.error('[hashtag] recent_media failed:', res.status, errText);
    return [];
  }

  const data = (await res.json()) as {
    data: {
      id: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink: string;
      media_type: string;
    }[];
  };
  console.log('[hashtag] recent_media count:', data.data?.length ?? 0);

  return data.data.map((item) => ({
    id: item.id,
    media_url: item.media_url || '',
    thumbnail_url: item.thumbnail_url,
    permalink: item.permalink,
    media_type: item.media_type,
  }));
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
  if (!res.ok) {
    const errText = await res.text();
    console.error('[hashtag] ig_hashtag_search failed:', res.status, errText);
    return null;
  }

  const data = (await res.json()) as { data: { id: string }[] };
  console.log('[hashtag] ig_hashtag_search response:', JSON.stringify(data));

  if (data.data.length === 0) return null;

  const id = data.data[0].id;
  hashtagCache.set(tag, { id, ts: Date.now() });

  return id;
}
