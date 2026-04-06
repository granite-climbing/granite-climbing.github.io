/**
 * Instagram OAuth 핸들러
 *
 * 요청 파싱 + 서비스 호출 + HTTP 응답 반환만 담당합니다.
 * 비즈니스 로직은 instagramAuthService 에 있습니다.
 *
 * OAuth 플로우:
 * 1. GET  /admin/instagram/auth-url  → OAuth URL 반환
 * 2. GET  /instagram/callback        → 코드 교환, 토큰 저장
 * 3. GET  /admin/instagram/status    → 토큰 상태 조회
 * 4. POST /admin/instagram/refresh   → 토큰 갱신
 * 5. DELETE /admin/instagram/token   → 연결 해제
 */

import { jsonResponse } from '../utils/response';
import { requireAdminAuth } from '../utils/auth';
import { IgApiFacebookLogin } from '../utils/IgApiFacebookLogin';
import {
  generateOAuthState,
  buildOAuthUrl,
  validateOAuthState,
  prepareOAuthAccounts,
  confirmOAuthAccount,
  getTokenStatus,
  refreshToken,
  deleteToken,
} from '../services/instagramAuthService';

interface Env {
  DB: D1Database;
  INSTAGRAM_APP_ID: string;
  INSTAGRAM_APP_SECRET: string;
  ALLOWED_ORIGIN: string;
}

/**
 * GET /admin/instagram/auth-url
 * Instagram OAuth 인증 URL을 반환합니다.
 */
export async function handleGetInstagramAuthUrl(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_APP_SECRET) {
    return jsonResponse({ error: 'Instagram app credentials not configured' }, 500, corsHeaders);
  }

  const state = await generateOAuthState(env.DB);
  const redirectUri = `${new URL(request.url).origin}/instagram/callback`;
  const url = buildOAuthUrl(state, env.INSTAGRAM_APP_ID, redirectUri);

  console.log('[instagramAuth] OAuth URL generated');
  return jsonResponse({ url }, 200, corsHeaders);
}

/**
 * GET /instagram/callback
 * OAuth 콜백을 처리합니다 (인증 없는 공개 엔드포인트).
 */
export async function handleInstagramCallback(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const adminUrl = env.ALLOWED_ORIGIN || 'https://granite.kr';
  const successRedirect = `${adminUrl}/admin/beta-videos/?instagram=connected`;

  console.log('[instagramAuth] callback — error=%s code=%s state=%s', error ?? 'none', code ? 'present' : 'missing', state ? 'present' : 'missing');

  if (error) return Response.redirect(`${adminUrl}/admin/beta-videos/?instagram=error&reason=denied`, 302);
  if (!code || !state) return Response.redirect(`${adminUrl}/admin/beta-videos/?instagram=error&reason=missing_params`, 302);

  const valid = await validateOAuthState(env.DB, state);
  if (!valid) return Response.redirect(`${adminUrl}/admin/beta-videos/?instagram=error&reason=invalid_state`, 302);

  try {
    const igApi = new IgApiFacebookLogin(env.INSTAGRAM_APP_ID, env.INSTAGRAM_APP_SECRET);
    const redirectUri = `${new URL(request.url).origin}/instagram/callback`;
    const pending = await prepareOAuthAccounts(code, redirectUri, igApi, env.DB);

    if (pending) {
      // 계정이 여러 개 — 선택 페이지로 리다이렉트
      return Response.redirect(
        `${adminUrl}/admin/beta-videos/?instagram=select&session=${pending.sessionId}`,
        302
      );
    }

    return Response.redirect(successRedirect, 302);
  } catch (err: any) {
    const reason = err?.message ?? 'server_error';
    console.error('[instagramAuth] callback error:', err);
    return Response.redirect(`${adminUrl}/admin/beta-videos/?instagram=error&reason=${reason}`, 302);
  }
}

/**
 * GET /admin/instagram/pending-accounts?session=<sessionId>
 * 계정 선택 대기 중인 계정 목록을 반환합니다.
 */
export async function handleGetPendingAccounts(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  const sessionId = new URL(request.url).searchParams.get('session');
  if (!sessionId) return jsonResponse({ error: 'Missing session parameter' }, 400, corsHeaders);

  const row = await (env.DB as D1Database).prepare(
    'SELECT accounts FROM instagram_pending_accounts WHERE session_id = ?'
  ).bind(sessionId).first() as { accounts: string } | null;

  if (!row) return jsonResponse({ error: 'Session not found or expired' }, 404, corsHeaders);

  return jsonResponse({ accounts: JSON.parse(row.accounts) }, 200, corsHeaders);
}

/**
 * POST /admin/instagram/confirm-account
 * 선택된 계정으로 연동을 완료합니다.
 */
export async function handleConfirmAccount(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  const body = await request.json() as { sessionId?: string; pageId?: string };
  if (!body.sessionId || !body.pageId) {
    return jsonResponse({ error: 'Missing sessionId or pageId' }, 400, corsHeaders);
  }

  try {
    const igApi = new IgApiFacebookLogin(env.INSTAGRAM_APP_ID, env.INSTAGRAM_APP_SECRET);
    await confirmOAuthAccount(body.sessionId, body.pageId, igApi, env.DB);
    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (err: any) {
    if (err?.message === 'session_not_found') return jsonResponse({ error: 'Session not found or expired' }, 404, corsHeaders);
    if (err?.message === 'invalid_account') return jsonResponse({ error: 'Invalid account selection' }, 400, corsHeaders);
    console.error('[instagramAuth] confirm error:', err);
    return jsonResponse({ error: 'Failed to confirm account' }, 500, corsHeaders);
  }
}

/**
 * GET /admin/instagram/status
 * 연결된 Instagram 토큰 상태를 반환합니다.
 */
export async function handleGetInstagramStatus(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  const status = await getTokenStatus(env.DB);

  if (!status) return jsonResponse({ connected: false }, 200, corsHeaders);

  console.log('[instagramAuth] status — userId=%s daysUntilExpiry=%d', status.userId, status.daysUntilExpiry);
  return jsonResponse({ connected: true, ...status }, 200, corsHeaders);
}

/**
 * POST /admin/instagram/refresh
 * 장기 토큰을 갱신합니다 (60일 연장).
 */
export async function handleRefreshInstagramToken(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  try {
    const igApi = new IgApiFacebookLogin(env.INSTAGRAM_APP_ID, env.INSTAGRAM_APP_SECRET);
    const result = await refreshToken(env.DB, igApi);
    return jsonResponse({ success: true, ...result }, 200, corsHeaders);
  } catch (err: any) {
    if (err?.message === 'no_token') return jsonResponse({ error: 'No Instagram token found' }, 404, corsHeaders);
    console.error('[instagramAuth] refresh error:', err);
    return jsonResponse({ error: 'Failed to refresh token' }, 500, corsHeaders);
  }
}

/**
 * DELETE /admin/instagram/token
 * Instagram 연결을 해제합니다.
 */
export async function handleDeleteInstagramToken(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  await deleteToken(env.DB);
  return jsonResponse({ success: true }, 200, corsHeaders);
}
