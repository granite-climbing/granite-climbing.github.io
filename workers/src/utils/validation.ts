/**
 * Validation utilities for Instagram URLs and other inputs
 */

/**
 * Extract Instagram post ID from URL
 * Supports patterns:
 * - https://www.instagram.com/p/ABC123/
 * - https://instagram.com/p/ABC123/
 * - https://www.instagram.com/reel/ABC123/
 */
export function extractInstagramPostId(url: string): string | null {
  const match = url.match(/instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}
