/**
 * IgApiFacebookLogin — Instagram Graph API 서비스 래퍼 (Facebook Login 방식)
 *
 * Facebook Login 기반으로 Instagram API 를 호출하는 모든 로직을 하나의 클래스로 묶습니다.
 * Instagram Login 방식과 구분하기 위해 클래스 이름에 FacebookLogin 을 명시합니다.
 *
 * 참고 문서:
 * - Facebook Login for Instagram: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram
 * - Instagram Graph API: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api
 */

export interface OembedInfo {
  author_name?: string;
  thumbnail_url?: string;
}

export interface ShortLivedToken {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface LongLivedToken {
  access_token: string;
  token_type: string;
  expires_in?: number;
  expires_at?: number;
}

export interface AccountsResponse {
  data: {
    id: string;
    access_token: string;
    instagram_business_account?: { id: string };
  }[];
}

export interface MentionedMediaData {
  id?: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  media_type?: string;
  timestamp?: string;
  username?: string;
  permalink?: string;
}

export interface MentionedCommentData {
  id?: string;
  text?: string;
  timestamp?: string;
  media?: MentionedMediaData;
}

export interface InstagramMediaItem {
  id: string;
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  media_type: string;
  username?: string;
  timestamp?: string;
}

export interface HashtagMediaResult {
  items: InstagramMediaItem[];
  nextCursor: string | null;
}

const API_BASE = 'https://graph.facebook.com';
const API_VERSION = 'v21.0';

export class IgApiFacebookLogin {
  private readonly base: string;
  private readonly appId: string;
  private readonly appSecret: string;
  /** App access token — oEmbed 등 유저 토큰 불필요 API에 사용 */
  private readonly appToken: string;
  /** 해시태그 ID 인메모리 캐시 (Worker 인스턴스 생존 기간 동안 유지) */
  private readonly hashtagCache = new Map<string, { id: string; ts: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

  constructor(appId: string, appSecret: string, base = `${API_BASE}/${API_VERSION}`) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.appToken = `${appId}|${appSecret}`;
    this.base = base;
  }

  // ─────────────────────────────────────────────
  // oEmbed
  // ─────────────────────────────────────────────

  /**
   * Instagram 게시물의 oEmbed 정보를 가져옵니다.
   * author_name(username)과 thumbnail_url 을 반환합니다.
   * App access token({APP_ID}|{APP_SECRET}) 을 내부적으로 사용합니다.
   * appId 또는 appSecret 이 없으면 즉시 null 을 반환합니다.
   *
   * @param permalink - 인스타그램 게시물 URL (예: https://www.instagram.com/p/xxx/)
   * @see https://developers.facebook.com/docs/instagram-platform/oembed
   */
  async getVideoMetaFromOembed(permalink: string): Promise<OembedInfo | null> {
    if (!this.appId || !this.appSecret) return null;
    const res = await fetch(
      `${this.base}/instagram_oembed` +
        `?url=${encodeURIComponent(permalink)}` +
        `&fields=author_name,thumbnail_url` +
        `&access_token=${this.appToken}`
    );
    const text = await res.text();
    if (!res.ok) {
      console.warn(`[IgApiFacebookLogin] getVideoMetaFromOembed 실패 — permalink=${permalink} status=${res.status} body=${text}`);
      return null;
    }
    const json = JSON.parse(text) as OembedInfo;
    console.log(`[IgApiFacebookLogin] getVideoMetaFromOembed 성공 — author_name=${json.author_name ?? 'null'} thumbnail=${json.thumbnail_url ? 'yes' : 'no'}`);
    return json;
  }

  // ─────────────────────────────────────────────
  // 해시태그 검색
  // ─────────────────────────────────────────────

  /**
   * 해시태그 문자열을 Instagram 해시태그 ID 로 변환합니다.
   * 24시간 인메모리 캐시를 사용합니다.
   *
   * @param tag         - 해시태그 문자열 (# 제외, 예: "granite")
   * @param accessToken - 유저 액세스 토큰
   * @param userId      - 연결된 Instagram Business Account ID
   * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag-search
   */
  async getHashtagId(tag: string, accessToken: string, userId: string): Promise<string | null> {
    const cached = this.hashtagCache.get(tag);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.id;
    }

