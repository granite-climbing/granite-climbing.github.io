/**
 * Instagram Webhook 핸들러
 *
 * 요청 파싱 + 서비스 호출 + HTTP 응답 반환만 담당합니다.
 * 서명 검증과 멘션 이벤트 처리는 webhookService에 있습니다.
 *
 * Webhook 플로우:
 * 1. GET  /instagram/webhook  → Meta 구독 검증 (hub.challenge 반환)
 * 2. POST /instagram/webhook  → 멘션 이벤트 처리 (서명 검증 후 베타 비디오 자동 등록)
 */

import { IgApiFacebookLogin } from '../utils/IgApiFacebookLogin';
import { verifySignature, processMentionEvents, WebhookPayload } from '../services/webhookService';
import { loadStoredToken } from '../services/instagramAuthService';

interface Env {
  DB: D1Database;
  INSTAGRAM_APP_ID: string;
  INSTAGRAM_APP_SECRET: string;
  WEBHOOK_VERIFY_TOKEN: string;
}

/**
 * GET /instagram/webhook
 * Meta Webhook 구독 검증 요청에 응답합니다.
 */
export function handleWebhookVerification(request: Request, env: Env): Response {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === env.WEBHOOK_VERIFY_TOKEN && challenge) {
    console.log('[instagramWebhook] verification successful');
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  console.warn('[instagramWebhook] verification failed: mode=%s token_match=%s', mode, token === env.WEBHOOK_VERIFY_TOKEN);
  return new Response('Forbidden', { status: 403 });
}

/**
 * POST /instagram/webhook
 * Meta Webhook 멘션 이벤트를 처리합니다.
 * 서명 검증 후 멘션된 게시물/댓글을 베타 비디오로 자동 등록합니다.
 */
export async function handleWebhookEvent(request: Request, env: Env): Promise<Response> {
  const bodyText = await request.text();
  console.log('[instagramWebhook] received payload: %s', bodyText);

  const valid = await verifySignature(bodyText, request.headers.get('X-Hub-Signature-256'), env.INSTAGRAM_APP_SECRET);
  if (!valid) {
    console.warn('[instagramWebhook] invalid signature');
    return new Response('Forbidden', { status: 403 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  if (payload.object !== 'instagram') return new Response('OK', { status: 200 });

  const tokenRow = await loadStoredToken(env.DB);
  if (!tokenRow) {
    console.warn('[instagramWebhook] no instagram token stored — ignoring event');
    return new Response('OK', { status: 200 });
  }

  const igApi = new IgApiFacebookLogin(env.INSTAGRAM_APP_ID, env.INSTAGRAM_APP_SECRET);
  await processMentionEvents(payload, tokenRow, igApi, env.DB);

  return new Response('OK', { status: 200 });
}
