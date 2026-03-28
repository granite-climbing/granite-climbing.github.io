/**
 * 베타 비디오 핸들러 (공개 + 관리자)
 *
 * 요청 파싱 + 서비스 호출 + HTTP 응답 반환만 담당합니다.
 * 비즈니스 로직은 betaVideoService에 있습니다.
 */

import { jsonResponse } from '../utils/response';
import { requireAdminAuth } from '../utils/auth';
import { IgApiFacebookLogin } from '../utils/IgApiFacebookLogin';
import {
  getApprovedVideos,
  addVideoFromURL,
  addVideoFromHashTag,
  adminListVideos,
  dryAddVideoFromHashTag,
  deleteVideo,
} from '../services/betaVideoService';

interface Env {
  DB: D1Database;
  INSTAGRAM_APP_ID?: string;
  INSTAGRAM_APP_SECRET?: string;
}

// ─────────────────────────────────────────────
// 공개 엔드포인트
// ─────────────────────────────────────────────

/**
 * GET /beta-videos?problem=<slug>
 * 특정 문제의 승인된 베타 비디오 목록을 반환합니다.
 */
export async function handleGetBetaVideos(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const problemSlug = new URL(request.url).searchParams.get('problem');
  if (!problemSlug) return jsonResponse({ error: 'Missing problem parameter' }, 400, corsHeaders);

  try {
    const videos = await getApprovedVideos(env.DB, problemSlug);
    return jsonResponse({ videos }, 200, corsHeaders);
  } catch (error) {
    console.error('[betaVideos] getApprovedVideos error:', error);
    return jsonResponse({ error: 'Failed to fetch beta videos' }, 500, corsHeaders);
  }
}

/**
 * POST /beta-videos
 * 사용자가 URL을 직접 입력하여 베타 비디오를 등록합니다.
 */
export async function handleSubmitBetaVideo(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as {
      problemSlug?: string;
      videoUrl?: string;
      instagramUrl?: string;
      thumbnailUrl?: string | null;
      instagramUsername?: string | null;
      instagramTimestamp?: string | null;
    };

    const problemSlug = body.problemSlug;
    const videoUrl = body.videoUrl || body.instagramUrl;

    if (!problemSlug || !videoUrl) {
      return jsonResponse({ error: 'Missing required fields' }, 400, corsHeaders);
    }

    const igApi = env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET
      ? new IgApiFacebookLogin(env.INSTAGRAM_APP_ID, env.INSTAGRAM_APP_SECRET)
      : null;

    const result = await addVideoFromURL(
      env.DB,
      { problemSlug, videoUrl, thumbnailUrl: body.thumbnailUrl, instagramUsername: body.instagramUsername, instagramTimestamp: body.instagramTimestamp },
      igApi as IgApiFacebookLogin
    );

    return jsonResponse({ success: true, id: result.id }, 201, corsHeaders);
  } catch (err: any) {
    if (err?.message === 'duplicate') {
      return jsonResponse({ error: 'Video already submitted for this problem' }, 409, corsHeaders);
    }
    console.error('[betaVideos] submit error:', err);
    return jsonResponse({ error: 'Failed to submit beta video' }, 500, corsHeaders);
  }
}

// ─────────────────────────────────────────────
// 관리자 엔드포인트
// ─────────────────────────────────────────────

/**
 * GET /admin/beta-videos
 * 베타 비디오 목록을 조회합니다 (platform, problem, includeDeleted 필터 지원).
 */
export async function handleAdminGetBetaVideos(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  const url = new URL(request.url);

  try {
    const result = await adminListVideos(env.DB, {
      platform: url.searchParams.get('platform'),
      problem: url.searchParams.get('problem'),
      includeDeleted: url.searchParams.has('includeDeleted'),
    });
    return jsonResponse(result, 200, corsHeaders);
  } catch (error) {
    console.error('[betaVideos] adminList error:', error);
    return jsonResponse({ error: 'Failed to fetch beta videos' }, 500, corsHeaders);
  }
}

/**
 * POST /admin/beta-videos/dry-run
 * 선택한 항목들을 oEmbed 보강 후 미리보기합니다 (DB 저장 없음).
 */
export async function handleAdminDryRun(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  const body = await request.json() as {
    problemSlug?: string;
    items?: { videoUrl: string; thumbnailUrl?: string | null }[];
  };

  if (!body.problemSlug || !Array.isArray(body.items) || body.items.length === 0) {
    return jsonResponse({ error: 'Missing problemSlug or items' }, 400, corsHeaders);
  }

  if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_APP_SECRET) {
    return jsonResponse({ error: 'Instagram app credentials not configured' }, 500, corsHeaders);
  }

  const igApi = new IgApiFacebookLogin(env.INSTAGRAM_APP_ID, env.INSTAGRAM_APP_SECRET);
  const rows = await dryAddVideoFromHashTag(body.items, body.problemSlug, igApi);
  return jsonResponse({ rows }, 200, corsHeaders);
}

/**
 * POST /admin/beta-videos
 * 관리자가 해시태그 검색 결과에서 선택한 항목을 등록합니다.
 */
export async function handleAdminAddVideoFromHashTag(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  const body = await request.json() as {
    problemSlug?: string;
    videoUrl?: string;
    thumbnailUrl?: string | null;
  };

  if (!body.problemSlug || !body.videoUrl) {
    return jsonResponse({ error: 'Missing required fields' }, 400, corsHeaders);
  }

  if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_APP_SECRET) {
    return jsonResponse({ error: 'Instagram app credentials not configured' }, 500, corsHeaders);
  }

  try {
    const igApi = new IgApiFacebookLogin(env.INSTAGRAM_APP_ID, env.INSTAGRAM_APP_SECRET);
    const result = await addVideoFromHashTag(env.DB, body as any, igApi);
    return jsonResponse({ success: true, id: result.id }, 201, corsHeaders);
  } catch (err: any) {
    if (err?.message === 'duplicate') {
      return jsonResponse({ error: 'Video already submitted for this problem' }, 409, corsHeaders);
    }
    console.error('[betaVideos] addFromHashTag error:', err);
    return jsonResponse({ error: 'Failed to add beta video' }, 500, corsHeaders);
  }
}

/**
 * DELETE /admin/beta-videos/:id
 * 베타 비디오를 소프트 삭제합니다.
 */
export async function handleAdminDeleteBetaVideo(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  id: string
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  const videoId = parseInt(id, 10);
  if (isNaN(videoId)) return jsonResponse({ error: 'Invalid video ID' }, 400, corsHeaders);

  try {
    await deleteVideo(env.DB, videoId);
    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (err: any) {
    if (err?.message === 'not_found') return jsonResponse({ error: 'Video not found' }, 404, corsHeaders);
    if (err?.message === 'already_deleted') return jsonResponse({ error: 'Video already deleted' }, 409, corsHeaders);
    console.error('[betaVideos] delete error:', err);
    return jsonResponse({ error: 'Failed to delete beta video' }, 500, corsHeaders);
  }
}