    const res = await fetch(
      `${this.base}/ig_hashtag_search` +
        `?q=${encodeURIComponent(tag)}` +
        `&user_id=${userId}` +
        `&access_token=${accessToken}`
    );
    if (!res.ok) {
      console.error(`[IgApiFacebookLogin] 해시태그 ID 조회 실패 — tag=${tag} status=${res.status}`);
      return null;
    }

    const data = (await res.json()) as { data: { id: string }[] };
    if (!data.data?.length) return null;

    const id = data.data[0].id;
    this.hashtagCache.set(tag, { id, ts: Date.now() });
    return id;
  }

  /**
   * 해시태그 ID 로 상위 미디어 목록을 가져옵니다.
   * thumbnail_url 은 이 엔드포인트에서 지원하지 않으며, CAROUSEL_ALBUM 은 media_url 도 반환하지 않습니다.
   *
   * @param hashtagId   - Instagram 해시태그 ID
   * @param userId      - 연결된 Instagram Business Account ID
   * @param accessToken - 유저 액세스 토큰
   * @param after       - 페이지네이션 커서
   * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/top-media
   */
  async searchHashtagTopMedia(
    hashtagId: string,
    userId: string,
    accessToken: string,
    after?: string
  ): Promise<HashtagMediaResult> {
    let url =
      `${this.base}/${hashtagId}/top_media` +
      `?user_id=${userId}` +
      `&fields=id,media_type,media_url,permalink,timestamp,comments_count,like_count` +
      `&limit=50` +
      `&access_token=${accessToken}`;
    if (after) url += `&after=${encodeURIComponent(after)}`;

    const res = await fetch(url);
    const rawText = await res.text();
    console.log('[IgApiFacebookLogin] top_media raw:', rawText);

    if (!res.ok) {
      console.error(`[IgApiFacebookLogin] top_media 실패 — status=${res.status}`);
      return { items: [], nextCursor: null };
    }

    const data = JSON.parse(rawText) as {
      data?: {
        id: string;
        media_type?: string;
        media_url?: string;
        permalink?: string;
        timestamp?: string;
        comments_count?: number;
        like_count?: number;
      }[];
      paging?: { cursors?: { after?: string }; next?: string };
    };
    console.log(`[IgApiFacebookLogin] top_media 결과 — count=${data.data?.length ?? 0}`);

    const items: InstagramMediaItem[] = (data.data ?? [])
      .filter((item) => item.permalink)
      .map((item) => ({
        id: item.id,
        media_url: item.media_url || '',
        permalink: item.permalink!,
        media_type: item.media_type || 'IMAGE',
        timestamp: item.timestamp,
      }));

    const nextCursor = data.paging?.next ? (data.paging.cursors?.after ?? null) : null;
    return { items, nextCursor };
  }

  // ─────────────────────────────────────────────
  // OAuth 토큰 관리
  // ─────────────────────────────────────────────

