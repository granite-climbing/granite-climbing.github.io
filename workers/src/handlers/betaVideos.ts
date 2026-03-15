/**
 * Beta Videos Handler
 * Manages user-submitted beta video links stored in D1 database
 * Supports multiple platforms: instagram, youtube, tiktok, other
 */

import { jsonResponse } from '../utils/response';
import { detectPlatform, extractPostId } from '../utils/validation';

interface Env {
  DB: D1Database;
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
    const { results } = await env.DB.prepare(
      'SELECT id, video_url, platform, thumbnail_url, submitted_at FROM beta_videos WHERE problem_slug = ? AND status = ? AND deleted_at IS NULL ORDER BY submitted_at DESC'
    ).bind(problemSlug, 'approved').all();

    const videos = results.map((row: any) => ({
      id: row.id,
      videoUrl: row.video_url,
      instagramUrl: row.video_url, // backwards compatibility
      platform: row.platform || 'instagram',
      thumbnailUrl: row.thumbnail_url,
      submittedAt: row.submitted_at,
    }));

    return jsonResponse({ videos }, 200, corsHeaders);
  } catch (error) {
    console.error('Database error:', error);
    return jsonResponse({ error: 'Failed to fetch beta videos' }, 500, corsHeaders);
  }
}

/**
 * Handle POST /beta-videos
 * Submit a new beta video link for a problem
 * Accepts both 'videoUrl' and legacy 'instagramUrl' parameter names
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
      instagramUrl?: string; // legacy field name
    };
    const { problemSlug } = body;
    const videoUrl = body.videoUrl || body.instagramUrl;

    if (!problemSlug || !videoUrl) {
      return jsonResponse({ error: 'Missing required fields' }, 400, corsHeaders);
    }

    const platform = detectPlatform(videoUrl);
    const postId = extractPostId(videoUrl, platform);

    // Check for duplicate (by problem + post ID if available, else by URL)
    if (postId) {
      const existing = await env.DB.prepare(
        'SELECT id FROM beta_videos WHERE problem_slug = ? AND post_id = ? AND deleted_at IS NULL'
      ).bind(problemSlug, postId).first();

      if (existing) {
        return jsonResponse({ error: 'Video already submitted for this problem' }, 409, corsHeaders);
      }
    } else {
      const existing = await env.DB.prepare(
        'SELECT id FROM beta_videos WHERE problem_slug = ? AND video_url = ? AND deleted_at IS NULL'
      ).bind(problemSlug, videoUrl).first();

      if (existing) {
        return jsonResponse({ error: 'Video already submitted for this problem' }, 409, corsHeaders);
      }
    }

    // Fetch thumbnail (best effort, Instagram only for now)
    let thumbnailUrl = null;
    if (platform === 'instagram') {
      try {
        const response = await fetch(videoUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          },
        });

        if (response.ok) {
          const html = await response.text();
          const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
          const twitterImageMatch = html.match(/<meta name="twitter:image" content="([^"]+)"/);
          thumbnailUrl = ogImageMatch?.[1] || twitterImageMatch?.[1] || null;
        }
      } catch (error) {
        console.error('Failed to fetch thumbnail:', error);
      }
    }

    const result = await env.DB.prepare(
      'INSERT INTO beta_videos (problem_slug, video_url, post_id, platform, thumbnail_url, submitted_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      problemSlug,
      videoUrl,
      postId,
      platform,
      thumbnailUrl,
      new Date().toISOString(),
      'approved'
    ).run();

    return jsonResponse({ success: true, id: result.meta.last_row_id }, 201, corsHeaders);
  } catch (error) {
    console.error('Submission error:', error);
    return jsonResponse({ error: 'Failed to submit beta video' }, 500, corsHeaders);
  }
}
