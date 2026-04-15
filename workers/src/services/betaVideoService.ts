/**
 * 베타 비디오 서비스
 *
 * 베타 비디오 조회, 등록, 삭제 비즈니스 로직을 담당합니다.
 * 등록 경로는 3가지입니다:
 *   1. addVideoFromURL       — 사용자가 직접 URL 입력
 *   2. addVideoFromHashTag   — 관리자가 해시태그 검색 후 선택
 *   3. addVideoFromMediaMention  — Webhook 게시물 캡션 멘션
 *   4. addVideoFromCommentMention — Webhook 댓글 멘션
 */

import { IgApiFacebookLogin } from '../utils/IgApiFacebookLogin';
import { getVideoMetaFromHTML } from '../utils/htmlScraper';
import { detectPlatform, extractPostId } from '../utils/validation';

// ─────────────────────────────────────────────
// 공통 타입
// ─────────────────────────────────────────────

export interface BetaVideo {
  id: number;
  videoUrl: string;
  instagramUrl: string; // backwards compatibility
  platform: string;
  thumbnailUrl: string | null;
  submittedAt: string;
  instagramUsername: string | null;
  instagramTimestamp: string | null;
}

export interface AdminBetaVideo extends BetaVideo {
  problemSlug: string;
  status: string;
  postId: string | null;
  deletedAt: string | null;
}

export interface VideoFilters {
  platform?: string | null;
  problem?: string | null;
  includeDeleted?: boolean;
}

export interface DryRunRow {
  problem_slug: string;
  video_url: string;
  post_id: string | null;
  platform: string;
  thumbnail_url: string | null;
  submitted_at: string;
  status: string;
  instagram_username: string | null;
  instagram_timestamp: null;
}

// ─────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────

/**
 * 문제 제목에서 quoted 문제 이름을 추출합니다.
 * 일반 큰따옴표와 스마트 따옴표(""）를 모두 지원합니다.
 */
function extractProblemTitle(caption: string): string | null {
  const match = caption.match(/["\u201c\u201d](.+?)["\u201c\u201d]/);
  return match ? match[1].trim() : null;
}

/**
 * DB에서 문제 slug를 조회합니다 (제목 대소문자 무시).
 */
async function findProblemSlug(db: D1Database, title: string): Promise<string | null> {
  const row = (await db.prepare(
    'SELECT slug FROM problems WHERE lower(title) = lower(?)'
  ).bind(title).first()) as { slug: string } | null;
  return row?.slug ?? null;
}

/**
 * 중복 여부를 확인합니다. post_id 기준 우선, 없으면 URL 기준.
 */
async function checkDuplicate(
  db: D1Database,
  problemSlug: string,
  videoUrl: string,
  postId: string | null
): Promise<boolean> {
  if (postId) {
    const existing = await db.prepare(
      'SELECT id FROM beta_videos WHERE problem_slug = ? AND post_id = ? AND deleted_at IS NULL'
    ).bind(problemSlug, postId).first();
    return !!existing;
  }
  const existing = await db.prepare(
    'SELECT id FROM beta_videos WHERE problem_slug = ? AND video_url = ? AND deleted_at IS NULL'
  ).bind(problemSlug, videoUrl).first();
  return !!existing;
}

/**
 * beta_videos 테이블에 새 행을 삽입합니다.
 */
async function insertBetaVideo(row: {
  db: D1Database;
  problemSlug: string;
  videoUrl: string;
  postId: string | null;
  platform: string;
  thumbnailUrl: string | null;
  instagramUsername: string | null;
  instagramTimestamp: string | null;
}): Promise<number> {
  const db = row.db;
  const result = await db.prepare(
    'INSERT INTO beta_videos (problem_slug, video_url, post_id, platform, thumbnail_url, submitted_at, status, instagram_username, instagram_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    row.problemSlug,
    row.videoUrl,
    row.postId,
    row.platform,
    row.thumbnailUrl,
    new Date().toISOString(),
    'approved',
    row.instagramUsername,
    row.instagramTimestamp
  ).run();
  return result.meta.last_row_id as number;
}

// ─────────────────────────────────────────────
// 공개 조회
// ─────────────────────────────────────────────

/**
 * 특정 문제의 승인된 베타 비디오 목록을 조회합니다.
 */
export async function getApprovedVideos(db: D1Database, problemSlug: string): Promise<BetaVideo[]> {
  const { results } = await db.prepare(
    'SELECT id, video_url, platform, thumbnail_url, submitted_at, instagram_username, instagram_timestamp FROM beta_videos WHERE problem_slug = ? AND status = ? AND deleted_at IS NULL ORDER BY submitted_at DESC'
  ).bind(problemSlug, 'approved').all();

  return results.map((row: any) => ({
    id: row.id,
    videoUrl: row.video_url,
    instagramUrl: row.video_url,
    platform: row.platform || 'instagram',
    thumbnailUrl: row.thumbnail_url,
    submittedAt: row.submitted_at,
    instagramUsername: row.instagram_username || null,
    instagramTimestamp: row.instagram_timestamp || null,
  }));
}

