/**
 * Instagram OAuth Handlers
 * Manages Instagram Business Account OAuth flow and token storage
 *
 * Flow:
 * 1. Admin calls GET /admin/instagram/auth-url → gets Instagram OAuth URL
 * 2. Admin browser navigates to Instagram OAuth
 * 3. Instagram redirects to GET /instagram/callback?code=...&state=...
 * 4. Worker exchanges code for long-lived token, stores in D1
 * 5. Worker redirects admin back to /admin/beta-videos/?instagram=connected
 */

import { jsonResponse } from '../utils/response';
import { requireAdminAuth } from '../utils/auth';
import { searchHashtagMedia } from '../utils/instagramApi';

interface Env {
  INSTAGRAM_APP_ID: string;
  INSTAGRAM_APP_SECRET: string;
  ALLOWED_ORIGIN: string;
  DB: D1Database;
}

interface TokenRow {
  access_token: string;
  user_id: string;
  username: string | null;
  expires_at: string;
  updated_at: string;
}

/**
 * GET /admin/instagram/auth-url
 * Returns the Instagram OAuth authorization URL with a CSRF state token
 */
export async function handleGetInstagramAuthUrl(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  console.log('[auth-url] generating Instagram OAuth URL');

  if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_APP_SECRET) {
    console.error('[auth-url] INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET not configured');
    return jsonResponse({ error: 'Instagram app credentials not configured' }, 500, corsHeaders);
  }

  // Clean up expired state tokens (older than 10 minutes)
  await env.DB.prepare(
    "DELETE FROM instagram_oauth_state WHERE created_at < datetime('now', '-10 minutes')"
  ).run();

  // Generate cryptographically random CSRF state
  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(stateBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  await env.DB.prepare(
    'INSERT INTO instagram_oauth_state (state, created_at) VALUES (?, ?)'
  )
    .bind(state, new Date().toISOString())
    .run();

  const workerOrigin = new URL(request.url).origin;
  const redirectUri = `${workerOrigin}/instagram/callback`;

  const params = new URLSearchParams({
    client_id: env.INSTAGRAM_APP_ID,
    redirect_uri: redirectUri,
    scope: 'instagram_basic',
    response_type: 'code',
    state,
  });

  const url = `https://www.facebook.com/dialog/oauth?${params}`;
  console.log('[auth-url] OAuth URL generated, redirect_uri:', redirectUri);
  return jsonResponse({ url }, 200, corsHeaders);
}

