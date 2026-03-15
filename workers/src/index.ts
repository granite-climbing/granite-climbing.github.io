/**
 * Cloudflare Worker - Granite Climbing API
 *
 * Provides:
 * 1. Instagram hashtag media search proxy (keeps access token secure)
 * 2. Beta video submission and retrieval (D1 database)
 * 3. Admin beta video management (list, soft delete)
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
import { handleAdminGetBetaVideos, handleAdminDeleteBetaVideo } from './handlers/adminBetaVideos';

interface Env {
  INSTAGRAM_ACCESS_TOKEN: string;
  INSTAGRAM_USER_ID: string;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = createCorsHeaders(request.headers.get('Origin'));

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

    // Route: Admin beta video list
    if (url.pathname === '/admin/beta-videos') {
      if (request.method === 'GET') {
        return handleAdminGetBetaVideos(request, env, corsHeaders);
      } else {
        return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
      }
    }

    // Route: Admin beta video delete (soft delete)
    const adminDeleteMatch = url.pathname.match(/^\/admin\/beta-videos\/(\d+)$/);
    if (adminDeleteMatch) {
      if (request.method === 'DELETE') {
        return handleAdminDeleteBetaVideo(request, env, corsHeaders, adminDeleteMatch[1]);
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