// ─────────────────────────────────────────────
// 등록 — URL 직접 입력 (공개)
// ─────────────────────────────────────────────

/**
 * 사용자가 URL을 직접 입력하여 베타 비디오를 등록합니다.
 * Instagram 게시물은 oEmbed로 username/thumbnail을 자동 보강합니다.
 *
 * @throws 'missing_fields'  | 'duplicate'
 */
export async function addVideoFromURL(
  db: D1Database,
  input: {
    problemSlug: string;
    videoUrl: string;
    thumbnailUrl?: string | null;
    instagramUsername?: string | null;
    instagramTimestamp?: string | null;
  },
  igApi: IgApiFacebookLogin
): Promise<{ id: number }> {
  const { problemSlug, videoUrl } = input;
  const platform = detectPlatform(videoUrl);
  const postId = extractPostId(videoUrl, platform);

  if (await checkDuplicate(db, problemSlug, videoUrl, postId)) {
    throw new Error('duplicate');
  }

  let thumbnailUrl = input.thumbnailUrl ?? null;
  let instagramUsername = input.instagramUsername ?? null;

  if (platform === 'instagram') {
    const meta = await igApi.getVideoMetaFromOembed(videoUrl).catch(() => null)
      ?? await getVideoMetaFromHTML(videoUrl);
    if (meta) {
      if (!instagramUsername) instagramUsername = meta.author_name ?? null;
      if (!thumbnailUrl) thumbnailUrl = meta.thumbnail_url ?? null;
    }
  }

  const id = await insertBetaVideo({
    db,
    problemSlug,
    videoUrl,
    postId,
    platform,
    thumbnailUrl,
    instagramUsername,
    instagramTimestamp: input.instagramTimestamp ?? null,
  });

  return { id };
}

// ─────────────────────────────────────────────
// 등록 — 해시태그 검색 결과 선택 (관리자)
// ─────────────────────────────────────────────

/**
 * 관리자가 해시태그 검색 결과에서 선택한 항목을 베타 비디오로 등록합니다.
 * oEmbed로 username/thumbnail을 보강합니다.
 *
 * @throws 'duplicate'
 */
export async function addVideoFromHashTag(
  db: D1Database,
  input: {
    problemSlug: string;
    videoUrl: string;
    thumbnailUrl?: string | null;
  },
  igApi: IgApiFacebookLogin
): Promise<{ id: number }> {
  const { problemSlug, videoUrl } = input;
  const platform = detectPlatform(videoUrl);
  const postId = extractPostId(videoUrl, platform);

  if (await checkDuplicate(db, problemSlug, videoUrl, postId)) {
    throw new Error('duplicate');
  }

  let thumbnailUrl = input.thumbnailUrl ?? null;
  let instagramUsername: string | null = null;

  if (platform === 'instagram') {
    const meta = await igApi.getVideoMetaFromOembed(videoUrl).catch(() => null)
      ?? await getVideoMetaFromHTML(videoUrl);
    if (meta) {
      if (!instagramUsername) instagramUsername = meta.author_name ?? null;
      if (!thumbnailUrl) thumbnailUrl = meta.thumbnail_url ?? null;
    }
  }

  const id = await insertBetaVideo({
    db,
    problemSlug,
    videoUrl,
    postId,
    platform,
    thumbnailUrl,
    instagramUsername,
    instagramTimestamp: null,
  });

  return { id };
}

// ─────────────────────────────────────────────
// 등록 — Webhook 게시물 캡션 멘션
// ─────────────────────────────────────────────

/**
 * Webhook에서 media_id만 수신된 경우 (게시물 캡션에 멘션).
 * mentioned_media API로 caption을 가져와 문제 제목을 파싱 후 등록합니다.
 */
export async function addVideoFromMediaMention(
  db: D1Database,
  mediaId: string,
  userId: string,
  accessToken: string,
  igApi: IgApiFacebookLogin
): Promise<void> {
  const media = await igApi.getMentionedMedia(userId, mediaId, accessToken);
  if (!media) {
    console.error('[betaVideoService] mentioned_media fetch failed — mediaId=%s', mediaId);
    return;
  }

  const caption = media.caption;
  const permalink = media.permalink ?? `https://www.instagram.com/p/${media.id ?? mediaId}/`;

  await _registerFromCaption(db, igApi, {
    caption,
    permalink,
    mediaId: media.id ?? mediaId,
    thumbnailUrl: media.thumbnail_url ?? media.media_url ?? null,
    username: media.username ?? null,
  });
}

