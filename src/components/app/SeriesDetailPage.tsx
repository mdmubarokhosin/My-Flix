'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, Play, Tv, Star, Calendar, Clock, Globe, Heart, Coins, Lock, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import type { Video, Season, Episode } from '@/lib/types';

export function SeriesDetailPage() {
  const lang = useAppStore((s) => s.lang);
  const {
    navigationData,
    videos,
    favorites,
    purchases,
    userId,
    setCurrentVideo,
    setPage,
    setFavorites,
    goBack,
  } = useAppStore();

  const seriesId = navigationData.seriesId as string;
  const series = useMemo(() => videos.find((v) => v.id === seriesId), [videos, seriesId]);
  const [expandedSeason, setExpandedSeason] = useState<number>(1);

  const isFavorite = useCallback(
    (videoId: string) => favorites.includes(String(videoId)),
    [favorites],
  );

  const isPurchased = useCallback(
    (videoId: string) => purchases.includes(String(videoId)),
    [purchases],
  );

  const handleToggleFav = async () => {
    if (!userId || !series) return;
    const vidStr = String(series.id);
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
    } catch { /* ignore */ }
  };

  const handlePlayEpisode = (episode: Episode) => {
    if (!series) return;
    // Create a virtual video object for the episode
    const episodeVideo: Video = {
      ...series,
      name: `${series.name} - S${String(expandedSeason).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')} - ${episode.name}`,
      url: episode.url,
      thumbnail: episode.thumbnail || series.thumbnail || series.img,
      duration: episode.duration || '',
    };
    setCurrentVideo(episodeVideo);
    setPage('player', { videoId: series.id, isEpisode: true });
  };

  if (!series) {
    return (
      <div className="px-4 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="w-full h-[200px] rounded-2xl mb-4" />
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const seriesFav = isFavorite(series.id);
  const seriesPurchased = isPurchased(series.id);
  const needsPurchase = series.amount > 0 && !seriesPurchased;
  const seasons = series.seasons || [];
  const activeSeason = seasons.find((s) => s.seasonNumber === expandedSeason) || seasons[0];
  const synopsis = Array.isArray(series.info) ? series.info.join(' ') : (series.info || '');

  return (
    <div className="pb-24">
      {/* Backdrop Header */}
      <div className="relative">
        <div className="relative w-full aspect-[16/9] overflow-hidden">
          {(series.thumbnail || series.img) ? (
            <img
              src={series.thumbnail || series.img}
              alt={series.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-primary/20 flex items-center justify-center">
              <Tv className="w-16 h-16 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

          {/* Back button */}
          <button
            onClick={goBack}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center border border-white/20 hover:bg-black/70 transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Favorite button */}
          <button
            onClick={handleToggleFav}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 hover:bg-black/70 transition-colors z-10"
          >
            <Heart className={`w-5 h-5 ${seriesFav ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
        </div>

        {/* Series Info Card (overlapping backdrop) */}
        <div className="px-4 -mt-16 relative z-10">
          <div className="flex gap-4">
            {/* Poster */}
            <div className="w-28 min-w-[112px] aspect-[2/3] rounded-xl overflow-hidden border-2 border-background shadow-xl">
              {(series.thumbnail || series.img) ? (
                <img src={series.thumbnail || series.img} alt={series.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Tv className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-4">
              <div className="flex items-start gap-2">
                <Badge className="bg-purple-500 text-white text-[10px] shrink-0 mt-0.5">{t('series.tvSeries', lang)}</Badge>
                {series.quality && (
                  <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/40 shrink-0 mt-0.5">{series.quality}</Badge>
                )}
              </div>
              <h1 className="text-lg font-bold mt-1.5 line-clamp-2 leading-tight">{series.name}</h1>

              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {series.tmdbId && (
                  <span className="text-xs text-amber-500 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500" />
                    TMDB
                  </span>
                )}
                {series.year && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{series.year}
                  </span>
                )}
                {series.language && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="w-3 h-3" />{series.language}
                  </span>
                )}
                {series.totalSeasons && (
                  <span className="text-xs text-muted-foreground">
                    {series.totalSeasons} {t('series.season', lang)}{series.totalSeasons > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Price / Owned status */}
              <div className="mt-2">
                {needsPurchase ? (
                  <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" />{series.amount} {t('series.coins', lang)}
                  </span>
                ) : series.amount > 0 ? (
                  <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                    <Check className="w-3 h-3" />{t('series.purchased', lang)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Synopsis */}
          {synopsis && (
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed line-clamp-3">
              {synopsis}
            </p>
          )}
        </div>
      </div>

      {/* Season Tabs + Episodes */}
      <div className="mt-6 px-4">
        {/* Season Selector */}
        {seasons.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 [::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {seasons.map((season) => (
              <button
                key={season.seasonNumber}
                onClick={() => setExpandedSeason(season.seasonNumber)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  expandedSeason === season.seasonNumber
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {t('series.season', lang)} {season.seasonNumber}
              </button>
            ))}
          </div>
        )}

        {/* Season Title */}
        {activeSeason && (
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold">
              {activeSeason.name || `Season ${activeSeason.seasonNumber}`}
            </h3>
            <span className="text-xs text-muted-foreground">
              {activeSeason.episodes.length} {t('series.episode', lang)}{activeSeason.episodes.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Episodes List */}
        <div className="space-y-2">
          {activeSeason?.episodes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Tv className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t('series.noEpisodes', lang)}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{t('series.noEpisodesDesc', lang)}</p>
            </div>
          )}
          {activeSeason?.episodes.map((episode) => (
            <div
              key={episode.episodeNumber}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all group cursor-pointer"
              onClick={() => handlePlayEpisode(episode)}
            >
              {/* Episode thumbnail */}
              <div className="relative w-32 min-w-[128px] aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
                {episode.thumbnail ? (
                  <img src={episode.thumbnail} alt={episode.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (series.thumbnail || series.img) ? (
                  <img src={series.thumbnail || series.img} alt="" className="w-full h-full object-cover opacity-50" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100">
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                </div>
                {/* Episode number */}
                <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                  E{episode.episodeNumber}
                </div>
                {episode.duration && (
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded">
                    {episode.duration}
                  </div>
                )}
              </div>

              {/* Episode info */}
              <div className="flex-1 min-w-0 py-0.5">
                <h4 className="text-sm font-medium line-clamp-2 leading-snug">{episode.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t('series.episode', lang)} {episode.episodeNumber}
                </p>
                {episode.url && (
                  <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />{t('series.available', lang)}
                  </p>
                )}
              </div>

              {/* Play icon */}
              <div className="shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Play className="w-4 h-4 fill-primary group-hover:fill-primary-foreground ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}