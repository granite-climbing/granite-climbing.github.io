/**
 * Instagram 해시태그 검색 핸들러
 *
 * 요청 파싱 + 서비스 호출 + HTTP 응답 반환만 담당합니다.
 * 해시태그 검색 로직은 instagramHashtagService에 있습니다.
 */

import { jsonResponse } from '../utils/response';
import { requireAdminAuth } from '../utils/auth';
import { IgApiFacebookLogin } from '../utils/IgApiFacebookLogin';
import { searchHashtag } from '../services/instagramHashtagService';

interface Env {
  DB: D1Database;
  INSTAGRAM_APP_ID: string;
  INSTAGRAM_APP_SECRET: string;
}

/**
 * GET /instagram/hashtag?hashtag=<tag>
 * 공개 해시태그 검색 엔드포인트.
 */
export async function handleHashtagSearch(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const hashtag = url.searchParams.get('hashtag');

  if (!hashtag) return jsonResponse({ error: 'Missing ?hashtag= parameter' }, 400, corsHeaders);

  try {
    const igApi = new IgApiFacebookLogin(env.INSTAGRAM_APP_ID, env.INSTAGRAM_APP_SECRET);
    const media = await searchHashtag(env.DB, igApi, hashtag);
    return jsonResponse({ data: media }, 200, corsHeaders);
  } catch (err: any) {
    if (err?.message === 'instagram_not_connected') {
      return jsonResponse({ error: 'Instagram not configured' }, 500, corsHeaders);
    }
    console.error('[instagramHashtag] search error:', err);
    return jsonResponse({ error: 'Failed to fetch Instagram data' }, 502, corsHeaders);
  }
}

/**
 * GET /admin/instagram/hashtag?hashtag=<tag>&after=<cursor>
 * 관리자용 해시태그 검색 엔드포인트 (페이지네이션 지원).
 */
export async function handleAdminHashtagSearch(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  const url = new URL(request.url);
  const hashtag = url.searchParams.get('hashtag');
  const after = url.searchParams.get('after') || undefined;

  if (!hashtag) return jsonResponse({ error: 'Missing ?hashtag= parameter' }, 400, corsHeaders);

  try {
    const igApi = new IgApiFacebookLogin(env.INSTAGRAM_APP_ID, env.INSTAGRAM_APP_SECRET);
    const result = await searchHashtag(env.DB, igApi, hashtag, after);
    return jsonResponse({ data: result.items, nextCursor: result.nextCursor }, 200, corsHeaders);
  } catch (err: any) {
    if (err?.message === 'instagram_not_connected') {
      return jsonResponse({ error: 'Instagram not connected' }, 400, corsHeaders);
    }
    console.error('[instagramHashtag] admin search error:', err);
    return jsonResponse({ error: 'Failed to fetch Instagram data' }, 502, corsHeaders);
  }
}