/**
 * GET /instagram/callback
 * Handles the OAuth callback from Instagram (no admin auth - public endpoint)
 * Validates CSRF state, exchanges code for long-lived token, stores in D1
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

  console.log('[callback] received — error=%s code=%s state=%s', error ?? 'none', code ? 'present' : 'missing', state ? 'present' : 'missing');

  // User denied the OAuth request
  if (error) {
    console.warn('[callback] user denied OAuth:', error);
    return Response.redirect(`${adminUrl}/admin/beta-videos/?instagram=error&reason=denied`, 302);
  }

  if (!code || !state) {
    console.warn('[callback] missing code or state');
    return Response.redirect(`${adminUrl}/admin/beta-videos/?instagram=error&reason=missing_params`, 302);
  }

  // Validate CSRF state
  const storedState = await env.DB.prepare(
    'SELECT state FROM instagram_oauth_state WHERE state = ?'
  )
    .bind(state)
    .first();

  // Always delete state after lookup (one-time use)
  await env.DB.prepare('DELETE FROM instagram_oauth_state WHERE state = ?')
    .bind(state)
    .run();

  if (!storedState) {
    console.warn('[callback] invalid or expired CSRF state');
    return Response.redirect(`${adminUrl}/admin/beta-videos/?instagram=error&reason=invalid_state`, 302);
  }

  try {
    const workerOrigin = new URL(request.url).origin;
    const redirectUri = `${workerOrigin}/instagram/callback`;

    // Step 1: Exchange code for short-lived token via Graph API (GET)
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
        `?client_id=${env.INSTAGRAM_APP_ID}` +
        `&client_secret=${env.INSTAGRAM_APP_SECRET}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${code}`
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Token exchange failed:', errText);
      return Response.redirect(`${adminUrl}/admin/beta-videos/?instagram=error&reason=token_exchange`, 302);
    }

    const tokenRaw = await tokenRes.json();
    console.log('[oauth] step1 token response:', JSON.stringify({ ...tokenRaw as object, access_token: '***' }));

    const tokenData = tokenRaw as {
      access_token: string;
      token_type: string;
      expires_in?: number;
    };

    // Step 2: Get Instagram Business Account ID and username via /me/accounts
    let userId: string;
    let igUsername: string | null = null;
    try {
      const accountsRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts` +
          `?fields=instagram_business_account` +
          `&access_token=${tokenData.access_token}`
      );
      if (accountsRes.ok) {
        const accountsData = (await accountsRes.json()) as {
          data: { instagram_business_account?: { id: string } }[];
        };
        console.log('[oauth] step2 accounts response:', JSON.stringify(accountsData));
        const igId = accountsData.data?.[0]?.instagram_business_account?.id;
        if (igId) {
          userId = igId;
          // Fetch Instagram username via the IG Business Account node
          try {
            const igUserRes = await fetch(
              `https://graph.facebook.com/v21.0/${igId}?fields=username&access_token=${tokenData.access_token}`
            );
            if (igUserRes.ok) {
              const igUserData = (await igUserRes.json()) as { id: string; username?: string };
              igUsername = igUserData.username ?? null;
              console.log('[oauth] ig username:', igUsername);
            }
          } catch {
            // username is optional — proceed without it
          }
        } else {
          // Fallback: use Facebook user ID
          console.warn('[callback] no instagram_business_account found — falling back to Facebook user ID');
          const meRes = await fetch(
            `https://graph.facebook.com/v21.0/me?fields=id&access_token=${tokenData.access_token}`
          );
          const meData = (await meRes.json()) as { id: string };
          userId = meData.id;
          console.log('[callback] fallback userId:', userId);
        }
      } else {
        // Fallback: use Facebook user ID
        console.warn('[callback] /me/accounts request failed — falling back to Facebook user ID');
        const meRes = await fetch(
          `https://graph.facebook.com/v21.0/me?fields=id&access_token=${tokenData.access_token}`
        );
        const meData = (await meRes.json()) as { id: string };
        userId = meData.id;
        console.log('[callback] fallback userId:', userId);
      }
    } catch (err) {
      console.error('[callback] user_id_fetch error:', err);
      return Response.redirect(`${adminUrl}/admin/beta-videos/?instagram=error&reason=user_id_fetch`, 302);
    }

    // Step 3: Exchange short-lived token for long-lived user access token (60 days)
    // Facebook Login uses fb_exchange_token (not ig_exchange_token which is Basic Display only)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${env.INSTAGRAM_APP_ID}` +
        `&client_secret=${env.INSTAGRAM_APP_SECRET}` +
        `&fb_exchange_token=${tokenData.access_token}`
    );

    if (!longTokenRes.ok) {
      const errText = await longTokenRes.text();
      console.error('Long token exchange failed:', errText);
      return Response.redirect(`${adminUrl}/admin/beta-videos/?instagram=error&reason=long_token_exchange`, 302);
    }

    const longTokenRaw = await longTokenRes.json();
    console.log('[oauth] long token response:', JSON.stringify(longTokenRaw));

    const longTokenData = longTokenRaw as {
      access_token: string;
      token_type: string;
      expires_in?: number;
      expires_at?: number;
    };

    const now = new Date().toISOString();
    let expiresAt: string;
    if (longTokenData.expires_in) {
      expiresAt = new Date(Date.now() + longTokenData.expires_in * 1000).toISOString();
    } else if (longTokenData.expires_at) {
      expiresAt = new Date(longTokenData.expires_at * 1000).toISOString();
    } else {
      expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Upsert: delete existing token, insert new one
    await env.DB.prepare('DELETE FROM instagram_tokens').run();
    await env.DB.prepare(
      'INSERT INTO instagram_tokens (access_token, user_id, username, token_type, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(longTokenData.access_token, userId, igUsername, 'long_lived', expiresAt, now, now)
      .run();

    console.log('[callback] token saved — userId=%s username=%s expiresAt=%s', userId, igUsername ?? 'null', expiresAt);
    return Response.redirect(successRedirect, 302);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return Response.redirect(`${adminUrl}/admin/beta-videos/?instagram=error&reason=server_error`, 302);
  }
}

/**
 * GET /admin/instagram/status
 * Returns the current Instagram token status
 */
