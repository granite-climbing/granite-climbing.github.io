/**
 * Cloudflare Worker - Granite Climbing API
 *
 * Provides:
 * 1. Instagram hashtag media search proxy (token stored in D1)
 * 2. Beta video submission and retrieval (D1 database)
 * 3. Admin beta video management (list, soft delete, dry-run)
 * 4. Instagram OAuth flow (connect, callback, status, refresh, disconnect)
 * 5. Admin Instagram hashtag search (uses DB token)
 * 6. Instagram Webhook (mention → auto-register beta video)
 *
 * Environment variables (set via `wrangler secret put`):
 *   INSTAGRAM_APP_ID      - Facebook App ID (client_id)
 *   INSTAGRAM_APP_SECRET  - Facebook App Secret (client_secret)
 *   ALLOWED_ORIGIN        - Frontend origin for OAuth callback redirect
 *   WEBHOOK_VERIFY_TOKEN  - Arbitrary secret used for Instagram webhook subscription verification
 *
 * D1 Database bindings:
 *   DB                    - Beta videos + Instagram tokens database
 */

import { createCorsHeaders, jsonResponse } from './utils/response';
import { handleHashtagSearch } from './handlers/instagramHashtag';
import { handleAdminHashtagSearch } from './handlers/instagramHashtag';
import { handleGetBetaVideos, handleSubmitBetaVideo, handleAdminGetBetaVideos, handleAdminDeleteBetaVideo, handleAdminDryRun, handleAdminAddVideoFromHashTag, handleAdminRefreshVideoMeta } from './handlers/betaVideos';
import {
  handleGetInstagramAuthUrl,
  handleInstagramCallback,
  handleGetInstagramStatus,
  handleRefreshInstagramToken,
  handleDeleteInstagramToken,
} from './handlers/instagramAuth';
import { handleWebhookVerification, handleWebhookEvent } from './handlers/instagramWebhook';

interface Env {
  INSTAGRAM_APP_ID: string;
  INSTAGRAM_APP_SECRET: string;
  ALLOWED_ORIGIN: string;
  WEBHOOK_VERIFY_TOKEN: string;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = createCorsHeaders(request.headers.get('Origin'));

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Beta videos (public)
    if (url.pathname === '/beta-videos') {
      if (request.method === 'GET') return handleGetBetaVideos(request, env, corsHeaders);
      if (request.method === 'POST') return handleSubmitBetaVideo(request, env, corsHeaders);
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Admin beta videos — dry-run (must come before /:id pattern)
    if (url.pathname === '/admin/beta-videos/dry-run') {
      if (request.method === 'POST') return handleAdminDryRun(request, env, corsHeaders);
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Admin beta videos — list + add from hashtag
    if (url.pathname === '/admin/beta-videos') {
      if (request.method === 'GET') return handleAdminGetBetaVideos(request, env, corsHeaders);
      if (request.method === 'POST') return handleAdminAddVideoFromHashTag(request, env, corsHeaders);
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Admin beta video refresh meta (must come before /:id pattern)
    const adminRefreshMatch = url.pathname.match(/^\/admin\/beta-videos\/(\d+)\/refresh$/);
    if (adminRefreshMatch) {
      if (request.method === 'PATCH') return handleAdminRefreshVideoMeta(request, env, corsHeaders, adminRefreshMatch[1]);
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Admin beta video delete (soft delete)
    const adminDeleteMatch = url.pathname.match(/^\/admin\/beta-videos\/(\d+)$/);
    if (adminDeleteMatch) {
      if (request.method === 'DELETE') return handleAdminDeleteBetaVideo(request, env, corsHeaders, adminDeleteMatch[1]);
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Instagram OAuth
    if (url.pathname === '/admin/instagram/auth-url') {
      if (request.method === 'GET') return handleGetInstagramAuthUrl(request, env, corsHeaders);
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    if (url.pathname === '/instagram/callback') {
      if (request.method === 'GET') return handleInstagramCallback(request, env);
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    if (url.pathname === '/admin/instagram/status') {
      if (request.method === 'GET') return handleGetInstagramStatus(request, env, corsHeaders);
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    if (url.pathname === '/admin/instagram/refresh') {
      if (request.method === 'POST') return handleRefreshInstagramToken(request, env, corsHeaders);
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    if (url.pathname === '/admin/instagram/token') {
      if (request.method === 'DELETE') return handleDeleteInstagramToken(request, env, corsHeaders);
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Admin Instagram hashtag search
    if (url.pathname === '/admin/instagram/hashtag') {
      if (request.method === 'GET') return handleAdminHashtagSearch(request, env, corsHeaders);
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Instagram Webhook
    if (url.pathname === '/instagram/webhook') {
      if (request.method === 'GET') return handleWebhookVerification(request, env);
      if (request.method === 'POST') return handleWebhookEvent(request, env);
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Image proxy (strips CORP headers from Instagram CDN images)
    if (url.pathname === '/proxy/image') {
      const imageUrl = url.searchParams.get('url');
      if (!imageUrl) return jsonResponse({ error: 'Missing url parameter' }, 400, corsHeaders);
      try {
        const res = await fetch(imageUrl);
        if (!res.ok) return new Response(null, { status: res.status });
        const headers = new Headers(corsHeaders);
        headers.set('Content-Type', res.headers.get('Content-Type') || 'image/jpeg');
        headers.set('Cache-Control', 'public, max-age=86400');
        headers.delete('Cross-Origin-Resource-Policy');
        return new Response(res.body, { status: 200, headers });
      } catch {
        return new Response(null, { status: 502 });
      }
    }

    // Public hashtag search (fallback)
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    return handleHashtagSearch(request, env, corsHeaders);
  },
};
