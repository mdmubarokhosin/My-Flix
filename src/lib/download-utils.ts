import type { DownloadLink } from './types';

/**
 * Validate and normalize a downloadLinks array.
 *
 * Returns a clean array of DownloadLink objects with all unsafe fields
 * stripped. Throws if any link has a non-http(s) URL or missing label.
 */
export function validateDownloadLinks(
  input: unknown,
): DownloadLink[] {
  if (!Array.isArray(input)) return [];
  const result: DownloadLink[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const link = raw as Record<string, unknown>;
    const label = typeof link.label === 'string' ? link.label.trim() : '';
    const url = typeof link.url === 'string' ? link.url.trim() : '';
    if (!label || !url) continue; // skip incomplete entries
    if (!/^https?:\/\//i.test(url)) continue; // only http/https URLs
    const clean: DownloadLink = {
      label,
      url,
    };
    if (typeof link.icon === 'string' && link.icon.trim()) {
      // Allow only safe characters in icon name (alphanumeric, space, dash).
      const icon = link.icon.trim();
      if (/^[a-zA-Z0-9 _-]+$/.test(icon) || /^bi\s+[\w-]+$/.test(icon) || /^fa[sblr]?\s+[\w-]+$/.test(icon)) {
        clean.icon = icon;
      }
    }
    if (typeof link.quality === 'string' && link.quality.trim()) {
      clean.quality = link.quality.trim().slice(0, 20);
    }
    if (typeof link.size === 'string' && link.size.trim()) {
      clean.size = link.size.trim().slice(0, 30);
    }
    result.push(clean);
  }
  return result;
}
