'use client';

import {
  Download, FileVideo, HardDriveDownload, CloudDownload, Link as LinkIcon,
  Link2, Film, MonitorPlay, Disc, Package, ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DownloadLink } from '@/lib/types';

// Map of allowed lucide icon names → components.
// Falls back to a generic Download icon for unknown names.
const ICON_MAP: Record<string, LucideIcon> = {
  Download,
  FileVideo,
  HardDriveDownload,
  CloudDownload,
  Link: LinkIcon,
  Link2,
  Film,
  MonitorPlay,
  Disc,
  Package,
};

/**
 * Resolve an icon name (from `DownloadLink.icon`) to a React node.
 * - If the value is a Bootstrap Icons class (`bi bi-*`), we render an `<i>`
 *   element with that class via the CDN stylesheet (loaded in layout.tsx).
 * - If the value is a Font Awesome class (`fa*`), we render an `<i>` element.
 * - Otherwise we look it up in ICON_MAP and fall back to `Download`.
 */
function renderIcon(iconName: string | undefined): React.ReactNode {
  if (!iconName) return <Download className="w-3.5 h-3.5 shrink-0" />;
  // Bootstrap icons: "bi bi-download"
  if (iconName.startsWith('bi ')) {
    return <i className={iconName} aria-hidden="true" />;
  }
  // Font Awesome: "fa fa-download", "fas fa-download"
  if (iconName.startsWith('fa')) {
    return <i className={iconName} aria-hidden="true" />;
  }
  const IconComp = ICON_MAP[iconName] || Download;
  return <IconComp className="w-3.5 h-3.5 shrink-0" />;
}

interface DownloadButtonsProps {
  links: DownloadLink[] | undefined;
  /**
   * Layout variant:
   *   - "row":  horizontal flex wrap (compact, good for inline episode cards)
   *   - "grid": responsive grid (good for the video player page)
   * Default: "row".
   */
  variant?: 'row' | 'grid';
  /** Optional heading to render above the buttons. */
  title?: string;
  /** Optional extra className for the outer container. */
  className?: string;
}

/**
 * Renders the download buttons for a video or episode.
 * Each button is an `<a>` with target="_blank" rel="noopener noreferrer".
 *
 * - `label` is the button text (required).
 * - `icon` is rendered before the label.
 * - `quality` and `size` are shown as small badges after the label.
 *
 * Buttons that don't have an http(s) URL are silently skipped — this
 * guards against `javascript:` and other unsafe schemes.
 */
export function DownloadButtons({
  links,
  variant = 'row',
  title,
  className,
}: DownloadButtonsProps) {
  // Filter to safe http(s) URLs only.
  const safeLinks = (links || []).filter(
    (l) => l && typeof l.url === 'string' && /^https?:\/\//i.test(l.url),
  );
  if (safeLinks.length === 0) return null;

  const containerClass =
    variant === 'grid'
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'
      : 'flex flex-wrap gap-2';

  return (
    <div className={`space-y-2 ${className || ''}`}>
      {title && (
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" />
          {title}
        </h4>
      )}
      <div className={containerClass}>
        {safeLinks.map((link, idx) => (
          <a
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium transition-all active:scale-95 min-h-[36px]"
            title={link.size ? `${link.label} · ${link.size}` : link.label}
          >
            {renderIcon(link.icon)}
            <span className="truncate max-w-[140px]">{link.label}</span>
            {link.quality && (
              <span className="ml-0.5 px-1 py-0.5 rounded bg-emerald-500/20 text-[9px] font-bold uppercase shrink-0">
                {link.quality}
              </span>
            )}
            {link.size && (
              <span className="text-[9px] text-muted-foreground shrink-0 hidden sm:inline">
                · {link.size}
              </span>
            )}
            <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity shrink-0 ml-auto" />
          </a>
        ))}
      </div>
    </div>
  );
}
