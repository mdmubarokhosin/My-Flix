'use client';

import { Heart, Coins, Star, Tv } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Video } from '@/lib/types';
import { parseTags } from '@/lib/video-utils';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';

interface VideoCardProps {
  video: Video;
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isPurchased?: boolean;
}

export function VideoCard({ video, onClick, isFavorite, onToggleFavorite, isPurchased }: VideoCardProps) {
  const lang = useAppStore((s) => s.lang);
  const thumbnail = video.thumbnail || video.img;
  const needsPurchase = video.amount > 0 && !isPurchased;
  const tags = parseTags(video.tags || '');

  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-card border border-border/50 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 active:scale-[0.98]"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={video.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-4xl opacity-50">🎬</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Quality badge */}
        {video.quality && (
          <div className="absolute top-2 left-2 bg-emerald-500/90 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
            {video.quality}
          </div>
        )}

        {/* TMDB indicator */}
        {video.tmdbId && !video.contentType?.includes('series') && (
          <div className="absolute top-2 right-12 bg-black/70 text-amber-400 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 fill-amber-400" />TMDB
          </div>
        )}

        {/* Series badge */}
        {video.contentType === 'series' && (
          <div className="absolute top-2 right-2 bg-purple-500/90 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
            <Tv className="w-3 h-3" />{t('videoCard.series', lang)}
          </div>
        )}

        {/* Episode count for series */}
        {video.contentType === 'series' && video.totalEpisodes && (
          <div className="absolute bottom-2 left-2 bg-purple-600/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            {video.totalSeasons || 1}S · {video.totalEpisodes}E
          </div>
        )}

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
            {video.duration}
          </div>
        )}

        {/* Coin badge */}
        {video.amount > 0 && needsPurchase && (
          <div className="absolute top-2 right-2 bg-amber-500/90 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
            <Coins className="w-3 h-3" />
            {video.amount}
          </div>
        )}

        {/* Free badge */}
        {video.amount === 0 && !video.tmdbId && (
          <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            FREE
          </div>
        )}

        {/* Owned badge */}
        {video.amount > 0 && isPurchased && (
          <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            ✓ Owned
          </div>
        )}

        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center transition-colors hover:bg-black/70"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            aria-label={isFavorite ? t('videoCard.removeFav', lang) : t('videoCard.addFav', lang)}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite ? 'fill-red-500 text-red-500' : 'text-white/80'
              }`}
            />
          </button>
        )}
      </div>

      {/* Info section */}
      <div className="p-3">
        <h3 className="text-sm font-medium line-clamp-2 leading-tight">{video.name}</h3>
        <div className="flex items-center gap-1.5 mt-1">
          {video.year && <span className="text-[10px] text-muted-foreground">{video.year}</span>}
          {video.language && <span className="text-[10px] text-muted-foreground">· {video.language}</span>}
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function VideoCardHorizontal({
  video,
  onClick,
  isFavorite,
  onToggleFavorite,
  isPurchased,
}: VideoCardProps) {
  const lang = useAppStore((s) => s.lang);
  const thumbnail = video.thumbnail || video.img;
  const needsPurchase = video.amount > 0 && !isPurchased;

  return (
    <div
      className="group flex gap-3 p-2 rounded-xl cursor-pointer transition-colors hover:bg-accent/50 active:bg-accent"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="relative w-28 min-w-[112px] aspect-video rounded-lg overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={video.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">🎬</span>
          </div>
        )}
        {video.duration && (
          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded">
            {video.duration}
          </div>
        )}
        {video.amount > 0 && needsPurchase && (
          <div className="absolute top-1 left-1 bg-amber-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <Coins className="w-2.5 h-2.5" />{video.amount}
          </div>
        )}
        {video.quality && (
          <div className="absolute top-1 right-1 bg-emerald-500/90 text-white text-[9px] px-1 py-0.5 rounded font-semibold">
            {video.quality}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <h4 className="text-sm font-medium line-clamp-2 leading-snug">{video.name}</h4>
        <div className="flex items-center gap-2 mt-1">
          {video.year && <span className="text-[10px] text-muted-foreground">{video.year}</span>}
          {video.language && <span className="text-[10px] text-muted-foreground">· {video.language}</span>}
          {video.tmdbId && (
            <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-amber-500" />TMDB
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          {video.tag && (
            <span className="text-[10px] text-muted-foreground">{video.tag}</span>
          )}
          {onToggleFavorite && (
            <button
              className="ml-auto p-1"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              aria-label={isFavorite ? t('videoCard.removeFav', lang) : t('videoCard.addFav', lang)}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