export async function handleGetInstagramStatus(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  const row = (await env.DB.prepare(
    'SELECT access_token, user_id, username, expires_at, updated_at FROM instagram_tokens LIMIT 1'
  ).first()) as TokenRow | null;

  if (!row) {
    console.log('[status] no token stored — not connected');
    return jsonResponse({ connected: false }, 200, corsHeaders);
  }

  const expiresMs = new Date(row.expires_at).getTime();
  const daysUntilExpiry = Math.floor((expiresMs - Date.now()) / (1000 * 60 * 60 * 24));

  console.log('[status] connected — userId=%s username=%s daysUntilExpiry=%d', row.user_id, row.username ?? 'null', daysUntilExpiry);

  return jsonResponse(
    {
      connected: true,
      userId: row.user_id,
      username: row.username ?? null,
      expiresAt: row.expires_at,
      updatedAt: row.updated_at,
      daysUntilExpiry,
      needsRefresh: daysUntilExpiry < 7,
    },
    200,
    corsHeaders
  );
}

/**
 * POST /admin/instagram/refresh
 * Refreshes the long-lived token (resets 60-day expiry)
 */
export async function handleRefreshInstagramToken(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  console.log('[refresh] token refresh requested');

  const row = (await env.DB.prepare(
    'SELECT access_token FROM instagram_tokens LIMIT 1'
  ).first()) as { access_token: string } | null;

  if (!row) {
    console.warn('[refresh] no token stored');
    return jsonResponse({ error: 'No Instagram token found' }, 404, corsHeaders);
  }

  try {
    // Facebook Login long-lived tokens are refreshed via fb_exchange_token
    const refreshRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${env.INSTAGRAM_APP_ID}` +
        `&client_secret=${env.INSTAGRAM_APP_SECRET}` +
        `&fb_exchange_token=${row.access_token}`
    );

    if (!refreshRes.ok) {
      const errText = await refreshRes.text();
      console.error('Token refresh failed:', errText);
      return jsonResponse({ error: 'Failed to refresh token' }, 502, corsHeaders);
    }

    const data = (await refreshRes.json()) as {
      access_token: string;
      expires_in: number;
    };

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    await env.DB.prepare(
      'UPDATE instagram_tokens SET access_token = ?, expires_at = ?, updated_at = ?'
    )
      .bind(data.access_token, expiresAt, now)
      .run();

    console.log('[refresh] token refreshed — expiresAt=%s', expiresAt);
    return jsonResponse({ success: true, expiresAt }, 200, corsHeaders);
  } catch (err) {
    console.error('Refresh error:', err);
    return jsonResponse({ error: 'Failed to refresh token' }, 500, corsHeaders);
  }
}

/**
 * DELETE /admin/instagram/token
 * Disconnects Instagram by removing the stored token
 */
export async function handleDeleteInstagramToken(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  await env.DB.prepare('DELETE FROM instagram_tokens').run();
  console.log('[disconnect] Instagram token deleted');
  return jsonResponse({ success: true }, 200, corsHeaders);
}

/**
 * GET /admin/instagram/hashtag?hashtag=<tag>
 * Admin hashtag search using the DB-stored token
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

  if (!hashtag) {
    return jsonResponse({ error: 'Missing ?hashtag= parameter' }, 400, corsHeaders);
  }

  const row = (await env.DB.prepare(
    'SELECT access_token, user_id FROM instagram_tokens LIMIT 1'
  ).first()) as { access_token: string; user_id: string } | null;

  if (!row) {
    return jsonResponse({ error: 'Instagram not connected' }, 400, corsHeaders);
  }

  const after = url.searchParams.get('after') || undefined;

  try {
    // Strip leading # if present
    const cleanTag = hashtag.replace(/^#/, '');
    console.log('[hashtag] searching tag=%s after=%s userId=%s', cleanTag, after ?? 'none', row.user_id);
    const appToken = env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET
      ? `${env.INSTAGRAM_APP_ID}|${env.INSTAGRAM_APP_SECRET}`
      : undefined;
    const result = await searchHashtagMedia(cleanTag, row.access_token, row.user_id, after, appToken);
    console.log('[hashtag] result count=%d nextCursor=%s', result.items.length, result.nextCursor ?? 'none');
    return jsonResponse({ data: result.items, nextCursor: result.nextCursor }, 200, corsHeaders);
  } catch (err) {
    console.error('[hashtag] search error:', err);
    return jsonResponse({ error: 'Failed to fetch Instagram data' }, 502, corsHeaders);
  }
}
