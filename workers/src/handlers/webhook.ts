/**
 * Instagram Webhook Handler
 * Handles Meta webhook verification and mention events.
 *
 * Webhook flow:
 * 1. Meta sends GET /instagram/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 *    → Worker validates verify_token and echoes hub.challenge
 * 2. When connected account is @mentioned in a caption, Meta sends POST /instagram/webhook
 *    → Worker verifies X-Hub-Signature-256, fetches mention details via Mentioned Media API,
 *      enriches with oEmbed, parses caption for "문제이름", looks up slug, inserts beta_video
 *
 * References:
 * - Webhooks: https://developers.facebook.com/docs/instagram-platform/webhooks
 * - Webhook verification: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 * - Webhook signature: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#event-notifications
 * - Mentioned Media API: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/mentioned_media
 * - oEmbed: https://developers.facebook.com/docs/instagram-platform/oembed
 */

import { fetchOembedInfo } from '../utils/instagramApi';

interface Env {
  DB: D1Database;
  INSTAGRAM_APP_ID: string;
  INSTAGRAM_APP_SECRET: string;
  WEBHOOK_VERIFY_TOKEN: string;
}

interface WebhookEntry {
  id: string;
  time: number;
  changes: {
    field: string;
    value: {
      media_id?: string;
      comment_id?: string;
    };
  }[];
}

interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

/**
 * GET /instagram/webhook
 * Responds to Meta's webhook subscription verification request.
 * > https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export function handleWebhookVerification(request: Request, env: Env): Response {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === env.WEBHOOK_VERIFY_TOKEN && challenge) {
    console.log('[webhook] verification successful');
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  console.warn('[webhook] verification failed: mode=%s token_match=%s', mode, token === env.WEBHOOK_VERIFY_TOKEN);
  return new Response('Forbidden', { status: 403 });
}

/**
 * Verify X-Hub-Signature-256 header using HMAC-SHA256 with App Secret.
 * > https://developers.facebook.com/docs/graph-api/webhooks/getting-started#event-notifications
 */
