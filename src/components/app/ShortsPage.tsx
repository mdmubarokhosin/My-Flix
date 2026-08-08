'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Share2, Volume2, VolumeX, Play, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import type { ShortVideo } from '@/lib/types';
import { resolveVideoUrl, formatNumber } from '@/lib/video-utils';

const SWIPE_THRESHOLD = 50;

export function ShortsPage() {
  const { setShorts, lang } = useAppStore();
  const [shorts, setLocalShorts] = useState<ShortVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  const touchStartY = useRef<number | null>(null);
  const touchDeltaY = useRef(0);
  const isSwiping = useRef(false);
  
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const shortsLengthRef = useRef(0);

  // Fetch shorts from API with fallback
  useEffect(() => {
    async function fetchShorts() {
      setLoading(true);
      try {
        const res = await fetch('/api/shorts');
        if (res.ok) {
          const data: ShortVideo[] = await res.json();
          if (data.length > 0) {
            setLocalShorts(data);
            setShorts(data);
            shortsLengthRef.current = data.length;
          }
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchShorts();
  }, [setShorts]);

  useEffect(() => {
    shortsLengthRef.current = shorts.length;
  }, [shorts.length]);

  useEffect(() => {
    queueMicrotask(() => {
      setProgress(0);
    });
    if (progressInterval.current) clearInterval(progressInterval.current);

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((idx) => {
            if (idx < shortsLengthRef.current - 1) return idx + 1;
            return idx;
          });
          return 0;
        }
        return prev + 0.5;
      });
    }, 15);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [currentIndex]);

  const toggleLike = useCallback((id: string) => {
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleShare = useCallback(async () => {
    const currentShort = shorts[currentIndex];
    if (!currentShort) return;
    if (navigator.share) {
      try { await navigator.share({ title: currentShort.title, url: currentShort.url }); } catch { /* */ }
    } else {
      await navigator.clipboard.writeText(currentShort.url);
    }
  }, [shorts, currentIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(touchDeltaY.current) > 10) isSwiping.current = true;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current || touchStartY.current === null) {
      touchStartY.current = null;
      return;
    }
    const delta = touchDeltaY.current;
    touchStartY.current = null;
    isSwiping.current = false;
    if (delta < -SWIPE_THRESHOLD && currentIndex < shorts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (delta > SWIPE_THRESHOLD && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, shorts.length]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-black flex items-center justify-center">
        <Skeleton className="w-full h-full min-h-[500px] rounded-none bg-zinc-800" />
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-black flex flex-col items-center justify-center gap-3 text-white/60">
        <Play className="w-12 h-12 opacity-40" />
        <p className="text-lg font-medium">{t('shorts.noShorts', lang)}</p>
        <p className="text-sm">{t('shorts.checkBack', lang)}</p>
      </div>
    );
  }

  const currentShort = shorts[currentIndex];
  const resolved = currentShort ? resolveVideoUrl(currentShort.url) : null;
  const isLiked = currentShort ? !!likedMap[currentShort.id] : false;

  return (
    <div
      className="h-[calc(100vh-4rem)] relative z-0 bg-black overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {currentIndex > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
          <ArrowUp className="w-5 h-5 text-white/30 animate-bounce" />
        </div>
      )}
      {currentIndex < shorts.length - 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <ArrowDown className="w-5 h-5 text-white/30 animate-bounce" />
        </div>
      )}

      <div className="absolute top-3 right-14 z-20 text-white/50 text-xs font-mono">
        {currentIndex + 1}/{shorts.length}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white"
        onClick={() => setIsMuted((prev) => !prev)}
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </Button>

      {currentShort && resolved && (
        <div className="absolute inset-0 w-full h-full" key={currentShort.id}>
          <iframe
            src={resolved.src}
            className="w-full h-full object-cover pointer-events-none"
            allow="autoplay; encrypted-media" allowFullScreen
            title={currentShort.title}
          />

          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

          <div className="absolute bottom-16 left-4 right-16 z-10">
            <h3 className="text-white text-base font-bold leading-tight [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">
              {currentShort.title}
            </h3>
            <p className="text-white/70 text-xs mt-1.5 [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">
              {formatNumber(currentShort.views)} {t('shorts.views', lang)}
            </p>
          </div>

          <div className="absolute right-3 bottom-24 z-10 flex flex-col items-center gap-4">
            <button onClick={() => toggleLike(currentShort.id)} className="flex flex-col items-center gap-1 group" aria-label={isLiked ? t('shorts.unlike', lang) : t('shorts.like', lang)}>
              <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center group-active:scale-90 transition-transform">
                <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              </div>
              <span className="text-white text-[11px] font-medium">{t('shorts.like', lang)}</span>
            </button>
            <button onClick={handleShare} className="flex flex-col items-center gap-1 group" aria-label={t('shorts.share', lang)}>
              <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center group-active:scale-90 transition-transform">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-[11px] font-medium">{t('shorts.share', lang)}</span>
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
            <div className="h-full bg-white transition-[width] duration-100 ease-linear" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
