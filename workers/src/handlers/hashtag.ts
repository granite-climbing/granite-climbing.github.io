/**
 * Instagram Hashtag Search Handler
 * Proxies Instagram Graph API hashtag search requests
 * Uses access token stored in D1 database (set via Instagram OAuth flow)
 */

import { jsonResponse } from '../utils/response';
import { searchHashtagMedia } from '../utils/instagramApi';

interface Env {
  DB: D1Database;
}

/**
 * Handle Instagram hashtag search requests
 * GET /?hashtag=<tag>
 */
export async function handleHashtagSearch(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const hashtag = url.searchParams.get('hashtag');

  if (!hashtag) {
    return jsonResponse({ error: 'Missing ?hashtag= parameter' }, 400, corsHeaders);
  }

  try {
    // Fetch token from D1 database
    const tokenRow = await env.DB.prepare(
      'SELECT access_token, user_id FROM instagram_tokens LIMIT 1'
    ).first() as { access_token: string; user_id: string } | null;

    if (!tokenRow) {
      return jsonResponse({ error: 'Instagram not configured' }, 500, corsHeaders);
    }

    const media = await searchHashtagMedia(hashtag, tokenRow.access_token, tokenRow.user_id);
    return jsonResponse({ data: media }, 200, corsHeaders);
  } catch (error) {
    console.error('Hashtag search error:', error);
    return jsonResponse({ error: 'Failed to fetch Instagram data' }, 502, corsHeaders);
  }
}