// ─────────────────────────────────────────────
// 등록 — Webhook 댓글 멘션
// ─────────────────────────────────────────────

/**
 * Webhook에서 comment_id가 수신된 경우 (댓글에 멘션).
 * mentioned_comment API로 댓글 텍스트(caption 역할)를 가져와 문제 제목을 파싱 후 등록합니다.
 */
export async function addVideoFromCommentMention(
  db: D1Database,
  commentId: string,
  mediaId: string,
  userId: string,
  accessToken: string,
  igApi: IgApiFacebookLogin
): Promise<void> {
  const comment = await igApi.getMentionedComment(userId, commentId, accessToken);
  if (!comment) {
    console.error('[betaVideoService] mentioned_comment fetch failed — commentId=%s', commentId);
    return;
  }

  const caption = comment.text;
  const resolvedMediaId = comment.media?.id ?? mediaId;
  const permalink = comment.media?.permalink ?? `https://www.instagram.com/p/${resolvedMediaId}/`;

  await _registerFromCaption(db, igApi, {
    caption,
    permalink,
    mediaId: resolvedMediaId,
    thumbnailUrl: comment.media?.thumbnail_url ?? comment.media?.media_url ?? null,
    username: comment.media?.username ?? null,
  });
}

/**
 * caption을 파싱하여 문제 제목을 추출하고 beta_videos에 삽입하는 공통 로직.
 */
async function _registerFromCaption(
  db: D1Database,
  igApi: IgApiFacebookLogin,
  ctx: {
    caption: string | undefined;
    permalink: string;
    mediaId: string;
    thumbnailUrl: string | null;
    username: string | null;
  }
): Promise<void> {
  if (!ctx.caption) {
    console.log('[betaVideoService] no caption — skipping');
    return;
  }

  const problemTitle = extractProblemTitle(ctx.caption);
  if (!problemTitle) {
    console.log('[betaVideoService] no quoted problem title in caption:', ctx.caption.slice(0, 100));
    return;
  }

  const problemSlug = await findProblemSlug(db, problemTitle);
  if (!problemSlug) {
    console.log('[betaVideoService] no problem found for title: "%s"', problemTitle);
    return;
  }

  // 중복 체크 (permalink 기준)
  const existing = await db.prepare(
    'SELECT id FROM beta_videos WHERE problem_slug = ? AND video_url = ? AND deleted_at IS NULL'
  ).bind(problemSlug, ctx.permalink).first();

  if (existing) {
    console.log('[betaVideoService] duplicate: %s / %s', problemSlug, ctx.permalink);
    return;
  }

  // oEmbed로 username/thumbnail 보강
  let instagramUsername = ctx.username;
  let thumbnailUrl = ctx.thumbnailUrl;

  const meta = await igApi.getVideoMetaFromOembed(ctx.permalink).catch(() => null)
    ?? await getVideoMetaFromHTML(ctx.permalink);
  if (meta) {
    if (!instagramUsername) instagramUsername = meta.author_name ?? null;
    if (!thumbnailUrl) thumbnailUrl = meta.thumbnail_url ?? null;
  }

  await db.prepare(
    'INSERT INTO beta_videos (problem_slug, video_url, post_id, platform, thumbnail_url, submitted_at, status, instagram_username, instagram_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    problemSlug,
    ctx.permalink,
    ctx.mediaId,
    'instagram',
    thumbnailUrl,
    new Date().toISOString(),
    'approved',
    instagramUsername,
    null
  ).run();

  console.log('[betaVideoService] registered via mention: slug=%s username=%s permalink=%s', problemSlug, instagramUsername, ctx.permalink);
}

// ─────────────────────────────────────────────
// 관리자 조회
// ─────────────────────────────────────────────

/**
 * 관리자용 베타 비디오 목록을 조회합니다.
 * platform, problem, includeDeleted 필터를 지원합니다.
 */
export async function adminListVideos(
  db: D1Database,
  filters: VideoFilters
): Promise<{ videos: AdminBetaVideo[]; total: number }> {
  let query =
    'SELECT id, problem_slug, video_url, platform, thumbnail_url, submitted_at, status, post_id, deleted_at, instagram_username, instagram_timestamp FROM beta_videos';
  const conditions: string[] = [];
  const bindings: string[] = [];

  if (!filters.includeDeleted) conditions.push('deleted_at IS NULL');
  if (filters.platform) { conditions.push('platform = ?'); bindings.push(filters.platform); }
  if (filters.problem) { conditions.push('problem_slug = ?'); bindings.push(filters.problem); }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY submitted_at DESC';

  const { results } = await db.prepare(query).bind(...bindings).all();

  const videos: AdminBetaVideo[] = results.map((row: any) => ({
    id: row.id,
    problemSlug: row.problem_slug,
    videoUrl: row.video_url,
    instagramUrl: row.video_url,
    platform: row.platform || 'instagram',
    thumbnailUrl: row.thumbnail_url,
    submittedAt: row.submitted_at,
    status: row.status,
    postId: row.post_id,
    deletedAt: row.deleted_at,
    instagramUsername: row.instagram_username || null,
    instagramTimestamp: row.instagram_timestamp || null,
  }));

  return { videos, total: videos.length };
}