  /**
   * OAuth 인가 코드를 단기(1시간) 유저 액세스 토큰으로 교환합니다.
   *
   * @param code        - OAuth 콜백으로 받은 인가 코드
   * @param redirectUri - OAuth 요청 시 사용한 redirect_uri (정확히 일치해야 함)
   * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<ShortLivedToken | null> {
    const res = await fetch(
      `${this.base}/oauth/access_token` +
        `?client_id=${this.appId}` +
        `&client_secret=${this.appSecret}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${code}`
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[IgApiFacebookLogin] 단기 토큰 교환 실패 — status=${res.status} body=${errText}`);
      return null;
    }
    const data = (await res.json()) as ShortLivedToken;
    console.log('[IgApiFacebookLogin] 단기 토큰 발급 완료');
    return data;
  }

  /**
   * 단기(1시간) 유저 액세스 토큰을 장기(60일) 토큰으로 교환합니다.
   * Facebook Login 방식에서는 fb_exchange_token grant 를 사용합니다.
   * (Instagram Login 방식의 ig_exchange_token 과 다릅니다)
   *
   * @param shortToken - 단기 유저 액세스 토큰
   * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram
   */
  async exchangeForLongLivedToken(shortToken: string): Promise<LongLivedToken | null> {
    const res = await fetch(
      `${this.base}/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${this.appId}` +
        `&client_secret=${this.appSecret}` +
        `&fb_exchange_token=${shortToken}`
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[IgApiFacebookLogin] 장기 토큰 교환 실패 — status=${res.status} body=${errText}`);
      return null;
    }
    const data = (await res.json()) as LongLivedToken;
    console.log('[IgApiFacebookLogin] 장기 토큰 발급 완료');
    return data;
  }

  /**
   * 만료 전 장기 토큰을 갱신하여 60일을 연장합니다.
   * 토큰이 최소 24시간 이상 된 경우에만 갱신 가능하며, 만료된 토큰은 갱신할 수 없습니다.
   *
   * @param token - 갱신할 장기 유저 액세스 토큰
   * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram
   */
  async refreshLongLivedToken(token: string): Promise<LongLivedToken | null> {
    const res = await fetch(
      `${this.base}/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${this.appId}` +
        `&client_secret=${this.appSecret}` +
        `&fb_exchange_token=${token}`
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[IgApiFacebookLogin] 토큰 갱신 실패 — status=${res.status} body=${errText}`);
      return null;
    }
    const data = (await res.json()) as LongLivedToken;
    console.log('[IgApiFacebookLogin] 토큰 갱신 완료');
    return data;
  }

  /**
   * 유저 액세스 토큰으로 연결된 Facebook 페이지 목록과 Instagram Business Account ID 를 조회합니다.
   * OAuth 콜백에서 Page access token 과 Instagram Business Account ID 를 얻기 위해 사용합니다.
   *
   * @param accessToken - 유저 액세스 토큰
   * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram
   */
  async getAccounts(accessToken: string): Promise<AccountsResponse | null> {
    const res = await fetch(
      `${this.base}/me/accounts` +
        `?fields=id,access_token,instagram_business_account` +
        `&access_token=${accessToken}`
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[IgApiFacebookLogin] /me/accounts 조회 실패 — status=${res.status} body=${errText}`);
      return null;
    }
    const data = (await res.json()) as AccountsResponse;
    console.log('[IgApiFacebookLogin] /me/accounts 응답:', JSON.stringify(data));
    return data;
  }

  /**
   * Instagram Business Account ID 로 계정 정보(username 등)를 조회합니다.
   *
   * @param igId        - Instagram Business Account ID
   * @param accessToken - 유저 액세스 토큰
   * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user
   */
  async getIgUserInfo(igId: string, accessToken: string): Promise<{ id: string; username?: string } | null> {
    const res = await fetch(
      `${this.base}/${igId}?fields=id,username&access_token=${accessToken}`
    );
    if (!res.ok) {
      console.warn(`[IgApiFacebookLogin] IG 유저 정보 조회 실패 — igId=${igId} status=${res.status}`);
      return null;
    }
    const data = (await res.json()) as { id: string; username?: string };
    console.log(`[IgApiFacebookLogin] IG 유저 정보 — username=${data.username ?? 'null'}`);
    return data;
  }

  /**
   * Facebook 페이지를 Webhook 에 구독합니다.
   * Facebook Login 방식에서 Instagram mention 이벤트를 받으려면 Page 구독이 필요합니다.
   *
   * @param pageId          - Facebook 페이지 ID
   * @param pageAccessToken - Page access token
   * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-instagram
   */
  async subscribePageToWebhook(pageId: string, pageAccessToken: string): Promise<boolean> {
    const res = await fetch(
      `${this.base}/${pageId}/subscribed_apps`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          access_token: pageAccessToken,
          subscribed_fields: 'feed,mention',
        }).toString(),
      }
    );
    const data = await res.json() as { success?: boolean };
    console.log(`[IgApiFacebookLogin] 페이지 Webhook 구독 — pageId=${pageId} result=${JSON.stringify(data)}`);
    return res.ok && !!data.success;
  }

  // ─────────────────────────────────────────────
  // 댓글 작성
  // ─────────────────────────────────────────────

  /**
   * Instagram 미디어에 댓글을 답니다.
   *
   * @param mediaId     - Instagram 미디어 ID
   * @param message     - 댓글 내용
   * @param accessToken - 유저 액세스 토큰 (Business Account 필요)
   * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/comments
   */
  async replyToMedia(mediaId: string, message: string, accessToken: string): Promise<boolean> {
    const res = await fetch(`${this.base}/${mediaId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ message, access_token: accessToken }).toString(),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[IgApiFacebookLogin] 미디어 댓글 실패 — mediaId=${mediaId} status=${res.status} body=${errText}`);
      return false;
    }
    console.log(`[IgApiFacebookLogin] 미디어 댓글 성공 — mediaId=${mediaId}`);
    return true;
  }

  /**
   * Instagram 댓글에 답글을 답니다.
   *
   * @param commentId   - Instagram 댓글 ID
   * @param message     - 답글 내용
   * @param accessToken - 유저 액세스 토큰 (Business Account 필요)
   * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-comment/replies
   */
  async replyToComment(commentId: string, message: string, accessToken: string): Promise<boolean> {
    const res = await fetch(`${this.base}/${commentId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ message, access_token: accessToken }).toString(),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[IgApiFacebookLogin] 댓글 답글 실패 — commentId=${commentId} status=${res.status} body=${errText}`);
      return false;
    }
    console.log(`[IgApiFacebookLogin] 댓글 답글 성공 — commentId=${commentId}`);
    return true;
  }

  // ─────────────────────────────────────────────
  // Webhook — 멘션 처리
  // ─────────────────────────────────────────────

  /**
   * Webhook 에서 받은 media_id 로 언급된 미디어 정보를 조회합니다.
   * caption, media_url, thumbnail_url, username, permalink 를 반환합니다.
   *
   * @param userId      - 연결된 Instagram Business Account ID (언급받은 계정)
   * @param mediaId     - Webhook 페이로드의 media_id
   * @param accessToken - 유저 액세스 토큰
   * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/mentioned_media#reading
   */
  async getMentionedMedia(
    userId: string,
    mediaId: string,
    accessToken: string
  ): Promise<MentionedMediaData | null> {
    const fields = 'caption,media_type,media_url,thumbnail_url,timestamp,username,permalink';
    const res = await fetch(
      `${this.base}/${userId}` +
        `?fields=mentioned_media.media_id(${mediaId}){${fields}}` +
        `&access_token=${accessToken}`
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[IgApiFacebookLogin] mentioned_media 조회 실패 — mediaId=${mediaId} status=${res.status} body=${errText}`);
      return null;
    }
    const data = (await res.json()) as { mentioned_media?: MentionedMediaData; id: string };
    console.log('[IgApiFacebookLogin] mentioned_media 응답:', JSON.stringify(data));
    return data.mentioned_media ?? null;
  }

  /**
   * Webhook 에서 받은 comment_id 로 언급된 댓글 정보를 조회합니다.
   * 댓글 텍스트(caption 역할)와 연결된 미디어 정보를 함께 반환합니다.
   *
   * @param userId      - 연결된 Instagram Business Account ID (언급받은 계정)
   * @param commentId   - Webhook 페이로드의 comment_id
   * @param accessToken - 유저 액세스 토큰
   * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/mentioned_comment#reading
   */
  async getMentionedComment(
    userId: string,
    commentId: string,
    accessToken: string
  ): Promise<MentionedCommentData | null> {
    const mediaFields = 'caption,media_type,media_url,thumbnail_url,timestamp,username,permalink';
    const res = await fetch(
      `${this.base}/${userId}` +
        `?fields=mentioned_comment.comment_id(${commentId}){id,text,timestamp,media{${mediaFields}}}` +
        `&access_token=${accessToken}`
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[IgApiFacebookLogin] mentioned_comment 조회 실패 — commentId=${commentId} status=${res.status} body=${errText}`);
      return null;
    }
    const data = (await res.json()) as { mentioned_comment?: MentionedCommentData; id: string };
    console.log('[IgApiFacebookLogin] mentioned_comment 응답:', JSON.stringify(data));
    return data.mentioned_comment ?? null;
  }
}
