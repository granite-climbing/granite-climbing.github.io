/**
 * Admin Beta Videos Handler
 * Provides admin-only endpoints for managing beta videos
 * Protected by DecapBridge JWT authentication
 */

import { jsonResponse } from '../utils/response';
import { requireAdminAuth } from '../utils/auth';

interface Env {
  DB: D1Database;
}

/**
 * Handle GET /admin/beta-videos
 * List all beta videos with optional filtering
 *
 * Query params:
 *   platform    - filter by platform (instagram|youtube|tiktok|other)
 *   problem     - filter by problem slug
 *   includeDeleted - include soft-deleted items (any value enables this)
 */
export async function handleAdminGetBetaVideos(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const authError = await requireAdminAuth(request, corsHeaders);
  if (authError) return authError;

  const url = new URL(request.url);
  const platform = url.searchParams.get('platform');
  const problem = url.searchParams.get('problem');
  const includeDeleted = url.searchParams.has('includeDeleted');

  try {
    let query =
      'SELECT id, problem_slug, video_url, platform, thumbnail_url, submitted_at, status, post_id, deleted_at FROM beta_videos';
    const conditions: string[] = [];
    const bindings: string[] = [];

    if (!includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }
    if (platform) {
      conditions.push('platform = ?');
      bindings.push(platform);
    }
    if (problem) {
      conditions.push('problem_slug = ?');
      bindings.push(problem);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY submitted_at DESC';

    const { results } = await env.DB.prepare(query).bind(...bindings).all();

    const videos = results.map((row: any) => ({
      id: row.id,
      problemSlug: row.problem_slug,
      videoUrl: row.video_url,
      platform: row.platform || 'instagram',
      thumbnailUrl: row.thumbnail_url,
      submittedAt: row.submitted_at,
      status: row.status,
      postId: row.post_id,
      deletedAt: row.deleted_at,
    }));

    return jsonResponse({ videos, total: videos.length }, 200, corsHeaders);
  } catch (error) {
    console.error('Admin DB error:', error);
    return jsonResponse({ error: 'Failed to fetch beta videos' }, 500, corsHeaders);
  }
}

/**
 * Handle DELETE /admin/beta-videos/:id
 * Soft delete a beta video by setting deleted_at timestamp and status = 'deleted'
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
  if (isNaN(videoId)) {
    return jsonResponse({ error: 'Invalid video ID' }, 400, corsHeaders);
  }

  try {
    const existing = await env.DB.prepare(
      'SELECT id, deleted_at FROM beta_videos WHERE id = ?'
    ).bind(videoId).first();

    if (!existing) {
      return jsonResponse({ error: 'Video not found' }, 404, corsHeaders);
    }

    if ((existing as any).deleted_at) {
      return jsonResponse({ error: 'Video already deleted' }, 409, corsHeaders);
    }

    await env.DB.prepare(
      'UPDATE beta_videos SET deleted_at = ?, status = ? WHERE id = ?'
    ).bind(new Date().toISOString(), 'deleted', videoId).run();

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (error) {
    console.error('Admin delete error:', error);
    return jsonResponse({ error: 'Failed to delete beta video' }, 500, corsHeaders);
  }
}
