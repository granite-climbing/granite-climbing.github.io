/**
 * Instagram 해시태그 검색 서비스
 *
 * DB에서 토큰을 로드하여 해시태그 검색을 수행합니다.
 * 공개 엔드포인트와 관리자 엔드포인트 모두 이 서비스를 공유합니다.
 */

import { IgApiFacebookLogin, HashtagMediaResult } from '../utils/IgApiFacebookLogin';

/**
 * DB에 저장된 토큰으로 해시태그 검색을 수행합니다.
 * 토큰이 없으면 에러를 던집니다.
 *
 * @param db          - D1 데이터베이스 인스턴스
 * @param igApi       - IgApiFacebookLogin 인스턴스
 * @param tag         - 검색할 해시태그 (# 제외)
 * @param after       - 페이지네이션 커서 (선택)
 */
export async function searchHashtag(
  db: D1Database,
  igApi: IgApiFacebookLogin,
  tag: string,
  after?: string
): Promise<HashtagMediaResult> {
  const tokenRow = await db.prepare(
    'SELECT access_token, user_id FROM instagram_tokens LIMIT 1'
  ).first() as { access_token: string; user_id: string } | null;

  if (!tokenRow) {
    throw new Error('instagram_not_connected');
  }

  const cleanTag = tag.replace(/^#/, '');
  console.log('[instagramHashtagService] searching tag=%s after=%s userId=%s', cleanTag, after ?? 'none', tokenRow.user_id);

  const hashtagId = await igApi.getHashtagId(cleanTag, tokenRow.access_token, tokenRow.user_id);
  if (!hashtagId) return { items: [], nextCursor: null };

  const result = await igApi.searchHashtagTopMedia(hashtagId, tokenRow.user_id, tokenRow.access_token, after);
  console.log('[instagramHashtagService] result count=%d nextCursor=%s', result.items.length, result.nextCursor ?? 'none');

  return result;
}
