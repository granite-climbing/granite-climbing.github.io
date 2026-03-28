/**
 * Instagram OAuth 및 토큰 관리 서비스
 *
 * OAuth 플로우, 토큰 저장/갱신/삭제 비즈니스 로직을 담당합니다.
 * 핸들러는 이 서비스를 호출하고 HTTP 응답 반환만 담당합니다.
 */

import { IgApiFacebookLogin } from '../utils/IgApiFacebookLogin';

export interface TokenStatus {
  userId: string;
  username: string | null;
  expiresAt: string;
  updatedAt: string;
  daysUntilExpiry: number;
  needsRefresh: boolean;
}

interface TokenRow {
  access_token: string;
  user_id: string;
  username: string | null;
  expires_at: string;
  updated_at: string;
}

/**
 * CSRF 방지용 OAuth state 값을 생성하고 DB에 저장합니다.
 * 만료된 state(10분 초과)는 함께 정리됩니다.
 */
export async function generateOAuthState(db: D1Database): Promise<string> {
  await db.prepare(
    "DELETE FROM instagram_oauth_state WHERE created_at < datetime('now', '-10 minutes')"
  ).run();

  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(stateBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  await db.prepare(
    'INSERT INTO instagram_oauth_state (state, created_at) VALUES (?, ?)'
  ).bind(state, new Date().toISOString()).run();

  return state;
}

/**
 * Facebook OAuth 다이얼로그 URL을 생성합니다.
 */
export function buildOAuthUrl(state: string, appId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: 'instagram_basic,pages_show_list,pages_manage_metadata',
    response_type: 'code',
    state,
  });
  return `https://www.facebook.com/dialog/oauth?${params}`;
}

/**
 * OAuth state 값이 유효한지 검증하고 사용 처리(삭제)합니다.
 * 일회용이므로 조회 후 즉시 삭제합니다.
 */
export async function validateOAuthState(db: D1Database, state: string): Promise<boolean> {
  const stored = await db.prepare(
    'SELECT state FROM instagram_oauth_state WHERE state = ?'
  ).bind(state).first();

  await db.prepare('DELETE FROM instagram_oauth_state WHERE state = ?').bind(state).run();

  return !!stored;
}

/**
 * OAuth 콜백을 완료합니다.
 * code → 단기 토큰 → 장기 토큰 교환, IG 계정 정보 조회, 토큰 저장, 페이지 Webhook 구독까지 처리합니다.
 */
export async function completeOAuthCallback(
  code: string,
  redirectUri: string,
  igApi: IgApiFacebookLogin,
  db: D1Database
): Promise<void> {
  // Step 1: code → 단기 토큰
  const shortToken = await igApi.exchangeCodeForToken(code, redirectUri);
  if (!shortToken) throw new Error('token_exchange');

  // Step 2: /me/accounts → Page ID + Instagram Business Account ID
  let userId: string;
  let pageId: string | null = null;
  let pageAccessToken: string | null = null;
  let igUsername: string | null = null;

  const accountsData = await igApi.getAccounts(shortToken.access_token);
  const page = accountsData?.data?.[0];
  const igId = page?.instagram_business_account?.id;

  if (igId) {
    userId = igId;
    pageId = page!.id;
    pageAccessToken = page!.access_token;
    const igUserInfo = await igApi.getIgUserInfo(igId, shortToken.access_token).catch(() => null);
    igUsername = igUserInfo?.username ?? null;
  } else {
    // Fallback: Facebook 유저 ID 사용
    console.warn('[instagramAuthService] no instagram_business_account — falling back to Facebook user ID');
    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id&access_token=${shortToken.access_token}`
    );
    const meData = (await meRes.json()) as { id: string };
    userId = meData.id;
  }

  // Step 3: 단기 → 장기 토큰 (60일)
  const longToken = await igApi.exchangeForLongLivedToken(shortToken.access_token);
  if (!longToken) throw new Error('long_token_exchange');

  // Step 4: DB 저장 (기존 토큰 교체)
  const now = new Date().toISOString();
  const expiresAt = longToken.expires_in
    ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
    : longToken.expires_at
      ? new Date(longToken.expires_at * 1000).toISOString()
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  await db.prepare('DELETE FROM instagram_tokens').run();
  await db.prepare(
    'INSERT INTO instagram_tokens (access_token, user_id, username, token_type, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(longToken.access_token, userId, igUsername, 'long_lived', expiresAt, now, now).run();

  console.log('[instagramAuthService] token saved — userId=%s username=%s expiresAt=%s', userId, igUsername ?? 'null', expiresAt);

  // Step 5: 페이지 Webhook 구독 (non-fatal)
  if (pageId && pageAccessToken) {
    await igApi.subscribePageToWebhook(pageId, pageAccessToken).catch((err) => {
      console.error('[instagramAuthService] page webhook subscription failed:', err);
    });
  } else {
    console.warn('[instagramAuthService] skipping page webhook subscription — pageId or pageAccessToken missing');
  }
}

/**
 * 저장된 Instagram 토큰 상태를 조회합니다.
 * 연결되지 않은 경우 null을 반환합니다.
 */
export async function getTokenStatus(db: D1Database): Promise<TokenStatus | null> {
  const row = (await db.prepare(
    'SELECT access_token, user_id, username, expires_at, updated_at FROM instagram_tokens LIMIT 1'
  ).first()) as TokenRow | null;

  if (!row) return null;

  const daysUntilExpiry = Math.floor(
    (new Date(row.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return {
    userId: row.user_id,
    username: row.username ?? null,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
    daysUntilExpiry,
    needsRefresh: daysUntilExpiry < 7,
  };
}

/**
 * 장기 토큰을 갱신합니다 (60일 연장).
 * 갱신된 토큰과 만료일을 반환합니다.
 */
export async function refreshToken(
  db: D1Database,
  igApi: IgApiFacebookLogin
): Promise<{ expiresAt: string }> {
  const row = (await db.prepare(
    'SELECT access_token FROM instagram_tokens LIMIT 1'
  ).first()) as { access_token: string } | null;

  if (!row) throw new Error('no_token');

  const data = await igApi.refreshLongLivedToken(row.access_token);
  if (!data) throw new Error('refresh_failed');

  const now = new Date().toISOString();
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  await db.prepare(
    'UPDATE instagram_tokens SET access_token = ?, expires_at = ?, updated_at = ?'
  ).bind(data.access_token, expiresAt, now).run();

  console.log('[instagramAuthService] token refreshed — expiresAt=%s', expiresAt);
  return { expiresAt };
}

/**
 * 저장된 Instagram 토큰을 삭제합니다 (연결 해제).
 */
export async function deleteToken(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM instagram_tokens').run();
  console.log('[instagramAuthService] token deleted');
}

/**
 * DB에서 액세스 토큰과 유저 ID를 로드합니다.
 * 연결되지 않은 경우 null을 반환합니다.
 */
export async function loadStoredToken(
  db: D1Database
): Promise<{ access_token: string; user_id: string } | null> {
  return db.prepare(
    'SELECT access_token, user_id FROM instagram_tokens LIMIT 1'
  ).first() as Promise<{ access_token: string; user_id: string } | null>;
}
