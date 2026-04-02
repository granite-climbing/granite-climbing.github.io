/**
 * htmlScraper.ts — HTML OGP 메타태그 파싱을 통한 Instagram 게시물 정보 취득 유틸리티
 */

import type { OembedInfo } from './IgApiFacebookLogin';

/**
 * Instagram 게시물 URL의 HTML을 fetch하여 OembedInfo를 추출합니다.
 * User-Agent facebookexternalhit/1.1 로 OGP 메타태그가 포함된 응답을 유도합니다.
 *
 * - og:image        → thumbnail_url
 * - og:description  → author_name ("username on 날짜: ..." 형식에서 추출)
 *
 * @param url - Instagram 게시물 URL
 * @see https://ogp.me/
 */
export async function getVideoMetaFromHTML(url: string): Promise<OembedInfo | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // og:image → thumbnail_url
    const imageMatch =
      html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ??
      html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
    const thumbnail_url = imageMatch?.[1]
      ?.replace(/&amp;/g, '&')
      ?.replace(/&lt;/g, '<')
      ?.replace(/&gt;/g, '>')
      ?.replace(/&quot;/g, '"')
      ?.replace(/&#39;/g, "'")
      ?? undefined;

    // og:url → username 추출
    // e.g. "https://www.instagram.com/dana2thetop/reel/DQoTJQrD2BU/" → "dana2thetop"
    const urlMatch =
      html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/i) ??
      html.match(/<meta\s+content="([^"]+)"\s+property="og:url"/i);
    const ogUrl = urlMatch?.[1];
    const author_name = ogUrl
      ? new URL(ogUrl).pathname.split('/').filter(Boolean)[0]
      : undefined;

    if (!thumbnail_url && !author_name) return null;
    return { thumbnail_url, author_name };
  } catch {
    return null;
  }
}
