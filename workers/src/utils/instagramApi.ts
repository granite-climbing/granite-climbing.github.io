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

/**
 * Search recent media for a hashtag using the Instagram Graph API
 */
export async function searchHashtagMedia(
  tag: string,
  accessToken: string,
  userId: string,
  after?: string
): Promise<HashtagMediaResult> {
  const hashtagId = await getHashtagId(tag, accessToken, userId);
  if (!hashtagId) return { items: [], nextCursor: null };

  // Hashtag API supports limited fields: id, media_url, thumbnail_url, permalink, media_type
  // These must be requested inline — individual media IDs from hashtag API cannot be queried directly
  let mediaUrl =
    `${INSTAGRAM_API}/${hashtagId}/top_media` +
    `?user_id=${userId}` +
    `&fields=id,media_url,permalink,media_type` +
    `&limit=30` +
    `&access_token=${accessToken}`;
  if (after) mediaUrl += `&after=${encodeURIComponent(after)}`;

  const res = await fetch(mediaUrl);
  const rawText = await res.text();
  if (!res.ok) {
    console.error('[hashtag] top_media failed:', res.status, rawText);
    return { items: [], nextCursor: null };
  }

  const data = JSON.parse(rawText) as {
    data?: {
      id: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
      media_type?: string;
    }[];
    paging?: { cursors?: { after?: string }; next?: string };
  };
  console.log('[hashtag] top_media count:', data.data?.length ?? 0);

  const baseItems = (data.data ?? [])
    .filter((item) => item.permalink)
    .map((item) => ({
      id: item.id,
      media_url: item.media_url || item.thumbnail_url || '',
      thumbnail_url: item.thumbnail_url,
      permalink: item.permalink!,
      media_type: item.media_type || 'IMAGE',
    }));

  // Attempt to fetch username and timestamp for each media item via individual API calls.
  // Hashtag API does not return these fields directly; individual lookups may or may not
  // be permitted depending on token permissions — failures are silently ignored.
  const detailResults = await Promise.allSettled(
    baseItems.map((item) =>
      fetch(
        `${INSTAGRAM_API}/${item.id}?fields=username,timestamp&access_token=${accessToken}`
      ).then((r) => (r.ok ? (r.json() as Promise<{ username?: string; timestamp?: string }>) : null))
    )
  );

  const items: InstagramMediaItem[] = baseItems.map((item, i) => {
    const result = detailResults[i];
    if (result.status === 'fulfilled' && result.value) {
      return { ...item, username: result.value.username, timestamp: result.value.timestamp };
    }
    return item;
  });

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
