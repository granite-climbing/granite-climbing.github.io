/**
 * Validation utilities for video URLs and other inputs
 */

export type Platform = 'instagram' | 'youtube' | 'tiktok' | 'other';

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): Platform {
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  return 'other';
}

/**
 * Extract post/video ID from URL based on platform
 */
export function extractPostId(url: string, platform: Platform): string | null {
  if (platform === 'instagram') {
    const match = url.match(/instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/);
    return match ? match[2] : null;
  }
  if (platform === 'youtube') {
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }
  if (platform === 'tiktok') {
    const match = url.match(/video\/(\d+)/);
    return match ? match[1] : null;
  }
  return null;
}

/**
 * Extract Instagram post ID from URL (legacy - kept for backwards compatibility)
 * Supports patterns:
 * - https://www.instagram.com/p/ABC123/
 * - https://instagram.com/p/ABC123/
 * - https://www.instagram.com/reel/ABC123/
 */
export function extractInstagramPostId(url: string): string | null {
  const match = url.match(/instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}
