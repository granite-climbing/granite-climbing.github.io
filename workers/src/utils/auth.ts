/**
 * Admin authentication utilities
 * Verifies admin access using DecapBridge JWT tokens
 *
 * The token is stored in localStorage under 'gotrue.user' key by Decap CMS.
 * Since the JWT uses HS256 (symmetric key) we cannot verify the signature directly,
 * so we validate by calling the DecapBridge /users API with the token.
 */

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * Verify a DecapBridge JWT token by calling the /users API
 * Returns true if the token is valid and the user is authenticated
 */
export async function verifyDecapBridgeToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://gateway.decapbridge.com/github/branches/main', {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'granite-worker/1.0',
      },
    });
    if (!response.ok) {
      const text = await response.text();
      console.error('[auth] DecapBridge verification failed:', response.status, response.statusText, 'body:', text, 'token:', token);
    }
    return response.ok;
  } catch (e) {
    console.error('[auth] DecapBridge fetch error:', e);
    return false;
  }
}

/**
 * Middleware-style auth check for admin routes
 * Returns null if authorized, or an error Response if not
 */
export async function requireAdminAuth(
  request: Request,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const token = extractBearerToken(request);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const isValid = await verifyDecapBridgeToken(token);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  return null;
}
