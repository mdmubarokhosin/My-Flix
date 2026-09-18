'use client';

import { useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoCard } from './VideoCard';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import type { Video } from '@/lib/types';

export function CategoryDetailPage() {
  const lang = useAppStore((s) => s.lang);
  const {
    navigationData,
    videos,
    selectedCategory,
    favorites,
    purchases,
    userId,
    setCurrentVideo,
    setPage,
    setFavorites,
  } = useAppStore();

  const category = selectedCategory || (navigationData.category as string) || '';
  const contentType = (navigationData.contentType as string) || '';

  const filtered = useMemo(() => {
    let result = videos;
    // Filter by contentType if specified
    if (contentType === 'series') {
      result = result.filter((v) => v.contentType === 'series');
    } else if (contentType === 'movie') {
      result = result.filter((v) => v.contentType !== 'series');
    }
    // Filter by category/tag
    if (category) {
      result = result.filter((v) => v.tag === category);
    }
    return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [videos, category, contentType]);

  const isFavorite = useCallback(
    (videoId: string) => favorites.includes(String(videoId)),
    [favorites],
  );

  const isPurchased = useCallback(
    (videoId: string) => purchases.includes(String(videoId)),
    [purchases],
  );

  const handleToggleFav = async (video: Video) => {
    if (!userId) return;
    const vidStr = String(video.id);
    const fav = favorites.includes(vidStr);
    try {
      if (fav) {
        const updated = favorites.filter((f) => f !== vidStr);
        await fetch('/api/user/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, videoId: vidStr }),
        });
        setFavorites(updated);
      } else {
        await fetch('/api/user/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, videoId: vidStr }),
        });
        setFavorites([...favorites, vidStr]);
      }
    } catch {
      /* ignore */
    }
  };

  const handleVideoClick = (video: Video) => {
    if (video.contentType === 'series') {
      setPage('series-detail', { seriesId: video.id });
    } else {
      setCurrentVideo(video);
      setPage('player', { videoId: video.id });
    }
  };

  // Videos not yet loaded
  if (videos.length === 0) {
    return (
      <div className="px-4 pb-24">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-16 ml-auto" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold">{category || t('category.allVideos', lang)}</h2>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} {t('category.videos', lang)}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <span className="text-5xl mb-4">🎬</span>
          <p className="text-lg font-medium">{t('category.noVideos', lang)}</p>
          <p className="text-sm mt-1">{t('category.checkBack', lang)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              isFavorite={isFavorite(video.id)}
              isPurchased={isPurchased(video.id)}
              onClick={() => handleVideoClick(video)}
              onToggleFavorite={() => handleToggleFav(video)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
