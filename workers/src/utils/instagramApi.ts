/**
 * Shared Instagram Graph API utilities
 * Used by both the public hashtag search endpoint and the admin hashtag search endpoint
 *
 * 하위 호환성을 위해 기존 export 를 유지하며, 실제 로직은 IgApiFacebookLogin 으로 위임합니다.
 */

import { igApi } from './IgApiFacebookLogin';

export type { InstagramMediaItem, HashtagMediaResult } from './IgApiFacebookLogin';

export const INSTAGRAM_API = 'https://graph.facebook.com/v21.0';

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
  return igApi.fetchOembed(permalink, appToken);
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
) {
  const hashtagId = await igApi.getHashtagId(tag, accessToken, userId);
  if (!hashtagId) return { items: [], nextCursor: null };
  return igApi.searchHashtagTopMedia(hashtagId, userId, accessToken, after);
}

/**
 * Get or cache the Instagram hashtag ID for a given tag string
 */
export async function getHashtagId(
  tag: string,
  accessToken: string,
  userId: string
): Promise<string | null> {
  return igApi.getHashtagId(tag, accessToken, userId);
}
