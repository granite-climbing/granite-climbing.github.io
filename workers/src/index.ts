/**
 * Cloudflare Worker - Granite Climbing API
 *
 * Provides:
 * 1. Instagram hashtag media search proxy (token stored in D1)
 * 2. Beta video submission and retrieval (D1 database)
 * 3. Admin beta video management (list, soft delete)
 * 4. Instagram OAuth flow (connect, callback, status, refresh, disconnect)
 * 5. Admin Instagram hashtag search (uses DB token)
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
import { handleHashtagSearch } from './handlers/hashtag';
import { handleGetBetaVideos, handleSubmitBetaVideo } from './handlers/betaVideos';
import { handleAdminGetBetaVideos, handleAdminDeleteBetaVideo, handleAdminDryRun } from './handlers/adminBetaVideos';
import {
  handleGetInstagramAuthUrl,
  handleInstagramCallback,
  handleGetInstagramStatus,
  handleRefreshInstagramToken,
  handleDeleteInstagramToken,
  handleAdminHashtagSearch,
} from './handlers/instagramAuth';
import { handleWebhookVerification, handleWebhookEvent } from './handlers/webhook';

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

    // Route: Admin beta video dry-run (preview INSERT data with oEmbed enrichment)
    if (url.pathname === '/admin/beta-videos/dry-run') {
      if (request.method === 'POST') {
        return handleAdminDryRun(request, env, corsHeaders);
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

    // Route: Instagram OAuth - get authorization URL
    if (url.pathname === '/admin/instagram/auth-url') {
      if (request.method === 'GET') {
        return handleGetInstagramAuthUrl(request, env, corsHeaders);
      } else {
        return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
      }
    }

    // Route: Instagram OAuth - callback (public, no auth)
    if (url.pathname === '/instagram/callback') {
      if (request.method === 'GET') {
        return handleInstagramCallback(request, env);
      } else {
        return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
      }
    }

    // Route: Instagram Webhook (public, no admin auth — verified via signature/verify_token)
    if (url.pathname === '/instagram/webhook') {
      if (request.method === 'GET') {
        return handleWebhookVerification(request, env);
      } else if (request.method === 'POST') {
        return handleWebhookEvent(request, env);
      } else {
        return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
      }
    }

    // Route: Instagram token status
    if (url.pathname === '/admin/instagram/status') {
      if (request.method === 'GET') {
        return handleGetInstagramStatus(request, env, corsHeaders);
      } else {
        return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
      }
    }

    // Route: Instagram token refresh
    if (url.pathname === '/admin/instagram/refresh') {
      if (request.method === 'POST') {
        return handleRefreshInstagramToken(request, env, corsHeaders);
      } else {
        return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
      }
    }

    // Route: Instagram token delete (disconnect)
    if (url.pathname === '/admin/instagram/token') {
      if (request.method === 'DELETE') {
        return handleDeleteInstagramToken(request, env, corsHeaders);
      } else {
        return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
      }
    }

    // Route: Admin Instagram hashtag search
    if (url.pathname === '/admin/instagram/hashtag') {
      if (request.method === 'GET') {
        return handleAdminHashtagSearch(request, env, corsHeaders);
      } else {
        return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
      }
    }

    // Route: Image proxy (strips CORP headers from Instagram CDN images)
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

    // Route: Instagram hashtag search (public)
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    return handleHashtagSearch(request, env, corsHeaders);
  },
};