// ─────────────────────────────────────────────
// Dry-run 미리보기
// ─────────────────────────────────────────────

/**
 * 해시태그 검색 결과에서 선택한 항목들을 oEmbed 보강 후 미리보기합니다.
 * DB에 저장하지 않습니다.
 */
export async function dryAddVideoFromHashTag(
  items: { videoUrl: string; thumbnailUrl?: string | null }[],
  problemSlug: string,
  igApi: IgApiFacebookLogin
): Promise<DryRunRow[]> {
  const now = new Date().toISOString();

  return Promise.all(
    items.map(async ({ videoUrl, thumbnailUrl: providedThumb }) => {
      const platform = detectPlatform(videoUrl);
      const postId = extractPostId(videoUrl, platform);
      let thumbnailUrl = providedThumb ?? null;
      let instagramUsername: string | null = null;

      if (platform === 'instagram') {
        const meta = await igApi.getVideoMetaFromOembed(videoUrl).catch(() => null)
          ?? await getVideoMetaFromHTML(videoUrl);
        if (meta) {
          if (!instagramUsername) instagramUsername = meta.author_name ?? null;
          if (!thumbnailUrl) thumbnailUrl = meta.thumbnail_url ?? null;
        }
      }

      return {
        problem_slug: problemSlug,
        video_url: videoUrl,
        post_id: postId,
        platform,
        thumbnail_url: thumbnailUrl,
        submitted_at: now,
        status: 'approved',
        instagram_username: instagramUsername,
        instagram_timestamp: null,
      };
    })
  );
}

// ─────────────────────────────────────────────
// 메타데이터 새로고침
// ─────────────────────────────────────────────

/**
 * 베타 비디오의 author(instagram_username)와 thumbnail_url을 oEmbed/HTML로 다시 가져와 업데이트합니다.
 *
 * @throws 'not_found'
 */
export async function refreshVideoMeta(
  db: D1Database,
  id: number,
  igApi: IgApiFacebookLogin
): Promise<{ instagramUsername: string | null; thumbnailUrl: string | null }> {
  const row = await db.prepare(
    'SELECT id, video_url, platform, thumbnail_url, instagram_username FROM beta_videos WHERE id = ?'
  ).bind(id).first() as { id: number; video_url: string; platform: string; thumbnail_url: string | null; instagram_username: string | null } | null;

  if (!row) throw new Error('not_found');

  let instagramUsername: string | null = row.instagram_username;
  let thumbnailUrl: string | null = row.thumbnail_url;

  if (row.platform === 'instagram') {
    const meta = await igApi.getVideoMetaFromOembed(row.video_url).catch(() => null)
      ?? await getVideoMetaFromHTML(row.video_url);
    if (meta) {
      instagramUsername = meta.author_name ?? instagramUsername;
      // 기존에 유효한 썸네일(non-null, non-empty)이 없을 때만 새 값으로 업데이트
      const hasValidThumbnail = !!row.thumbnail_url?.trim();
      const newThumbnail = meta.thumbnail_url?.trim() || null;
      if (!hasValidThumbnail && newThumbnail) thumbnailUrl = newThumbnail;
    }
  }

  await db.prepare(
    'UPDATE beta_videos SET instagram_username = ?, thumbnail_url = ? WHERE id = ?'
  ).bind(instagramUsername, thumbnailUrl, id).run();

  return { instagramUsername, thumbnailUrl };
}

// ─────────────────────────────────────────────
// 삭제
// ─────────────────────────────────────────────

/**
 * 베타 비디오를 소프트 삭제합니다 (deleted_at 설정).
 *
 * @throws 'not_found' | 'already_deleted'
 */
export async function deleteVideo(db: D1Database, id: number): Promise<void> {
  const existing = await db.prepare(
    'SELECT id, deleted_at FROM beta_videos WHERE id = ?'
  ).bind(id).first() as { id: number; deleted_at: string | null } | null;

  if (!existing) throw new Error('not_found');
  if (existing.deleted_at) throw new Error('already_deleted');

  await db.prepare(
    'UPDATE beta_videos SET deleted_at = ?, status = ? WHERE id = ?'
  ).bind(new Date().toISOString(), 'deleted', id).run();
}
