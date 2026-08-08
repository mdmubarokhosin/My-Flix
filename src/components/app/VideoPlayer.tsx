'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Heart, Share2, Coins, Clock, Tag, ArrowLeft, Lock,
  Star, Calendar, Clock as ClockIcon, Globe, DollarSign,
  Film, Tv, Users, ChevronRight, Play, ExternalLink,
  Image as ImageIcon, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { database } from '@/lib/firebase-client';
import { ref, get, onValue, off, set } from 'firebase/database';

import { useAppStore } from '@/lib/store';
import type { Video, TmdbMovieDetails, TmdbTvDetails, TmdbCastMember, TmdbImage, ImdbDetails } from '@/lib/types';
import { resolveVideoUrl, parseTags } from '@/lib/video-utils';
import { t } from '@/lib/i18n';
import { VideoCardHorizontal } from '@/components/app/VideoCard';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TMDB_IMG = 'https://image.tmdb.org/t/p';

export function VideoPlayer() {
  const {
    currentVideo, setCurrentVideo, videos, navigationData,
    goBack, setPage, setSearchQuery, userId, user, favorites, purchases,
    setFavorites, setPurchases, setUser, lang,
  } = useAppStore();

  const videoId = navigationData.videoId as string | undefined;

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [tmdbData, setTmdbData] = useState<TmdbMovieDetails | TmdbTvDetails | null>(null);
  const [tmdbCast, setTmdbCast] = useState<TmdbCastMember[]>([]);
  const [tmdbBackdrops, setTmdbBackdrops] = useState<TmdbImage[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [imdbData, setImdbData] = useState<ImdbDetails | null>(null);
  const [imdbLoading, setImdbLoading] = useState(false);
  const [imdbError, setImdbError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [fullImgView, setFullImgView] = useState<string | null>(null);
  const [adsNotice, setAdsNotice] = useState<string>(
    t('player.adsNotice', 'en')
  );
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [videoNotFound, setVideoNotFound] = useState(false);
  const [videoRetryKey, setVideoRetryKey] = useState(0);

  // Reset error states when video changes
  useEffect(() => {
    setVideoLoadError(false);
    setVideoNotFound(false);
    setVideoRetryKey(0);
  }, [videoId]);

  // Real-time listener for Ads Notice from Admin Panel / DB
  useEffect(() => {
    const noticeRef = ref(database, 'settings/adsNotice');
    const unsub = onValue(noticeRef, (snapshot) => {
      if (snapshot.exists() && snapshot.val()) {
        setAdsNotice(snapshot.val());
      }
    });
    return () => off(noticeRef);
  }, []);

  const video = useMemo<Video | null>(() => {
    if (currentVideo && String(currentVideo.id) === String(videoId)) return currentVideo;
    return videos.find((v) => String(v.id) === String(videoId)) ?? null;
  }, [currentVideo, videoId, videos]);

  // Fallback direct fetch if video not in state yet
  useEffect(() => {
    if (!video && videoId) {
      let active = true;
      const fetchDirect = async () => {
        try {
          // 1. Try Realtime Database
          const snapshot = await get(ref(database, `videos/${videoId}`));
          if (snapshot.exists() && active) {
            const val = snapshot.val();
            const fetched: Video = {
              id: videoId,
              name: val.name || '',
              url: val.url || '',
              img: val.img || val.thumbnail || '',
              thumbnail: val.thumbnail || val.img || '',
              amount: val.amount || 0,
              time: val.time || val.duration || '',
              duration: val.duration || val.time || '',
              tag: val.tag || val.tags || '',
              tags: val.tags || val.tag || '',
              info: Array.isArray(val.info) ? val.info : (val.info ? [val.info] : []),
              createdAt: val.createdAt || 0,
              tmdbId: val.tmdbId,
              year: val.year,
              language: val.language,
              quality: val.quality,
              contentType: val.contentType || undefined,
              seasons: val.seasons || undefined,
              totalSeasons: val.totalSeasons || undefined,
              totalEpisodes: val.totalEpisodes || undefined,
            };
            setCurrentVideo(fetched);
            return;
          }

          // 2. Try API route
          const res = await fetch(`/api/videos/${videoId}`);
          if (res.ok && active) {
            const val = await res.json();
            if (val && val.id) {
              setCurrentVideo(val);
              return;
            }
          }

          // 3. Video truly not found
          if (active) setVideoNotFound(true);
        } catch {
          if (active) setVideoNotFound(true);
        }
      };
      fetchDirect();
      return () => { active = false; };
    }
  }, [video, videoId, setCurrentVideo]);

  useEffect(() => {
    if (video) {
      if (!currentVideo || String(currentVideo.id) !== String(video.id)) {
        setCurrentVideo(video);
      }
      if (typeof window !== 'undefined') {
        const shareUrl = `${window.location.origin}/?v=${video.id}`;
        window.history.replaceState({ videoId: video.id }, '', shareUrl);
      }
    }
  }, [video, currentVideo, setCurrentVideo]);

  // Clean URL when leaving player
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.location.search.includes('v=')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    };
  }, []);

  const resolvedVideo = useMemo(() => {
    if (!video) return null;
    const resolved = resolveVideoUrl(video.url);
    if (!resolved || !resolved.src) return null;
    return resolved;
  }, [video]);

  const tags = useMemo(() => {
    if (!video) return [];
    return parseTags(video.tags || '');
  }, [video]);

  const videoIdStr = video ? String(video.id) : '';

  const isFavorited = useMemo(() => {
    if (!video || !userId) return false;
    return favorites.includes(videoIdStr);
  }, [favorites, videoIdStr, userId]);

  const isPurchased = useMemo(() => {
    if (!video || !userId) return false;
    const vAmount = Number(video.amount || 0);
    if (vAmount <= 0) return true;

    const rawId = String(video.id).trim();
    if (!rawId) return false;

    // Check store purchases array (string comparison)
    if (purchases.includes(rawId)) return true;

    // Check user.purchased from user profile
    if (user?.purchased && Array.isArray(user.purchased)) {
      if (user.purchased.some((p) => String(p).trim() === rawId)) return true;
    }

    return false;
  }, [purchases, video, userId, user]);

  const needsPurchase = video ? Number(video.amount || 0) > 0 && !isPurchased : false;
  const hasEnoughCoins = user ? (user.balance ?? 0) >= (Number(video?.amount) || 0) : false;

  // Fetch TMDB data
  useEffect(() => {
    if (!video?.tmdbId) {
      queueMicrotask(() => {
        setTmdbData(null); setTmdbCast([]); setTmdbBackdrops([]); setTmdbError(null);
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => { setTmdbLoading(true); setTmdbError(null); });

    const tmdbAction = video.contentType === 'series' ? 'tv_details' : 'details';
    fetch(`/api/tmdb?action=${tmdbAction}&id=${video.tmdbId}`)
      .then(async r => {
        if (!r.ok) {
          const errData = await r.json().catch(() => ({ error: `TMDB error (${r.status})` }));
          throw new Error(errData.error || `Failed to fetch TMDB data (${r.status})`);
        }
        return r.json();
      })
      .then(data => {
        if (cancelled) return;
        if (data.error) {
          setTmdbError(data.error);
        } else {
          setTmdbData(data);
          setTmdbCast(data.credits?.cast?.slice(0, 20) || []);
          setTmdbBackdrops((data.images?.backdrops || []).slice(0, 12));
        }
      })
      .catch(err => {
        if (!cancelled) setTmdbError(err.message);
      })
      .finally(() => { if (!cancelled) setTmdbLoading(false); });

    return () => { cancelled = true; };
  }, [video?.tmdbId]);

  // Fetch IMDB (OMDb) data
  useEffect(() => {
    if (!video?.imdbId) {
      queueMicrotask(() => { setImdbData(null); setImdbError(null); });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => { setImdbLoading(true); setImdbError(null); });

    fetch(`/api/imdb?action=details&id=${encodeURIComponent(video.imdbId)}&plot=full`)
      .then(async r => {
        if (!r.ok) {
          const errData = await r.json().catch(() => ({ error: `IMDB error (${r.status})` }));
          throw new Error(errData.error || `Failed to fetch IMDB data (${r.status})`);
        }
        return r.json();
      })
      .then(data => {
        if (cancelled) return;
        if (data.Response === 'False' || data.error) {
          setImdbError(data.Error || data.error || 'Not found');
        } else {
          setImdbData(data as ImdbDetails);
        }
      })
      .catch(err => {
        if (!cancelled) setImdbError(err.message);
      })
      .finally(() => { if (!cancelled) setImdbLoading(false); });

    return () => { cancelled = true; };
  }, [video?.imdbId]);

  const relatedVideos = useMemo(() => {
    if (!video) return [];
    if (!video.tag && tags.length === 0) return [];
    return videos
      .filter((v) => {
        if (String(v.id) === String(video.id)) return false;
        const vTags = parseTags(v.tags || v.tag || '');
        return vTags.some((t) => tags.includes(t));
      })
      .slice(0, 10);
  }, [video, tags, videos]);

  const handleShare = useCallback(async () => {
    if (!video) return;
    const shareUrl = `${window.location.origin}/?v=${video.id}`;
    
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: video.name,
          text: `Watch ${video.name}`,
          url: shareUrl,
        });
        toast.success('Link shared!');
        return;
      } catch {
        // Fallback to clipboard copy if cancelled or unsupported
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(`Link copied: ${shareUrl}`);
    } catch {
      // Fallback for older browsers / iframe restrictions
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      toast.success(`Link copied: ${shareUrl}`);
    }
  }, [video]);

  const handleToggleFavorite = useCallback(async () => {
    if (!video || !userId || isTogglingFavorite) return;
    setIsTogglingFavorite(true);
    try {
      if (isFavorited) {
        await fetch('/api/user/favorites', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, videoId: videoIdStr }),
        });
        setFavorites(favorites.filter((f) => f !== videoIdStr));
        toast.success('Removed from favorites');
      } else {
        await fetch('/api/user/favorites', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, videoId: videoIdStr }),
        });
        setFavorites([...favorites, videoIdStr]);
        toast.success('Added to favorites');
      }
    } catch { toast.error('Failed to update favorites'); }
    finally { setIsTogglingFavorite(false); }
  }, [video, userId, isTogglingFavorite, isFavorited, favorites, videoIdStr, setFavorites]);

  const handlePurchase = useCallback(async () => {
    if (!video || !userId || !user || isPurchasing) return;
    const amount = Number(video.amount || 0);
    if ((user.balance ?? 0) < amount) { toast.error(t('player.insufficientCoinsToast', lang)); return; }
    setIsPurchasing(true);
    try {
      const res = await fetch('/api/user/purchases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, videoId: video.id }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData && typeof errData === "object" && "error" in errData ? String((errData as Record<string, unknown>).error) : "Failed to unlock");
      }

      const result = await res.json().catch(() => ({}));
      const newBalance = result.newBalance ?? (user.balance ?? 0) - amount;

      // Optimistically update local state — real-time listener will sync the rest
      const updatedPurchased = [...purchases, String(video.id)];
      setUser({ ...user, balance: newBalance, purchased: updatedPurchased });
      setPurchases(updatedPurchased);
      toast.success(`${video.name} successfully unlocked!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unlock');
    } finally { setIsPurchasing(false); }
  }, [video, userId, user, isPurchasing, purchases, setUser, setPurchases]);

  const synopsis = tmdbData?.overview || (imdbData?.Plot && imdbData.Plot !== 'N/A' ? imdbData.Plot : '') || video?.info?.join('\n') || '';
  const tagline = tmdbData?.tagline || '';
  const director = tmdbData?.credits?.crew?.find(c => c.job === 'Director');
  const imdbPoster = imdbData?.Poster && imdbData.Poster !== 'N/A' ? imdbData.Poster : null;
  const backdropUrl = tmdbData?.backdrop_path ? `${TMDB_IMG}/w1280${tmdbData.backdrop_path}` : imdbPoster || (video?.thumbnail || video?.img);
  const posterUrl = tmdbData?.poster_path ? `${TMDB_IMG}/w500${tmdbData.poster_path}` : imdbPoster;

  // Loading / Not Found state
  if (!video || !resolvedVideo) {
    // If we tried to fetch but video doesn't exist
    if (videoId && !video) {
      return (
        <div className="w-full px-4 pt-4 pb-24">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="w-full aspect-video rounded-xl bg-card border border-border flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-bold mb-1">{t('player.videoNotFound', lang)}</h2>
            <p className="text-sm text-muted-foreground max-w-sm">{t('player.videoNotFoundDesc', lang)}</p>
            <Button variant="outline" className="mt-4" onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-1" /> {t('player.goHomePage', lang)}
            </Button>
          </div>
        </div>
      );
    }
    // If video exists but URL is empty/broken
    if (video && !resolvedVideo) {
      return (
        <div className="w-full px-4 pt-4 pb-24">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="w-full aspect-video rounded-xl bg-card border border-border flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3">
              <Film className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold mb-1">{t('player.videoLinkNotFound', lang)}</h2>
            <p className="text-sm text-muted-foreground max-w-sm">{t('player.videoLinkNotFoundFull', lang).replace('{name}', video.name)}</p>
            <Button variant="outline" className="mt-4" onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-1" /> {t('player.goBack', lang)}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="w-full px-4 pt-4 pb-24">
        <div className="flex items-center gap-3 mb-4"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-6 w-40" /></div>
        <Skeleton className="w-full aspect-video rounded-xl" />
        <div className="mt-4 space-y-3"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-20 w-full" /></div>
      </div>
    );
  }

  const thumbnail = video.thumbnail || video.img;

  return (
    <div className="w-full pb-24">
      {/* Backdrop / Video Player or Locked Overlay */}
      <div className="relative rounded-b-2xl overflow-hidden shadow-md">
        {needsPurchase ? (
          <div className="relative w-full aspect-video bg-zinc-950 flex flex-col items-center justify-center p-4 text-center overflow-hidden">
            {/* Blurred Background Poster */}
            {(backdropUrl || thumbnail) && (
              <img
                src={backdropUrl || thumbnail}
                alt={video.name}
                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-md scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/40" />
            <div className="relative z-10 flex flex-col items-center max-w-sm px-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-3 shadow-lg backdrop-blur-md">
                <Lock className="w-8 h-8 text-amber-500 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">{t('player.locked', lang)}</h2>
              <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                {t('player.unlockDesc', lang)} <strong className="text-amber-400 font-bold">{video.amount} Coins</strong>  {t('player.unlockBtn', lang)}। ।
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="h-11 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold gap-2 shadow-lg shadow-amber-500/25 min-h-[44px]"
                    disabled={!hasEnoughCoins || isPurchasing}
                  >
                    <Coins className="h-4 w-4" />
                    {isPurchasing ? 'Unlocking...' : <>{video.amount} Coins  {t('player.unlockBtn', lang)}</>}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialog size="sm">
                  <AlertDialogHeader>
                    <AlertDialogMedia className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                      <Lock className="w-6 h-6" />
                    </AlertDialogMedia>
                    <AlertDialogTitle>{t('player.unlockConfirm', lang)}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('player.unlockDesc', lang)} &ldquo;{video.name}&rdquo; {t('player.spendCoins', lang)} <span className="font-bold text-amber-500">{video.amount} coins</span> {t('player.currentBalance', lang)} {user?.balance ?? 0} coins।
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('player.cancel', lang)}</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurchase} className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
                      {t('player.unlockBtn', lang)}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialog>
              </AlertDialog>
              {!hasEnoughCoins && (
                <p className="text-[11px] text-red-400 mt-2.5 font-medium">
                  ।  {((video?.amount ?? 0) - (user?.balance ?? 0))} ।
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="relative">
            <iframe key={`${resolvedVideo.src}-${videoRetryKey}`} src={resolvedVideo.src} className="w-full aspect-video bg-black"
              allowFullScreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              referrerPolicy="no-referrer-when-downgrade" title={video.name}
              onError={() => setVideoLoadError(true)} />
            {videoLoadError && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-3">
                  <AlertCircle className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-white font-bold mb-1">{t('player.videoLoadFailed', lang)}</h3>
                <p className="text-zinc-400 text-xs max-w-xs mb-3">{t('player.embedFailed', lang)}</p>
                <a href={resolvedVideo.src} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="text-white border-zinc-600 hover:bg-zinc-800">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> {t('player.openDirect', lang)}
                  </Button>
                </a>
              </div>
            )}
          </div>
        )}
        {!needsPurchase && (
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
        )}
      </div>

      {/* Centered Ads Notice Box */}
      <div className="mx-4 mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-center text-center gap-2 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-medium shadow-sm">
        <div className="flex items-center gap-2 shrink-0">
          <i className="bi bi-exclamation-triangle-fill text-amber-500 text-base" />
          <span className="font-bold text-amber-600 dark:text-amber-400">{t('player.specialNotice', lang)}</span>
        </div>
        <p className="leading-relaxed">
          {adsNotice}
        </p>
      </div>

      {/* Content area */}
      <div className="px-4 pt-4 space-y-4">
        {/* Title row with poster */}
        <div className="flex gap-4">
          {posterUrl && (
            <div className="shrink-0 w-[100px] sm:w-[120px] rounded-xl overflow-hidden shadow-lg">
              <img src={posterUrl} alt={video.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h1 className="text-xl font-bold leading-tight flex-1">{video.name}</h1>
              <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={goBack} aria-label="Go back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
            {tagline && <p className="text-sm text-muted-foreground italic mt-0.5">&ldquo;{tagline}&rdquo;</p>}
            {/* TMDB Rating + Meta */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {tmdbData && (
                <>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold">{tmdbData.vote_average?.toFixed(1) ?? 'N/A'}</span>
                    <span className="text-xs text-muted-foreground">({tmdbData.vote_count ?? 0})</span>
                  </div>
                  {(tmdbData as TmdbMovieDetails).release_date ? (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date((tmdbData as TmdbMovieDetails).release_date).getFullYear()}
                    </div>
                  ) : (tmdbData as TmdbTvDetails).first_air_date ? (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date((tmdbData as TmdbTvDetails).first_air_date).getFullYear()}
                    </div>
                  ) : null}
                  {(tmdbData as TmdbMovieDetails).runtime ? (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {Math.floor((tmdbData as TmdbMovieDetails).runtime / 60)}h {(tmdbData as TmdbMovieDetails).runtime % 60}m
                    </div>
                  ) : null}
                  {(tmdbData as TmdbTvDetails).number_of_seasons ? (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Tv className="w-3.5 h-3.5" />
                      {(tmdbData as TmdbTvDetails).number_of_seasons} Season{(tmdbData as TmdbTvDetails).number_of_seasons! > 1 ? 's' : ''}
                    </div>
                  ) : null}
                  {(tmdbData as TmdbMovieDetails).spoken_languages && (tmdbData as TmdbMovieDetails).spoken_languages.length > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Globe className="w-3.5 h-3.5" />
                      {(tmdbData as TmdbMovieDetails).spoken_languages.map(l => l.english_name).join(', ')}
                    </div>
                  )}
                </>
              )}
              {!tmdbData && imdbData && (
                <>
                  {imdbData.imdbRating && imdbData.imdbRating !== 'N/A' && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-semibold">{imdbData.imdbRating}</span>
                      <span className="text-xs text-muted-foreground">({imdbData.imdbVotes || '0'} votes)</span>
                    </div>
                  )}
                  {imdbData.Year && imdbData.Year !== 'N/A' && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {imdbData.Year}
                    </div>
                  )}
                  {imdbData.Runtime && imdbData.Runtime !== 'N/A' && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {imdbData.Runtime}
                    </div>
                  )}
                  {imdbData.totalSeasons && imdbData.totalSeasons !== 'N/A' && parseInt(imdbData.totalSeasons) > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Tv className="w-3.5 h-3.5" />
                      {imdbData.totalSeasons} Season{parseInt(imdbData.totalSeasons) > 1 ? 's' : ''}
                    </div>
                  )}
                  {imdbData.Language && imdbData.Language !== 'N/A' && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Globe className="w-3.5 h-3.5" />
                      {imdbData.Language}
                    </div>
                  )}
                </>
              )}
              {video.duration && !tmdbData && !imdbData && (
                <Badge variant="outline" className="gap-1.5">
                  <Clock className="h-3.5 w-3.5" />{video.duration}
                </Badge>
              )}
            </div>
            {/* Genre badges */}
            {tmdbData?.genres && tmdbData.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tmdbData.genres.map(g => (
                  <Badge key={g.id} variant="secondary" className="text-xs">{g.name}</Badge>
                ))}
              </div>
            )}
            {!tmdbData && imdbData?.Genre && imdbData.Genre !== 'N/A' && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {imdbData.Genre.split(',').map((g, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{g.trim()}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2">
          {video.amount > 0 && (
            <Badge variant="secondary" className="gap-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">
              <Coins className="h-3.5 w-3.5" />{isPurchased ? 'Owned' : `${video.amount} coins`}
            </Badge>
          )}
          {video.tag && (
            <Badge variant="outline" className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setPage('category-detail', { category: video.tag })}>{video.tag}</Badge>
          )}
          {video.quality && (
            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 font-semibold">{video.quality}</Badge>
          )}
          {video.language && (
            <Badge variant="outline" className="gap-1"><Globe className="w-3 h-3" />{video.language}</Badge>
          )}
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleShare} aria-label="Share video">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleToggleFavorite}
              disabled={isTogglingFavorite} aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}>
              <Heart className={`h-4 w-4 transition-colors ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Purchase section */}
        {needsPurchase && (
          <div className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-11 w-11 rounded-full bg-amber-100 dark:bg-amber-900/50">
                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Unlock this video</p>
                <p className="text-xs text-muted-foreground">
                  Your balance: {user?.balance ?? 0} coins
                  {hasEnoughCoins ? (
                    <span className="text-emerald-600 dark:text-emerald-400 ml-1.5">✓ Enough</span>
                  ) : (
                    <span className="text-red-500 ml-1.5">Need {((video?.amount ?? 0) - (user?.balance ?? 0))} more</span>
                  )}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="h-11 px-5 bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-2"
                    disabled={!hasEnoughCoins || isPurchasing}>
                    <Coins className="h-4 w-4" />{isPurchasing ? '…' : video.amount}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialog size="sm">
                  <AlertDialogHeader>
                    <AlertDialogMedia className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                      <Coins className="w-6 h-6" />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to spend{' '}
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{video.amount} coins</span>{' '}
                      on &ldquo;{video.name}&rdquo;. Your balance will go from {user?.balance ?? 0} to{' '}
                      {((user?.balance ?? 0) - video.amount)} coins.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurchase} className="bg-amber-500 hover:bg-amber-600">Confirm Purchase</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialog>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* TMDB Content Tabs */}
        {tmdbData && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-10">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="cast" className="text-xs sm:text-sm">Cast</TabsTrigger>
              <TabsTrigger value="screenshots" className="text-xs sm:text-sm">Images</TabsTrigger>
              <TabsTrigger value="more" className="text-xs sm:text-sm">More</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Synopsis */}
              {synopsis && (
                <div>
                  <h3 className="text-sm font-semibold mb-1.5">Synopsis</h3>
                  <p className={`text-sm text-muted-foreground leading-relaxed ${descriptionExpanded ? '' : 'line-clamp-4'}`}>
                    {synopsis}
                  </p>
                  {synopsis.length > 200 && (
                    <button className="text-xs text-primary font-medium mt-1 min-h-[44px] flex items-center"
                      onClick={() => setDescriptionExpanded(!descriptionExpanded)}>
                      {descriptionExpanded ? 'Show Less' : 'Read More'}
                    </button>
                  )}
                </div>
              )}

              {/* Director */}
              {director && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Director</h3>
                  <div className="flex items-center gap-3">
                    {director.profile_path ? (
                      <img src={`${TMDB_IMG}/w185${director.profile_path}`} alt={director.name}
                        className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"><Users className="w-5 h-5 text-muted-foreground" /></div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{director.name}</p>
                      <p className="text-xs text-muted-foreground">{director.department}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Cast Preview */}
              {tmdbCast.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">Top Cast</h3>
                    <button className="text-xs text-primary flex items-center gap-0.5 min-h-[44px]"
                      onClick={() => setActiveTab('cast')}>See All <ChevronRight className="w-3 h-3" /></button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {tmdbCast.slice(0, 6).map(member => (
                      <div key={member.id} className="flex flex-col items-center gap-1 min-w-[70px]">
                        {member.profile_path ? (
                          <img src={`${TMDB_IMG}/w185${member.profile_path}`} alt={member.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-border" loading="lazy" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                            <Users className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <p className="text-[11px] font-medium text-center leading-tight line-clamp-1 max-w-[70px]">{member.name}</p>
                        <p className="text-[10px] text-muted-foreground text-center line-clamp-1 max-w-[70px]">{member.character}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Production Companies */}
              {(tmdbData as TmdbMovieDetails).production_companies && (tmdbData as TmdbMovieDetails).production_companies.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Production</h3>
                  <div className="flex flex-wrap gap-2">
                    {(tmdbData as TmdbMovieDetails).production_companies!.slice(0, 5).map(c => (
                      <div key={c.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                        {c.logo_path ? (
                          <img src={`${TMDB_IMG}/w92${c.logo_path}`} alt={c.name} className="h-5 w-auto" loading="lazy" />
                        ) : (
                          <Film className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* CAST TAB */}
            <TabsContent value="cast" className="mt-4">
              {tmdbCast.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No cast information available.</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {tmdbCast.map((member, idx) => (
                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <span className="text-xs text-muted-foreground w-5 text-center shrink-0">{idx + 1}</span>
                      {member.profile_path ? (
                        <img src={`${TMDB_IMG}/w185${member.profile_path}`} alt={member.name}
                          className="w-11 h-11 rounded-full object-cover shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">as {member.character}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* SCREENSHOTS TAB */}
            <TabsContent value="screenshots" className="mt-4">
              {tmdbBackdrops.length === 0 && !posterUrl ? (
                <p className="text-sm text-muted-foreground text-center py-8">No screenshots available.</p>
              ) : (
                <div className="space-y-3">
                  {/* Poster */}
                  {posterUrl && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Poster</h4>
                      <div className="flex justify-center">
                        <img src={posterUrl.replace('w500', 'w780')} alt="Poster" className="max-w-[280px] rounded-xl shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setFullImgView(posterUrl.replace('w500', 'original'))} loading="lazy" />
                      </div>
                    </div>
                  )}
                  {/* Backdrops / Screenshots */}
                  {tmdbBackdrops.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Screenshots</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {tmdbBackdrops.map((img, i) => (
                          <div key={i} className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                            onClick={() => setFullImgView(`${TMDB_IMG}/original${img.file_path}`)}>
                            <img src={`${TMDB_IMG}/w780${img.file_path}`} alt={`Screenshot ${i + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* MORE INFO TAB */}
            <TabsContent value="more" className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {(tmdbData as TmdbMovieDetails).release_date && (
                  <InfoItem icon={<Calendar className="w-4 h-4" />} label="Release Date" value={new Date((tmdbData as TmdbMovieDetails).release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
                )}
                {(tmdbData as TmdbTvDetails).first_air_date && !(tmdbData as TmdbMovieDetails).release_date && (
                  <InfoItem icon={<Calendar className="w-4 h-4" />} label="First Air Date" value={new Date((tmdbData as TmdbTvDetails).first_air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
                )}
                {(tmdbData as TmdbMovieDetails).runtime ? (tmdbData as TmdbMovieDetails).runtime > 0 && (
                  <InfoItem icon={<ClockIcon className="w-4 h-4" />} label="Runtime" value={`${Math.floor((tmdbData as TmdbMovieDetails).runtime / 60)}h ${(tmdbData as TmdbMovieDetails).runtime % 60}m (${(tmdbData as TmdbMovieDetails).runtime} min)`} />
                ) : null}
                {(tmdbData as TmdbTvDetails).number_of_episodes ? (
                  <InfoItem icon={<Tv className="w-4 h-4" />} label="Episodes" value={`${(tmdbData as TmdbTvDetails).number_of_episodes} episodes in ${(tmdbData as TmdbTvDetails).number_of_seasons} season${(tmdbData as TmdbTvDetails).number_of_seasons! > 1 ? 's' : ''}`} />
                ) : null}
                <InfoItem icon={<Star className="w-4 h-4" />} label="TMDb Rating" value={`${(tmdbData.vote_average ?? 0).toFixed(1)}/10 (${tmdbData.vote_count ?? 0} votes)`} />
                <InfoItem icon={<DollarSign className="w-4 h-4" />} label="Popularity" value={(tmdbData.popularity ?? 0).toFixed(1)} />
                {(tmdbData as TmdbMovieDetails).budget && (tmdbData as TmdbMovieDetails).budget > 0 && (
                  <InfoItem icon={<DollarSign className="w-4 h-4" />} label="Budget" value={`$${((tmdbData as TmdbMovieDetails).budget / 1000000).toFixed(1)}M`} />
                )}
                {(tmdbData as TmdbMovieDetails).revenue && (tmdbData as TmdbMovieDetails).revenue > 0 && (
                  <InfoItem icon={<DollarSign className="w-4 h-4" />} label="Revenue" value={`$${((tmdbData as TmdbMovieDetails).revenue / 1000000).toFixed(1)}M`} />
                )}
                <InfoItem icon={<Globe className="w-4 h-4" />} label="Original Title" value={(tmdbData as TmdbMovieDetails).original_title || (tmdbData as TmdbTvDetails).original_name || ''} />
                <InfoItem icon={<Tv className="w-4 h-4" />} label="Status" value={tmdbData.status} />
                {(tmdbData as TmdbMovieDetails).imdb_id && (
                  <div className="col-span-2">
                    <a href={`https://www.imdb.com/title/${(tmdbData as TmdbMovieDetails).imdb_id}/`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors min-h-[44px]">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">View on IMDb</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    </a>
                  </div>
                )}
              </div>

              {/* Full crew list (directors, writers, etc.) */}
              {tmdbData.credits?.crew && tmdbData.credits.crew.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Key Crew</h3>
                  <div className="space-y-2">
                    {['Director', 'Writer', 'Screenplay', 'Producer', 'Music', 'Cinematography', 'Editor']
                      .map(job => tmdbData.credits?.crew?.filter(c => c.job === job) || [])
                      .filter(crew => crew.length > 0)
                      .map(crew => (
                        <div key={crew[0].job} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-24 shrink-0">{crew[0].job}</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {crew.slice(0, 3).map(c => (
                              <span key={c.id} className="text-sm">{c.name}{crew.indexOf(c) < Math.min(crew.length, 3) - 1 ? ', ' : ''}</span>
                            ))}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* All genres */}
              {tmdbData.genres && tmdbData.genres.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {tmdbData.genres.map(g => (
                      <Badge key={g.id} variant="secondary" className="text-xs">{g.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* IMDB (OMDb) Content Tabs */}
        {!tmdbData && imdbData && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-10">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="cast" className="text-xs sm:text-sm">Cast & Crew</TabsTrigger>
              <TabsTrigger value="more" className="text-xs sm:text-sm">More</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {synopsis && (
                <div>
                  <h3 className="text-sm font-semibold mb-1.5">Synopsis</h3>
                  <p className={`text-sm text-muted-foreground leading-relaxed ${descriptionExpanded ? '' : 'line-clamp-4'}`}>
                    {synopsis}
                  </p>
                  {synopsis.length > 200 && (
                    <button className="text-xs text-primary font-medium mt-1 min-h-[44px] flex items-center"
                      onClick={() => setDescriptionExpanded(!descriptionExpanded)}>
                      {descriptionExpanded ? 'Show Less' : 'Read More'}
                    </button>
                  )}
                </div>
              )}
              {imdbData.Director && imdbData.Director !== 'N/A' && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Director</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"><Users className="w-5 h-5 text-muted-foreground" /></div>
                    <div>
                      <p className="text-sm font-medium">{imdbData.Director}</p>
                      <p className="text-xs text-muted-foreground">Directing</p>
                    </div>
                  </div>
                </div>
              )}
              {imdbData.Actors && imdbData.Actors !== 'N/A' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">Top Cast</h3>
                    <button className="text-xs text-primary flex items-center gap-0.5 min-h-[44px]"
                      onClick={() => setActiveTab('cast')}>See All <ChevronRight className="w-3 h-3" /></button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {imdbData.Actors.split(',').slice(0, 6).map((actor, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1 min-w-[70px]">
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-[11px] font-medium text-center leading-tight line-clamp-1 max-w-[70px]">{actor.trim()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* CAST & CREW TAB */}
            <TabsContent value="cast" className="mt-4 space-y-4">
              {imdbData.Actors && imdbData.Actors !== 'N/A' ? (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Cast</h3>
                  <div className="space-y-3">
                    {imdbData.Actors.split(',').map((actor, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <span className="text-xs text-muted-foreground w-5 text-center shrink-0">{idx + 1}</span>
                        <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{actor.trim()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No cast information available.</p>
              )}
              {(imdbData.Director || imdbData.Writer) && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Crew</h3>
                  <div className="space-y-2">
                    {imdbData.Director && imdbData.Director !== 'N/A' && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-24 shrink-0">Director</span>
                        <span className="text-sm">{imdbData.Director}</span>
                      </div>
                    )}
                    {imdbData.Writer && imdbData.Writer !== 'N/A' && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-24 shrink-0">Writer</span>
                        <span className="text-sm">{imdbData.Writer}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* MORE INFO TAB */}
            <TabsContent value="more" className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {imdbData.Released && imdbData.Released !== 'N/A' && (
                  <InfoItem icon={<Calendar className="w-4 h-4" />} label="Released" value={imdbData.Released} />
                )}
                {imdbData.Runtime && imdbData.Runtime !== 'N/A' && (
                  <InfoItem icon={<ClockIcon className="w-4 h-4" />} label="Runtime" value={imdbData.Runtime} />
                )}
                {imdbData.imdbRating && imdbData.imdbRating !== 'N/A' && (
                  <InfoItem icon={<Star className="w-4 h-4" />} label="IMDb Rating" value={`${imdbData.imdbRating}/10 (${imdbData.imdbVotes} votes)`} />
                )}
                {imdbData.Rated && imdbData.Rated !== 'N/A' && (
                  <InfoItem icon={<Film className="w-4 h-4" />} label="Rated" value={imdbData.Rated} />
                )}
                {imdbData.Country && imdbData.Country !== 'N/A' && (
                  <InfoItem icon={<Globe className="w-4 h-4" />} label="Country" value={imdbData.Country} />
                )}
                {imdbData.Language && imdbData.Language !== 'N/A' && (
                  <InfoItem icon={<Globe className="w-4 h-4" />} label="Language" value={imdbData.Language} />
                )}
                {imdbData.BoxOffice && imdbData.BoxOffice !== 'N/A' && (
                  <InfoItem icon={<DollarSign className="w-4 h-4" />} label="Box Office" value={imdbData.BoxOffice} />
                )}
                {imdbData.Awards && imdbData.Awards !== 'N/A' && (
                  <div className="col-span-2">
                    <InfoItem icon={<Star className="w-4 h-4" />} label="Awards" value={imdbData.Awards} />
                  </div>
                )}
                {imdbData.Production && imdbData.Production !== 'N/A' && (
                  <InfoItem icon={<Film className="w-4 h-4" />} label="Production" value={imdbData.Production} />
                )}
                {imdbData.imdbID && (
                  <div className="col-span-2">
                    <a href={`https://www.imdb.com/title/${imdbData.imdbID}/`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors min-h-[44px]">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">View on IMDb</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    </a>
                  </div>
                )}
              </div>
              {imdbData.Genre && imdbData.Genre !== 'N/A' && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {imdbData.Genre.split(',').map((g, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{g.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Fallback info (when no TMDB or IMDB) */}
        {!tmdbData && !imdbData && (
          <>
            {video.info && video.info.length > 0 && (
              <div>
                <p className={`text-sm text-muted-foreground leading-relaxed ${descriptionExpanded ? '' : 'line-clamp-3'}`}>
                  {video.info.join('\n')}
                </p>
                <button className="text-xs text-primary font-medium mt-1 min-h-[44px] flex items-center"
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}>
                  {descriptionExpanded ? 'Show Less' : 'Read More'}
                </button>
              </div>
            )}
            {tmdbLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Loading movie details...
              </div>
            )}
            {imdbLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Loading IMDb details...
              </div>
            )}
            {tmdbError && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">{tmdbError}</p>
            )}
            {imdbError && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">{imdbError}</p>
            )}
          </>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Tag className="h-4 w-4 text-muted-foreground" />Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary"
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => { setSearchQuery(tag); setPage('search'); }}>{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Related Videos */}
        {relatedVideos.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Related Videos</h2>
            <ScrollArea className="w-full -mx-4 px-4">
              <div className="flex gap-2 pb-2" style={{ minWidth: 'max-content' }}>
                {relatedVideos.map((rv) => (
                  <div key={rv.id} className="w-[280px] sm:w-[320px] shrink-0">
                    <VideoCardHorizontal
                      video={rv}
                      onClick={() => { setCurrentVideo(rv); setPage('player', { videoId: rv.id }); setDescriptionExpanded(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      isFavorite={favorites.includes(String(rv.id))}
                      onToggleFavorite={async () => {
                        const rvStr = String(rv.id);
                        const isFav = favorites.includes(rvStr);
                        try {
                          if (isFav) {
                            await fetch('/api/user/favorites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, videoId: rvStr }) });
                            setFavorites(favorites.filter((f) => f !== rvStr));
                            toast.success('Removed from favorites');
                          } else {
                            await fetch('/api/user/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, videoId: rvStr }) });
                            setFavorites([...favorites, rvStr]);
                            toast.success('Added to favorites');
                          }
                        } catch { toast.error('Failed to update favorites'); }
                      }}
                      isPurchased={purchases.includes(String(rv.id))}
                    />
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </section>
        )}
      </div>

      {/* Full-screen Image Viewer */}
      {fullImgView && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullImgView(null)}>
          <img src={fullImgView} alt="Full view" className="max-w-full max-h-full object-contain rounded-lg" />
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
            onClick={() => setFullImgView(null)} aria-label="Close">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ── Info Item Component ──
function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}<span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