async function verifySignature(request: Request, body: string, appSecret: string): Promise<boolean> {
  const signature = request.headers.get('X-Hub-Signature-256');
  if (!signature) {
    console.warn('[webhook] X-Hub-Signature-256 header missing');
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

  console.log('[webhook] signature check — expected=%s computed=%s match=%s', expected, computed, computed === expected);
  return computed === expected;
}

/**
 * Extract a quoted problem title from a caption.
 * Supports regular double quotes and smart ("") quotes.
 * Example: `"문제이름" at 지역 @계정 #태그` → `문제이름`
 */
function extractProblemTitle(caption: string): string | null {
  const match = caption.match(/["\u201c\u201d](.+?)["\u201c\u201d]/);
  return match ? match[1].trim() : null;
}

/**
 * POST /instagram/webhook
 * Handles mention events from Meta. Auto-registers beta videos when the connected
 * account is @mentioned in a post whose caption contains a quoted problem title.
 */
export async function handleWebhookEvent(request: Request, env: Env): Promise<Response> {
  const bodyText = await request.text();

  console.log('[webhook] received payload: %s', bodyText);

  // Verify signature
  const valid = await verifySignature(request, bodyText, env.INSTAGRAM_APP_SECRET);
  if (!valid) {
    console.warn('[webhook] invalid signature');
    return new Response('Forbidden', { status: 403 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  if (payload.object !== 'instagram') {
    return new Response('OK', { status: 200 });
  }

  // Fetch connected Instagram user ID and access token
  const tokenRow = (await env.DB.prepare(
    'SELECT access_token, user_id FROM instagram_tokens LIMIT 1'
  ).first()) as { access_token: string; user_id: string } | null;

  if (!tokenRow) {
    console.warn('[webhook] no instagram token stored — ignoring event');
    return new Response('OK', { status: 200 });
  }

  const appToken = `${env.INSTAGRAM_APP_ID}|${env.INSTAGRAM_APP_SECRET}`;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'mentions') continue;

      const mediaId = change.value?.media_id;
      const commentId = change.value?.comment_id;

      if (!mediaId) continue;

      await processMention(mediaId, commentId ?? null, tokenRow.user_id, tokenRow.access_token, appToken, env).catch(
        (err) => console.error('[webhook] processMention error:', err)
      );
    }
  }

  return new Response('OK', { status: 200 });
}

/**
 * Process a single mention event:
 * 1. If comment_id present: fetch mentioned_comment to get caption text + media_id
 *    Otherwise: fetch mentioned_media directly
 * 2. Enrich with oEmbed (username, thumbnail_url)
 * 3. Parse caption for "문제이름" → look up slug in problems table
 * 4. Insert into beta_videos if not duplicate
 */
async function processMention(
  mediaId: string,
  commentId: string | null,
  userId: string,
  accessToken: string,
  appToken: string,
  env: Env
): Promise<void> {
  let caption: string | undefined;
  let media_url: string | undefined;
  let mentionThumb: string | undefined;
  let mentionUsername: string | undefined;
  let mentionMediaId: string | undefined = mediaId;
  const mediaFields = 'caption,media_type,media_url,thumbnail_url,timestamp,username,permallink'

  if (commentId) {
    // Fetch via mentioned_comment API when comment_id is present
    // > https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/mentioned_comment#reading
    const commentRes = await fetch(
      `https://graph.facebook.com/v21.0/${userId}` +
        `?fields=mentioned_comment.comment_id(${commentId}){text,timestamp,media{${mediaFields}}}` +
        `&access_token=${accessToken}`
    );
    if (!commentRes.ok) {
      const errText = await commentRes.text();
      console.error('[webhook] mentioned_comment fetch failed:', commentRes.status, errText);
      return;
    }
    const commentData = (await commentRes.json()) as {
      mentioned_comment?: { text?: string; timestamp?: string; media?: { id: string }; id?: string };
      id: string;
    };
    console.log('[webhook] mentioned_comment response:', JSON.stringify(commentData));
    caption = commentData.mentioned_comment?.text;
    mentionMediaId = commentData.mentioned_comment?.media?.id ?? mediaId;
  } else {
    // Fetch via mentioned_media API when only media_id is present
    // > https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/mentioned_media#reading
    ;
    const mediaRes = await fetch(
      `https://graph.facebook.com/v21.0/${userId}` +
        `?fields=mentioned_media.media_id(${mediaId}){${mediaFields}}` +
        `&access_token=${accessToken}`
    );
    if (!mediaRes.ok) {
      const errText = await mediaRes.text();
      console.error('[webhook] mentioned_media fetch failed:', mediaRes.status, errText);
      return;
    }
    const mediaData = (await mediaRes.json()) as {
      mentioned_media?: {
        caption?: string;
        media_url?: string;
        thumbnail_url?: string;
        media_type?: string;
        timestamp?: string;
        username?: string;
        id?: string;
      };
      id: string;
    };
    console.log('[webhook] mentioned_media response:', JSON.stringify(mediaData));
    const m = mediaData.mentioned_media ?? {};
    caption = m.caption;
    media_url = m.media_url;
    mentionThumb = m.thumbnail_url;
    mentionUsername = m.username;
    mentionMediaId = m.id ?? mediaId;
  }

  // Construct permalink from media ID (format: instagram.com/p/{media-id}/)
  const permalink = mentionMediaId ? `https://www.instagram.com/p/${mentionMediaId}/` : null;

  if (!permalink) {
    console.warn('[webhook] no media id in mentioned_media response');
    return;
  }

  if (!caption) {
    console.log('[webhook] no caption — skipping');
    return;
  }

  // Extract problem title from caption (quoted)
  const problemTitle = extractProblemTitle(caption);
  if (!problemTitle) {
    console.log('[webhook] no quoted problem title found in caption:', caption.slice(0, 100));
    return;
  }

  // Look up problem slug in D1
  const problemRow = (await env.DB.prepare(
    'SELECT slug FROM problems WHERE lower(title) = lower(?)'
  ).bind(problemTitle).first()) as { slug: string } | null;

  if (!problemRow) {
    console.log(`[webhook] no problem found for title: "${problemTitle}"`);
    return;
  }

  const problemSlug = problemRow.slug;

  // Check for duplicate by permalink
  const existing = await env.DB.prepare(
    'SELECT id FROM beta_videos WHERE problem_slug = ? AND video_url = ? AND deleted_at IS NULL'
  ).bind(problemSlug, permalink).first();

  if (existing) {
    console.log(`[webhook] duplicate: ${problemSlug} / ${permalink}`);
    return;
  }

  // username is available directly from mentioned_media response
  // Enrich with oEmbed for thumbnail_url if not already available
  let instagramUsername: string | null = mentionUsername ?? null;
  let thumbnailUrl: string | null = mentionThumb ?? media_url ?? null;

  const oembedInfo = await fetchOembedInfo(permalink, appToken).catch(() => null);
  if (oembedInfo) {
    if (!instagramUsername) instagramUsername = oembedInfo.author_name ?? null;
    if (oembedInfo.thumbnail_url) thumbnailUrl = oembedInfo.thumbnail_url;
  }

  // Extract post ID from media ID
  const postId = mentionMediaId ?? null;

  const now = new Date().toISOString();

  await env.DB.prepare(
    'INSERT INTO beta_videos (problem_slug, video_url, post_id, platform, thumbnail_url, submitted_at, status, instagram_username, instagram_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    problemSlug,
    permalink,
    postId,
    'instagram',
    thumbnailUrl,
    now,
    'approved',
    instagramUsername,
    null // timestamp not available via webhook/oEmbed
  ).run();

  console.log(`[webhook] registered beta video: slug=${problemSlug} username=${instagramUsername} permalink=${permalink}`);
}
