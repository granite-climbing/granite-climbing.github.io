/**
 * Cloudflare Worker - Granite Climbing API
 *
 * Provides:
 * 1. Instagram hashtag media search proxy (keeps access token secure)
 * 2. Beta video submission and retrieval (D1 database)
 *
 * Environment variables (set via `wrangler secret put`):
 *   INSTAGRAM_ACCESS_TOKEN  - Long-lived user access token
 *   INSTAGRAM_USER_ID       - Instagram Business Account ID
 *
 * Environment variables (set in wrangler.toml [vars]):
 *   ALLOWED_ORIGIN          - CORS origin (e.g. https://granite-climbing.github.io)
 *
 * D1 Database bindings:
 *   DB                      - Beta videos database
 */

import { createCorsHeaders, jsonResponse } from './utils/response';
import { handleHashtagSearch } from './handlers/hashtag';
import { handleGetBetaVideos, handleSubmitBetaVideo } from './handlers/betaVideos';

interface Env {
  INSTAGRAM_ACCESS_TOKEN: string;
  INSTAGRAM_USER_ID: string;
  ALLOWED_ORIGIN: string;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = createCorsHeaders(env.ALLOWED_ORIGIN);

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Route: Beta video endpoints
    if (url.pathname === '/beta-videos') {
      if (request.method === 'GET') {
        return handleGetBetaVideos(request, env, corsHeaders);
      } else if (request.method === 'POST') {
        return handleSubmitBetaVideo(request, env, corsHeaders);
      } else {
        return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
      }
    }

    // Route: Instagram hashtag search (default)
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    return handleHashtagSearch(request, env, corsHeaders);
  },
};
