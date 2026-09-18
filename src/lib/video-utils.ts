import type { FirebaseRTDB } from './firebase-server';

// ============================================================
// Video URL resolution
// ------------------------------------------------------------
// Detects the source platform from a URL and returns:
//   - type: 'iframe' for embeddable players (YouTube, Vimeo, etc.)
//   - type: 'mp4'     for direct MP4/WebM/OGG (rendered with <video>)
//   - type: 'hls'     for .m3u8 streams (rendered with hls.js)
//
// For each platform the URL is normalized to its embed form so it
// plays reliably inside an iframe.
// ============================================================

export type VideoPlayerType = 'iframe' | 'mp4' | 'hls';

export interface ResolvedVideo {
  type: VideoPlayerType;
  src: string;
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url.trim());
  } catch {
    return null;
  }
}

export function resolveVideoUrl(url: string): ResolvedVideo {
  if (!url) return { type: 'iframe', src: '' };
  const trimmed = url.trim();
  const u = parseUrl(trimmed);
  if (!u) return { type: 'iframe', src: trimmed };

  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const path = u.pathname.toLowerCase();
  const ext = path.split('.').pop() || '';

  // ---- Direct video files ----
  if (['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(ext)) {
    return { type: 'mp4', src: trimmed };
  }
  // ---- HLS streams ----
  if (ext === 'm3u8' || trimmed.includes('.m3u8')) {
    return { type: 'hls', src: trimmed };
  }

  // ---- YouTube ----
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    let videoId = '';
    if (host === 'youtu.be') {
      videoId = u.pathname.slice(1);
    } else if (u.searchParams.get('v')) {
      videoId = u.searchParams.get('v')!;
    } else {
      const m = u.pathname.match(/\/(embed|shorts|v)\/([\w-]+)/);
      if (m) videoId = m[2];
    }
    if (videoId) {
      return { type: 'iframe', src: `https://www.youtube.com/embed/${videoId}` };
    }
  }

  // ---- Vimeo ----
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = u.pathname.match(/\/(\d+)/);
    if (m) {
      return { type: 'iframe', src: `https://player.vimeo.com/video/${m[1]}` };
    }
  }

  // ---- Dailymotion ----
  if (host === 'dailymotion.com' || host === 'www.dailymotion.com') {
    const m = u.pathname.match(/\/video\/([^/?_]+)/);
    if (m) {
      return { type: 'iframe', src: `https://www.dailymotion.com/embed/video/${m[1]}` };
    }
  }

  // ---- Google Drive ----
  if (host === 'drive.google.com') {
    const m = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (m) {
      return { type: 'iframe', src: `https://drive.google.com/file/d/${m[1]}/preview` };
    }
  }

  // ---- Rumble ----
  if (host === 'rumble.com') {
    // Rumble embeds: rumble.com/embed/<id>/
    if (u.pathname.startsWith('/embed/')) {
      return { type: 'iframe', src: trimmed };
    }
    // Otherwise leave as-is — Rumble pages can be embedded directly in many cases.
    return { type: 'iframe', src: trimmed };
  }

  // ---- Default: iframe ----
  return { type: 'iframe', src: trimmed };
}

// ============================================================
// Tags & categories
// ============================================================

export function parseTags(tagsStr: string): string[] {
  try {
    const parsed = JSON.parse(tagsStr);
    if (Array.isArray(parsed)) return parsed.map((t) => String(t));
  } catch {
    // not JSON
  }
  return (tagsStr || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Match a video to a category by tag.
 *
 * Uses EXACT (case-insensitive) matching against the video's tag list,
 * never substring matching. This avoids the "All" / "Sci" / "Fi" false
 * positives that the previous implementation produced.
 */
export function matchVideoTag(video: { tag?: string; tags?: string }, categoryName: string): boolean {
  if (!categoryName) return true;
  const target = categoryName.trim().toLowerCase();
  if (!target) return true;

  const tagList = parseTags(video.tags || video.tag || '').map((t) => t.toLowerCase());
  if (tagList.includes(target)) return true;

  // Also check the raw `tag` field as a single value (legacy).
  if (video.tag && video.tag.trim().toLowerCase() === target) return true;

  return false;
}

// ============================================================
// Formatting helpers (single source of truth — see also format-utils.ts)
// ============================================================

export function formatDuration(duration: string | null | undefined): string {
  if (!duration) return '';
  return duration;
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return String(num);
}

export function formatRelativeTime(dateStr: string | number): string {
  const date = typeof dateStr === 'number' ? new Date(dateStr) : new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ============================================================
// Gift codes
// ============================================================

/**
 * Generate a cryptographically-secure gift code in the format XXXX-XXXX-XXXX.
 * Uses ambiguous-character-free alphabet (no 0/O, 1/I/L).
 */
export function generateGiftCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    // Fallback (should not happen on Edge runtime).
    for (let i = 0; i < 12; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[arr[i] % chars.length];
  }
  return code;
}

// ============================================================
// Category icons (Lucide names)
// ============================================================

export const CATEGORY_ICONS: Record<string, string> = {
  'Movies': 'Film',
  'Anime': 'Sparkles',
  'Web Series': 'Tv',
  'Short Films': 'Clapperboard',
  'Documentary': 'Camera',
  'Music': 'Music',
  'Comedy': 'Laugh',
  'Drama': 'Theater',
  'Action': 'Sword',
  'Horror': 'Ghost',
  'Romance': 'Heart',
  'Thriller': 'AlertTriangle',
  'Sci-Fi': 'Rocket',
  'Sports': 'Trophy',
  'Education': 'GraduationCap',
  'Cooking': 'ChefHat',
};

// ============================================================
// Video deletion with cleanup
// ============================================================

/**
 * Delete a video and clean up all references across users.
 * Removes the video from the `videos` node and removes the videoId
 * from every user's `purchased` and `favorites` arrays.
 *
 * Uses a single atomic multi-location update per batch for efficiency.
 */
export async function deleteVideoAndCleanup(
  database: FirebaseRTDB,
  videoId: string,
): Promise<void> {
  // 1. Build the multi-location update map.
  const updates: Record<string, unknown> = {};
  updates[`videos/${videoId}`] = null; // delete

  // 2. Fetch all users and clean up references.
  const users = await database.get<Record<string, Record<string, unknown>>>('users');
  if (users) {
    for (const [userId, userData] of Object.entries(users)) {
      const purchased = Array.isArray(userData.purchased)
        ? (userData.purchased as (string | number)[]).map((p) => String(p))
        : [];
      const favorites = Array.isArray(userData.favorites)
        ? (userData.favorites as (string | number)[]).map((f) => String(f))
        : [];
      if (purchased.includes(videoId)) {
        updates[`users/${userId}/purchased`] = purchased.filter((id) => id !== videoId);
      }
      if (favorites.includes(videoId)) {
        updates[`users/${userId}/favorites`] = favorites.filter((id) => id !== videoId);
      }
    }
  }

  // 3. Apply atomically.
  await database.multiUpdate(updates);
}
