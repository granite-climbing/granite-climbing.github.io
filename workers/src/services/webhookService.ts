/**
 * Instagram Webhook 서비스
 *
 * 서명 검증과 멘션 이벤트 라우팅을 담당합니다.
 * 실제 미디어 조회 및 DB 저장은 betaVideoService에 위임합니다.
 */

import { IgApiFacebookLogin } from '../utils/IgApiFacebookLogin';
import { addVideoFromMediaMention, addVideoFromCommentMention } from './betaVideoService';

export interface WebhookPayload {
  object: string;
  entry: {
    id: string;
    time: number;
    changes: {
      field: string;
      value: {
        media_id?: string;
        comment_id?: string;
      };
    }[];
  }[];
}

/**
 * X-Hub-Signature-256 헤더를 검증합니다.
 * HMAC-SHA256 으로 body를 서명하여 expected 값과 비교합니다.
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#event-notifications
 */
export async function verifySignature(
  body: string,
  signature: string | null,
  appSecret: string
): Promise<boolean> {
  if (!signature) {
    console.warn('[webhookService] X-Hub-Signature-256 header missing');
    return false;
  }

  const expected = signature.replace('sha256=', '');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  console.log('[webhookService] signature check — expected=%s computed=%s match=%s', expected, computed, computed === expected);
  return computed === expected;
}

/**
 * Webhook 페이로드의 멘션 이벤트를 처리합니다.
 * comment_id 유무에 따라 addVideoFromCommentMention 또는 addVideoFromMediaMention을 호출합니다.
 *
 * @param payload    - 파싱된 Webhook 페이로드
 * @param tokenRow   - DB에서 로드된 Instagram 토큰
 * @param igApi      - IgApiFacebookLogin 인스턴스
 * @param db         - D1 데이터베이스 인스턴스
 */
export async function processMentionEvents(
  payload: WebhookPayload,
  tokenRow: { access_token: string; user_id: string },
  igApi: IgApiFacebookLogin,
  db: D1Database
): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'mentions') continue;

      const mediaId = change.value?.media_id;
      const commentId = change.value?.comment_id;

      if (!mediaId) continue;

      if (commentId) {
        await addVideoFromCommentMention(
          db, commentId, mediaId, tokenRow.user_id, tokenRow.access_token, igApi
        ).catch((err) => console.error('[webhookService] addVideoFromCommentMention error:', err));
      } else {
        await addVideoFromMediaMention(
          db, mediaId, tokenRow.user_id, tokenRow.access_token, igApi
        ).catch((err) => console.error('[webhookService] addVideoFromMediaMention error:', err));
      }
    }
  }
}
