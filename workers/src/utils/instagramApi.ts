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
 * Enrich media items with Instagram username via oEmbed API.
 * oEmbed accepts a post permalink and returns author_name (= username).
 * Uses App access token ({APP_ID}|{APP_SECRET}) — no user token needed.
 */
async function enrichWithOembed(
  items: Omit<InstagramMediaItem, 'username'>[],
  appToken: string
): Promise<InstagramMediaItem[]> {
  console.log(`[oembed] enriching ${items.length} items`);
  const results = await Promise.allSettled(
    items.map((item) =>
      fetch(
        `${INSTAGRAM_API}/instagram_oembed` +
          `?url=${encodeURIComponent(item.permalink)}` +
          `&fields=author_name` +
          `&access_token=${appToken}`
      ).then(async (r) => {
        const text = await r.text();
        if (!r.ok) {
          console.warn(`[oembed] failed for ${item.permalink}: ${r.status} ${text}`);
          return null;
        }
        const json = JSON.parse(text) as { author_name?: string };
        console.log(`[oembed] ${item.permalink}: author_name=${json.author_name ?? 'null'}`);
        return json;
      })
    )
  );

  let successCount = 0;
  const enriched: InstagramMediaItem[] = items.map((item, i) => {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value?.author_name) {
      successCount++;
      return { ...item, username: result.value.author_name };
    }
    if (result.status === 'rejected') {
      console.error(`[oembed] rejected for ${item.permalink}:`, result.reason);
    }
    return item;
  });
  console.log(`[oembed] username resolved: ${successCount}/${items.length}`);
  return enriched;
}

/**
 * Search recent media for a hashtag using the Instagram Graph API
 */
export async function searchHashtagMedia(
  tag: string,
  accessToken: string,
  userId: string,
  after?: string,
  appToken?: string
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

  // Fetch username via oEmbed API using each item's permalink.
  // oEmbed accepts the post URL and returns author_name (= Instagram username).
  // Uses an App access token ({APP_ID}|{APP_SECRET}) — no user token needed.
  // timestamp is not available via oEmbed; remains undefined.
  const items: InstagramMediaItem[] = appToken
    ? await enrichWithOembed(baseItems, appToken)
    : baseItems;

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
