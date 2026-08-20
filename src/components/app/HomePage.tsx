'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Film, ChevronRight, ChevronLeft, Play, Tv, Star, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { VideoCard } from '@/components/app/VideoCard';
import { useAppStore } from '@/lib/store';
import { database } from '@/lib/firebase-client';
import { ref, onValue, off } from 'firebase/database';
import { matchVideoTag } from '@/lib/video-utils';
import { normalizeUser } from '@/lib/user-utils';
import { DEFAULT_CATEGORIES } from '@/lib/types';
import { t } from '@/lib/i18n';
import type { Video, Category } from '@/lib/types';

const scrollbarHide = '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]';

export function HomePage() {
  const {
    userId,
    videos,
    categories,
    favorites,
    purchases,
    user,
    setPage,
    setCurrentVideo,
    setVideos,
    setCategories,
    setFavorites,
    setPurchases,
    setUser,
    lang,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const listenersAttached = useRef(false);

  // Separate movies and series
  const movies = useMemo(() => videos.filter((v) => v.contentType !== 'series'), [videos]);
  const series = useMemo(() => videos.filter((v) => v.contentType === 'series'), [videos]);

  // Real-time Firebase listeners
  useEffect(() => {
    if (listenersAttached.current) return;
    listenersAttached.current = true;

    const videosRef = ref(database, 'videos');
    const categoriesRef = ref(database, 'categories');
    const settingsRef = ref(database, 'settings');

    const unsubVideos = onValue(videosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const vids: Video[] = Object.entries(data).map(([id, v]: [string, any]) => ({
          id,
          name: v.name || '',
          url: v.url || '',
          img: v.img || v.thumbnail || '',
          thumbnail: v.thumbnail || v.img || '',
          amount: v.amount || 0,
          time: v.time || v.duration || '',
          duration: v.duration || v.time || '',
          tag: v.tag || v.tags || '',
          tags: v.tags || v.tag || '',
          info: Array.isArray(v.info) ? v.info : (v.info ? [v.info] : []),
          createdAt: v.createdAt || 0,
          tmdbId: v.tmdbId,
          year: v.year,
          language: v.language,
          quality: v.quality,
          contentType: v.contentType,
          seasons: v.seasons,
          totalSeasons: v.totalSeasons,
          totalEpisodes: v.totalEpisodes,
          firstAirDate: v.firstAirDate,
        }));
        setVideos(vids.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      } else {
        setVideos([]);
        fetch('/api/seed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).catch(() => {});
      }
      setLoading(false);
    });

    const unsubCategories = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const cats: Category[] = Array.isArray(data)
          ? data.map((c: any) => ({ id: c.id, name: c.name, icon: c.icon }))
          : Object.entries(data).map(([id, c]: [string, any]) => ({ id: c.id || id, name: c.name, icon: c.icon }));
        setCategories(cats);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    });

    onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.categories) {
        const cats: Category[] = Array.isArray(data.categories)
          ? data.categories.map((c: any) => ({ id: c.id, name: c.name, icon: c.icon }))
          : [];
        if (cats.length > 0) setCategories(cats);
      }
      setLoading(false);
    });

    const timer = setTimeout(() => setLoading(false), 2000);

    return () => {
      clearTimeout(timer);
      off(videosRef);
      off(categoriesRef);
      off(settingsRef);
      listenersAttached.current = false;
    };
  }, [setVideos, setCategories]);

  // Real-time listener for user data
  useEffect(() => {
    if (!userId) return;
    const userRef = ref(database, `users/${userId}`);
    const unsub = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userData = normalizeUser(data, userId);
        if (userData) setUser(userData);
        setFavorites(data.favorites || []);
        setPurchases(data.purchased || []);
      }
    });
    return () => off(userRef);
  }, [userId, setUser, setFavorites, setPurchases]);

  // Auto rotate hero billboard banner
  useEffect(() => {
    const heroVideos = movies.slice(0, 5);
    if (heroVideos.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroVideos.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [movies.length]);

  const isFavorite = useCallback(
    (videoId: string) => favorites.includes(String(videoId)),
    [favorites],
  );

  const isPurchased = useCallback(
    (videoId: string) => purchases.includes(String(videoId)),
    [purchases],
  );

  const handleVideoClick = useCallback(
    (video: Video) => {
      if (video.contentType === 'series') {
        setPage('series-detail', { seriesId: video.id });
      } else {
        setCurrentVideo(video);
        setPage('player', { videoId: video.id });
      }
    },
    [setCurrentVideo, setPage],
  );

  const handleToggleFavorite = useCallback(
    async (video: Video) => {
      if (!userId) return;
      const vidStr = String(video.id);
      const alreadyFav = favorites.includes(vidStr);
      try {
        if (alreadyFav) {
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
      } catch (err) {
        console.error('Failed to toggle favorite:', err);
      }
    },
    [userId, favorites, setFavorites],
  );

  const getVideosForCategory = useCallback(
    (categoryName: string): Video[] => {
      return movies.filter((v) => matchVideoTag(v, categoryName));
    },
    [movies],
  );

  // ── Loading Skeleton ──
  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        <Skeleton className="w-full h-[280px] rounded-2xl" />
        <div className="flex gap-2 overflow-hidden px-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-36 rounded-md" />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="min-w-[135px] w-[135px] h-[200px] rounded-xl shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Empty State ──
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20">
          <Film className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">{t('home.empty.title', lang)}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
          {t('home.empty.desc', lang)}
        </p>
      </div>
    );
  }

  // Featured movies for billboard carousel (only movies, not series)
  const featuredVideos = movies.slice(0, 5);
  const heroVideo = featuredVideos[heroIndex] || movies[0] || series[0];
  const heroFav = isFavorite(heroVideo.id);

  return (
    <div className="space-y-8 pb-8">
      {/* ═══════════ 1. HERO SLIDER ═══════════ */}
      {heroVideo && (
        <section className="relative w-full rounded-2xl overflow-hidden bg-card border border-border/60 shadow-lg group">
          <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden bg-muted">
            <img
              src={heroVideo.thumbnail || heroVideo.img}
              alt={heroVideo.name}
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />

            {/* Content overlay */}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  {heroVideo.contentType === 'series' ? (
                    <Badge className="bg-purple-500/90 text-white text-[10px] border-0 gap-1"><Tv className="w-3 h-3" />{t('home.tvSeries', lang)}</Badge>
                  ) : (
                    <Badge className="bg-blue-500/90 text-white text-[10px] border-0 gap-1"><Film className="w-3 h-3" />{t('home.movie', lang)}</Badge>
                  )}
                  {heroVideo.year && (
                    <span className="text-[11px] text-zinc-300 font-medium">{heroVideo.year}</span>
                  )}
                  {heroVideo.quality && (
                    <span className="text-[11px] text-emerald-400 font-semibold">{heroVideo.quality}</span>
                  )}
                </div>
                <h2 className="text-lg sm:text-2xl font-bold text-white truncate drop-shadow-sm">
                  {heroVideo.name}
                </h2>
                <p className="text-xs text-zinc-300 truncate hidden sm:block mt-1 max-w-md">
                  {heroVideo.info?.[0] || t('home.clickToWatch', lang)}
                </p>
              </div>
              <button
                onClick={() => handleVideoClick(heroVideo)}
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{heroVideo.contentType === 'series' ? t('home.watchNow', lang) : t('home.play', lang)}</span>
              </button>
            </div>

            {/* Navigation Arrows */}
            {featuredVideos.length > 1 && (
              <>
                <button
                  onClick={() => setHeroIndex((prev) => (prev === 0 ? featuredVideos.length - 1 : prev - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm border border-white/15 active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setHeroIndex((prev) => (prev + 1) % featuredVideos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm border border-white/15 active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Pagination Dots */}
            {featuredVideos.length > 1 && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                {featuredVideos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHeroIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === heroIndex ? 'w-5 bg-primary' : 'w-2 bg-white/30 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════ 2. TV SERIES SECTION ═══════════ */}
      {series.length > 0 && (
        <ContentSection
          title={t('home.series', lang)}
          subtitle={t('home.series.sub', lang)}
          icon={<Tv className="w-4 h-4" />}
          iconBg="bg-purple-500/10 text-purple-500"
          videos={series}
          isFavorite={isFavorite}
          isPurchased={isPurchased}
          onVideoClick={handleVideoClick}
          onToggleFavorite={handleToggleFavorite}
          onSeeAll={() => {
            useAppStore.getState().setSelectedCategory('TV Series');
            setPage('category-detail', { category: 'TV Series', contentType: 'series' });
          }}
        />
      )}

      {/* ═══════════ 3. CATEGORY ROWS (Movies Only) ═══════════ */}
      {categories.map((cat) => {
        const catVideos = getVideosForCategory(cat.name);
        if (catVideos.length === 0) return null;
        return (
          <ContentSection
            key={cat.id}
            title={cat.name}
            icon={undefined}
            categoryIcon={cat.icon}
            videos={catVideos}
            isFavorite={isFavorite}
            isPurchased={isPurchased}
            onVideoClick={handleVideoClick}
            onToggleFavorite={handleToggleFavorite}
            onSeeAll={() => {
              useAppStore.getState().setSelectedCategory(cat.name);
              setPage('category-detail', { category: cat.name });
            }}
          />
        );
      })}

      {/* ═══════════ 5. ALL MOVIES FALLBACK ═══════════ */}
      {movies.length > 0 && (
        <ContentSection
          title={t('home.allMovies', lang)}
          subtitle={t('home.allMovies.sub', lang)}
          icon={<Film className="w-4 h-4" />}
          iconBg="bg-amber-500/10 text-amber-500"
          videos={movies}
          isFavorite={isFavorite}
          isPurchased={isPurchased}
          onVideoClick={handleVideoClick}
          onToggleFavorite={handleToggleFavorite}
          onSeeAll={() => {
            useAppStore.getState().setSelectedCategory(null);
            setPage('category-detail', { category: '' });
          }}
        />
      )}
    </div>
  );
}

// ── Reusable Content Section ──

interface ContentSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  categoryIcon?: string;
  videos: Video[];
  isFavorite: (id: string) => boolean;
  isPurchased: (id: string) => boolean;
  onVideoClick: (video: Video) => void;
  onToggleFavorite: (video: Video) => void;
  onSeeAll: () => void;
}

function CategoryIconRender({ icon, className = "text-lg text-primary" }: { icon?: string; className?: string }) {
  if (!icon) return <i className={`bi bi-film ${className}`} />;
  if (icon.startsWith('bi ') || icon.startsWith('bi-')) {
    return <i className={`${icon} ${className}`} />;
  }
  if (icon.startsWith('fa') || icon.startsWith('fas ') || icon.startsWith('far ')) {
    return <i className={`${icon} ${className}`} />;
  }
  if (icon.length <= 3) {
    return <span className={className}>{icon}</span>;
  }
  return <i className={`bi bi-${icon.toLowerCase()} ${className}`} />;
}

function ContentSection({
  title, subtitle, icon, iconBg, categoryIcon, videos,
  isFavorite, isPurchased, onVideoClick, onToggleFavorite, onSeeAll,
}: ContentSectionProps) {
  const lang = useAppStore((s) => s.lang);
  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          {icon ? (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg || 'bg-primary/10 text-primary'}`}>
              {icon}
            </div>
          ) : categoryIcon ? (
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <CategoryIconRender icon={categoryIcon} />
            </div>
          ) : null}
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
            {subtitle && <p className="text-[10px] text-muted-foreground leading-tight">{subtitle}</p>}
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-muted/80 text-muted-foreground">
            {videos.length}
          </span>
        </div>
        <button
          onClick={onSeeAll}
          className="group flex items-center gap-0.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors min-h-[44px] px-1"
        >
          {t('home.seeAll', lang)}
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Horizontal scroll */}
      <div className={`flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory ${scrollbarHide}`}>
        {videos.map((video) => (
          <div
            key={video.id}
            className="min-w-[135px] w-[135px] sm:min-w-[155px] sm:w-[155px] snap-start shrink-0"
          >
            <VideoCard
              video={video}
              isFavorite={isFavorite(video.id)}
              isPurchased={isPurchased(video.id)}
              onClick={() => onVideoClick(video)}
              onToggleFavorite={() => onToggleFavorite(video)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
