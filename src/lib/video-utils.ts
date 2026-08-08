export type VideoPlayerType = 'iframe';

export interface ResolvedVideo {
  type: VideoPlayerType;
  src: string;
}

/**
 * যেকোনো URL সরাসরি iframe-এ লোড হবে — কোনো URL manipulation নেই।
 */
export function resolveVideoUrl(url: string): ResolvedVideo {
  if (!url) return { type: 'iframe', src: '' };
  return { type: 'iframe', src: url.trim() };
}

export function parseTags(tagsStr: string): string[] {
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return (tagsStr || '').split(',').map(t => t.trim()).filter(Boolean);
  }
}

export function matchVideoTag(video: { tag?: string; tags?: string }, categoryName: string): boolean {
  if (!categoryName) return true;
  const target = categoryName.trim().toLowerCase();
  if (!target) return true;

  const rawTags = `${video.tag || ''}, ${video.tags || ''}`.toLowerCase();
  if (rawTags.includes(target)) return true;

  const tagList = parseTags(video.tags || video.tag || '');
  return tagList.some(t => t.toLowerCase() === target || t.toLowerCase().includes(target) || target.includes(t.toLowerCase()));
}

export function formatDuration(duration: string | null): string {
  if (!duration) return '';
  return duration;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function generateGiftCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[arr[i] % chars.length];
  }
  return code;
}

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
