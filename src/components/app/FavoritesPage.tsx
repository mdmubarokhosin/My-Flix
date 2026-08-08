'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2, Play, Tv, Film } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import type { Video } from '@/lib/types';

export function FavoritesPage() {
  const { favorites, videos, purchases, userId, setFavorites, setCurrentVideo, setPage, lang } = useAppStore();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const favoriteVideos = useMemo(
    () => videos.filter((v) => favorites.includes(String(v.id))),
    [videos, favorites],
  );

  const handleVideoClick = useCallback((video: Video) => {
    if (video.contentType === 'series') {
      setPage('series-detail', { seriesId: video.id });
    } else {
      setCurrentVideo(video);
      setPage('player', { videoId: video.id });
    }
  }, [setCurrentVideo, setPage]);

  const handleRemove = useCallback(async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    setRemovingId(videoId);
    try {
      await fetch('/api/user/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, videoId: String(videoId) }),
      });
      setFavorites(favorites.filter((f) => f !== String(videoId)));
      toast.success(t('profile.removedFav', lang));
    } catch {
      toast.error('Failed to remove');
    } finally {
      setTimeout(() => setRemovingId(null), 300);
    }
  }, [userId, favorites, setFavorites, lang]);

  if (favoriteVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4 ring-1 ring-red-500/20"
        >
          <Heart className="w-10 h-10 text-red-400" />
        </motion.div>
        <h2 className="text-lg font-bold text-foreground mb-1">{t('profile.noFavorites', lang)}</h2>
        <p className="text-sm text-muted-foreground max-w-[260px]">
          {t('liveTv.noFavoritesDesc', lang)}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-2">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-md shadow-red-500/20">
            <Heart className="w-4.5 h-4.5 text-white fill-white/30" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">{t('profile.favTab', lang)}</h2>
            <p className="text-[10px] text-muted-foreground">{favoriteVideos.length} {favoriteVideos.length !== 1 ? t('profile.favoriteCountPlural', lang) : t('profile.favoriteCount', lang)}</p>
          </div>
        </div>
      </div>

      {/* Animated Favorites List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {favoriteVideos.map((video, index) => {
            const isRemoving = removingId === video.id;
            return (
              <motion.div
                key={video.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: isRemoving ? 0 : 1, y: 0, scale: isRemoving ? 0.9 : 1 }}
                exit={{ opacity: 0, x: -200, scale: 0.8 }}
                transition={{
                  layout: { type: 'spring', stiffness: 350, damping: 30 },
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 },
                  x: { duration: 0.3 },
                }}
                className={`group flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/50 hover:border-border transition-colors cursor-pointer active:scale-[0.98] ${isRemoving ? 'pointer-events-none' : ''}`}
                onClick={() => handleVideoClick(video)}
              >
                {/* Thumbnail */}
                <div className="relative w-28 h-[72px] rounded-lg overflow-hidden bg-muted shrink-0">
                  <img
                    src={video.thumbnail || video.img}
                    alt={video.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-foreground fill-foreground ml-0.5" />
                    </div>
                  </div>
                  {video.contentType === 'series' && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-purple-500/90 text-white text-[8px] font-bold flex items-center gap-0.5">
                      <Tv className="w-2.5 h-2.5" />SERIES
                    </div>
                  )}
                  {video.duration && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-medium">
                      {video.duration}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate leading-tight">{video.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {video.year && (
                      <span className="text-[10px] text-muted-foreground">{video.year}</span>
                    )}
                    {video.quality && (
                      <span className="text-[10px] text-emerald-500 font-semibold">{video.quality}</span>
                    )}
                    {video.language && (
                      <span className="text-[10px] text-muted-foreground">{video.language}</span>
                    )}
                  </div>
                  {purchases.includes(String(video.id)) && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-semibold text-amber-600">
                      <Film className="w-2.5 h-2.5" />Purchased
                    </span>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => handleRemove(video.id, e)}
                  className="shrink-0 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-60 group-hover:opacity-100 active:scale-90"
                  aria-label="Remove from favorites"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
