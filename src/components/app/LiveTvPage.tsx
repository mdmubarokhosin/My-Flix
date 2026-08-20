'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { hapticSelection, hapticLight } from '@/lib/telegram';
import {
  Tv, Radio, Play, AlertCircle, Loader2, Eye,
  Heart, Search, Globe, Languages, MapPin, Maximize, Minimize,
  RefreshCw, Share2, X, PictureInPicture2,
  WifiOff, Signal, MonitorPlay,
} from 'lucide-react';
import type { TvChannel } from '@/lib/types';

// Format large view counts: 28900 → 28.9K
function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

// Genre filter options derived from actual channel data
const GENRE_FILTERS = ['all', 'sports', 'news', 'entertainment', 'music', 'movies', 'kids', 'documentary', 'religious'];

export function LiveTvPage() {
  const { lang, userId } = useAppStore();
  const [channels, setChannels] = useState<TvChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<TvChannel | null>(null);
  const [streamError, setStreamError] = useState(false);
  const [streamLoading, setStreamLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favChannels, setFavChannels] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedChannelRef = useRef<TvChannel | null>(null);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('myflix-tv-favorites');
      if (saved) setFavChannels(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  // Fetch channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch('/api/tv-channels');
        if (res.ok) {
          const data = await res.json();
          setChannels(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch TV channels:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, []);

  // PiP event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnterPiP = () => setIsPiP(true);
    const onLeavePiP = () => setIsPiP(false);
    video.addEventListener('enterpictureinpicture', onEnterPiP);
    video.addEventListener('leavepictureinpicture', onLeavePiP);
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPiP);
      video.removeEventListener('leavepictureinpicture', onLeavePiP);
    };
  }, [selectedChannel]);

  // Cleanup HLS on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (isFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  // Auto-reconnect on fatal error after 5s
  useEffect(() => {
    if (!streamError || !selectedChannelRef.current) return;
    reconnectTimerRef.current = setTimeout(() => {
      if (selectedChannelRef.current) {
        setIsReconnecting(true);
        setStreamError(false);
        playChannelInternal(selectedChannelRef.current);
        setTimeout(() => setIsReconnecting(false), 3000);
      }
    }, 5000);
    return () => { if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current); };
  }, [streamError]);

  // Filtered channels
  const filteredChannels = useMemo(() => {
    let result = channels;
    if (showFavoritesOnly) {
      result = result.filter(ch => favChannels.has(ch.id));
    }
    if (activeGenre !== 'all') {
      result = result.filter(ch => ch.genre?.toLowerCase() === activeGenre);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(ch =>
        ch.name.toLowerCase().includes(q) ||
        ch.genre?.toLowerCase().includes(q) ||
        ch.language?.toLowerCase().includes(q) ||
        ch.country?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [channels, searchQuery, activeGenre, showFavoritesOnly, favChannels]);

  // Genre tabs derived from available channels
  const genreTabs = useMemo(() => {
    const genres = new Set(channels.map(ch => ch.genre?.toLowerCase()).filter(Boolean));
    const tabs: { key: string; label: string }[] = [{ key: 'all', label: t('liveTv.all', lang) }];
    GENRE_FILTERS.filter(g => g !== 'all').forEach(g => {
      if (genres.has(g)) {
        const labelMap: Record<string, string> = {
          sports: t('liveTv.sports', lang), news: t('liveTv.news', lang),
          entertainment: t('liveTv.entertainment', lang), music: t('liveTv.music', lang),
          movies: t('liveTv.movies', lang), kids: t('liveTv.kids', lang),
          documentary: t('liveTv.documentary', lang), religious: t('liveTv.religious', lang),
        };
        tabs.push({ key: g, label: labelMap[g] || g.charAt(0).toUpperCase() + g.slice(1) });
      }
    });
    return tabs;
  }, [channels, lang]);

  const toggleFavorite = useCallback((channelId: string, e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    hapticLight();
    setFavChannels(prev => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      localStorage.setItem('myflix-tv-favorites', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const playChannelInternal = useCallback(async (channel: TvChannel) => {
    setStreamError(false);
    setStreamLoading(true);

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    await new Promise(resolve => setTimeout(resolve, 100));
    const video = videoRef.current;
    if (!video) { setStreamError(true); setStreamLoading(false); return; }

    try {
      const Hls = (await import('hls.js')).default;
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 90 });
        hls.loadSource(channel.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, (_event: any, data: any) => {
          setStreamLoading(false);
          video.play().catch(() => {});
          // Detect quality from HLS levels
          if (data.levels && data.levels.length > 0) {
            const bestLevel = data.levels.reduce((best: any, lvl: any) => {
              const h = lvl.height || 0;
              return h > (best.height || 0) ? lvl : best;
            }, data.levels[0]);
            if (bestLevel.height >= 1080) setCurrentQuality('FHD');
            else if (bestLevel.height >= 720) setCurrentQuality('HD');
            else if (bestLevel.height >= 480) setCurrentQuality('SD');
            else setCurrentQuality(null);
          }
        });
        hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              // Auto-reconnect on network error
              setIsReconnecting(true);
              setTimeout(() => {
                hls.startLoad();
                setTimeout(() => setIsReconnecting(false), 2000);
              }, 2000);
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              setStreamError(true); setStreamLoading(false);
            }
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = channel.url;
        video.addEventListener('loadedmetadata', () => { setStreamLoading(false); video.play().catch(() => {}); }, { once: true });
        video.addEventListener('error', () => { setStreamError(true); setStreamLoading(false); }, { once: true });
      } else {
        setStreamError(true); setStreamLoading(false);
      }
      // Increment view count
      fetch(`/api/tv-channels/${channel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ views: (channel.views || 0) + 1, adminPassword: '' }),
      }).catch(() => {});
    } catch (err) {
      console.error('HLS init error:', err);
      setStreamError(true); setStreamLoading(false);
    }
  }, []);

  const playChannel = useCallback(async (channel: TvChannel) => {
    hapticSelection();
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    setSelectedChannel(channel);
    selectedChannelRef.current = channel;
    setCurrentQuality(null);
    await playChannelInternal(channel);
  }, [playChannelInternal]);

  const goBackToList = () => {
    hapticLight();
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = ''; }
    if (document.pictureInPictureElement) { document.exitPictureInPicture().catch(() => {}); }
    if (isFullscreen && document.fullscreenElement) { document.exitFullscreen().catch(() => {}); }
    setSelectedChannel(null); selectedChannelRef.current = null;
    setStreamError(false); setIsFullscreen(false); setIsPiP(false); setCurrentQuality(null); setIsReconnecting(false);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  };

  const handleShare = async () => {
    if (!selectedChannel) return;
    hapticLight();
    if (navigator.share) {
      await navigator.share({ title: selectedChannel.name, text: `Watch ${selectedChannel.name} live on MyFlix!` });
    }
  };

  // ====== Player View ======
  if (selectedChannel) {
    return (
      <div className="flex flex-col min-h-0">
        {/* Video Player */}
        <div ref={playerContainerRef} className="relative bg-black aspect-video w-full">
          <video ref={videoRef} className="w-full h-full object-contain" playsInline autoPlay controls preload="none" />

          {/* Reconnecting Overlay */}
          {isReconnecting && !streamError && (
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/90 backdrop-blur-sm text-white text-xs font-semibold shadow-lg z-10">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" />
              {t('liveTv.reconnecting', lang)}
            </div>
          )}

          {/* Quality Badge */}
          {currentQuality && !streamLoading && !streamError && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold z-10">
              <Signal className="w-3 h-3" />
              {currentQuality}
            </div>
          )}

          {streamLoading && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 z-10">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-red-500/30 border-t-red-500 animate-spin" />
                <Radio className="w-6 h-6 text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-white/80 text-sm">{t('liveTv.loadingStream', lang)}</p>
            </div>
          )}

          {streamError && !streamLoading && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 px-6 text-center z-10">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-white font-bold text-base">{t('liveTv.offline', lang)}</p>
              <p className="text-white/60 text-xs max-w-xs">{t('liveTv.errorDesc', lang)}</p>
              <button
                onClick={() => playChannel(selectedChannel)}
                className="mt-2 px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />{t('liveTv.tryAgain', lang)}
              </button>
            </div>
          )}
        </div>

        {/* Channel Info Bar */}
        <div className="px-4 py-3 bg-card border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-muted border-2 border-red-500/30 flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-red-500/10">
              {selectedChannel.logo ? (
                <img src={selectedChannel.logo} alt={selectedChannel.name} className="w-full h-full object-contain p-1.5" />
              ) : (
                <Tv className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold truncate">{selectedChannel.name}</p>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold shrink-0 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />{t('liveTv.live', lang)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {selectedChannel.genre && <span className="text-[10px] text-muted-foreground">{selectedChannel.genre}</span>}
                {selectedChannel.language && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Languages className="w-2.5 h-2.5" />{selectedChannel.language}</span>}
                {selectedChannel.country && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{selectedChannel.country}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => toggleFavorite(selectedChannel.id)} className="p-2 rounded-full hover:bg-muted transition-colors">
                <Heart className={`w-5 h-5 ${favChannels.has(selectedChannel.id) ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
              </button>
              <button onClick={handleShare} className="p-2 rounded-full hover:bg-muted transition-colors">
                <Share2 className="w-5 h-5 text-muted-foreground" />
              </button>
              {typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
                <button onClick={togglePiP} className={`p-2 rounded-full transition-colors ${isPiP ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                  <PictureInPicture2 className="w-5 h-5" />
                </button>
              )}
              <button onClick={toggleFullscreen} className="p-2 rounded-full hover:bg-muted transition-colors">
                {isFullscreen ? <Minimize className="w-5 h-5 text-muted-foreground" /> : <Maximize className="w-5 h-5 text-muted-foreground" />}
              </button>
            </div>
          </div>
        </div>

        {/* Other Channels - Horizontal Scroll */}
        {channels.filter(c => c.id !== selectedChannel.id).length > 0 && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('liveTv.upNext', lang)}</p>
              <button onClick={goBackToList} className="text-[10px] text-primary font-semibold">{t('liveTv.allChannels', lang)}</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
              {channels.filter(c => c.id !== selectedChannel.id).slice(0, 10).map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => playChannel(channel)}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16 group active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full bg-muted border-2 border-border group-hover:border-red-500/50 flex items-center justify-center overflow-hidden transition-colors relative">
                    {channel.logo ? (
                      <img src={channel.logo} alt={channel.name} className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <Tv className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-600 rounded-full border-2 border-card" />
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground text-center line-clamp-1 w-full">{channel.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ====== Channel List View (Grid Design) ======
  return (
    <div className="px-3 pb-4 pt-1">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-red-500/20">
            <Radio className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">{t('liveTv.title', lang)}</h2>
            <p className="text-[10px] text-muted-foreground">{channels.length} {t('liveTv.selectChannel', lang)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowFavoritesOnly(v => !v)}
            className={`p-2 rounded-full transition-colors ${showFavoritesOnly ? 'bg-red-50 dark:bg-red-500/20' : 'hover:bg-muted'}`}
          >
            <Heart className={`w-5 h-5 ${showFavoritesOnly ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('liveTv.searchPlaceholder', lang)}
          className="w-full h-10 pl-9 pr-9 rounded-xl bg-muted/60 border border-border/50 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Genre Tabs */}
      {genreTabs.length > 2 && (
        <div className="flex gap-2 overflow-x-auto mb-4 scrollbar-none pb-0.5">
          {genreTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveGenre(tab.key); hapticLight(); }}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95 ${
                activeGenre === tab.key
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Loading channels...</p>
          </div>
        </div>
      ) : showFavoritesOnly && filteredChannels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-3">
            <Heart className="w-7 h-7 text-red-300 dark:text-red-500/50" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">{t('liveTv.noFavorites', lang)}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t('liveTv.noFavoritesDesc', lang)}</p>
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
            <Tv className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">{t('liveTv.noChannels', lang)}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t('liveTv.noChannelsDesc', lang)}</p>
        </div>
      ) : (
        /* ====== Channel Grid ====== */
        <>
          {/* Active channel count badges */}
          <div className="flex items-center gap-2 mb-3 px-0.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{channels.filter(c => c.active !== false).length} {t('liveTv.live', lang)}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60">
              <MonitorPlay className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">{filteredChannels.length} showing</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {filteredChannels.map((channel) => (
              <button
                key={channel.id}
                className="group flex flex-col items-center text-center active:scale-[0.97] transition-all duration-150"
                onClick={() => playChannel(channel)}
              >
                {/* Circular Logo with Live Badge & Views */}
                <div className="relative w-full aspect-square mb-2">
                  <div className="w-full h-full rounded-full bg-card border-2 border-border/60 group-hover:border-red-500/40 group-active:border-red-500/60 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-lg group-hover:shadow-red-500/5 transition-all duration-200">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-full h-full object-contain p-4"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = 'none';
                          el.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <Tv className={`w-8 h-8 text-muted-foreground/30 ${channel.logo ? 'hidden' : ''}`} />
                  </div>
                  {/* LIVE Badge */}
                  <span className="absolute -top-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[8px] font-bold shadow-md shadow-red-600/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {t('liveTv.live', lang)}
                  </span>
                  {/* Views Count */}
                  {(channel.views || 0) > 0 && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-[8px] font-medium">
                      <Eye className="w-2.5 h-2.5" />
                      {formatViews(channel.views)}
                    </span>
                  )}
                </div>

                {/* Channel Name */}
                <p className="text-[11px] font-bold text-foreground line-clamp-1 leading-tight w-full px-0.5">
                  {channel.name}
                </p>

                {/* Genre Tag */}
                {channel.genre && (
                  <span className="mt-0.5 text-[9px] text-muted-foreground line-clamp-1">
                    {channel.genre}
                  </span>
                )}

                {/* Language & Country Row */}
                {(channel.language || channel.country) && (
                  <div className="flex items-center justify-center gap-1.5 mt-0.5 w-full">
                    {channel.language && (
                      <span className="flex items-center gap-0.5 text-[8px] text-muted-foreground/70">
                        <Languages className="w-2.5 h-2.5" />{channel.language}
                      </span>
                    )}
                    {channel.country && (
                      <span className="flex items-center gap-0.5 text-[8px] text-muted-foreground/70">
                        <MapPin className="w-2.5 h-2.5" />{channel.country}
                      </span>
                    )}
                  </div>
                )}

                {/* Favorite Button */}
                <button
                  onClick={(e) => toggleFavorite(channel.id, e)}
                  className="mt-1 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Heart className={`w-3.5 h-3.5 ${favChannels.has(channel.id) ? 'text-red-500 fill-red-500' : 'text-muted-foreground/30'}`} />
                </button>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
