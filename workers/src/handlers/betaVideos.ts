/**
 * Beta Videos Handler
 * Manages user-submitted beta video links stored in D1 database
 */

import { jsonResponse } from '../utils/response';
import { extractInstagramPostId } from '../utils/validation';

interface Env {
  DB: D1Database;
  INSTAGRAM_ACCESS_TOKEN?: string;
}

/**
 * Handle GET /beta-videos?problem=<slug>
 * Retrieve submitted beta videos for a specific problem
 */
export async function handleGetBetaVideos(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const problemSlug = url.searchParams.get('problem');

  if (!problemSlug) {
    return jsonResponse({ error: 'Missing problem parameter' }, 400, corsHeaders);
  }

  try {
    // Query database for approved videos
    const { results } = await env.DB.prepare(
      'SELECT id, instagram_url, thumbnail_url, submitted_at FROM beta_videos WHERE problem_slug = ? AND status = ? ORDER BY submitted_at DESC'
    ).bind(problemSlug, 'approved').all();

    return jsonResponse({ videos: results }, 200, corsHeaders);
  } catch (error) {
    console.error('Database error:', error);
    return jsonResponse({ error: 'Failed to fetch beta videos' }, 500, corsHeaders);
  }
}

/**
 * Handle POST /beta-videos
 * Submit a new beta video link for a problem
 */
export async function handleSubmitBetaVideo(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json() as { problemSlug?: string; instagramUrl?: string };
    const { problemSlug, instagramUrl } = body;

    // Validate inputs
    if (!problemSlug || !instagramUrl) {
      return jsonResponse({ error: 'Missing required fields' }, 400, corsHeaders);
    }

    // Extract Instagram post ID from URL
    const postId = extractInstagramPostId(instagramUrl);
    if (!postId) {
      return jsonResponse({ error: 'Invalid Instagram URL format' }, 400, corsHeaders);
    }

    // Check for duplicate
    const existing = await env.DB.prepare(
      'SELECT id FROM beta_videos WHERE problem_slug = ? AND instagram_post_id = ?'
    ).bind(problemSlug, postId).first();

    if (existing) {
      return jsonResponse({ error: 'Video already submitted for this problem' }, 409, corsHeaders);
    }

    // Fetch Instagram post thumbnail using public oEmbed API (no access token required)
    let thumbnailUrl = null;
    try {
      const oembedUrl = `https://graph.instagram.com/instagram_oembed?url=${encodeURIComponent(instagramUrl)}&fields=thumbnail_url`;
      const oembedResponse = await fetch(oembedUrl);

      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json() as { thumbnail_url?: string };
        thumbnailUrl = oembedData.thumbnail_url || null;
      }
    } catch (error) {
      console.error('Failed to fetch Instagram thumbnail:', error);
      // Continue without thumbnail - better to save the video link than fail completely
    }

    // Insert into database
    const result = await env.DB.prepare(
      'INSERT INTO beta_videos (problem_slug, instagram_url, instagram_post_id, thumbnail_url, submitted_at, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      problemSlug,
      instagramUrl,
      postId,
      thumbnailUrl,
      new Date().toISOString(),
      'approved'  // Auto-approve for MVP
    ).run();

    return jsonResponse({ success: true, id: result.meta.last_row_id }, 201, corsHeaders);
  } catch (error) {
    console.error('Submission error:', error);
    return jsonResponse({ error: 'Failed to submit beta video' }, 500, corsHeaders);
  }
}
