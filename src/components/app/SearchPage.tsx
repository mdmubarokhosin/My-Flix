'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, TrendingUp, ChevronRight, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { VideoCard } from '@/components/app/VideoCard';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { parseTags } from '@/lib/video-utils';

export function SearchPage() {
  const lang = useAppStore((s) => s.lang);
  const videos = useAppStore((s) => s.videos);
  const categories = useAppStore((s) => s.categories);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const setSearchResults = useAppStore((s) => s.setSearchResults);
  const setIsSearching = useAppStore((s) => s.setIsSearching);
  const setCurrentVideo = useAppStore((s) => s.setCurrentVideo);
  const setPage = useAppStore((s) => s.setPage);

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const trendingTags = useMemo(() => {
    const tagCount = new Map<string, number>();
    for (const video of videos) {
      const tags = parseTags(video.tags || '');
      for (const tag of tags) { tagCount.set(tag, (tagCount.get(tag) || 0) + 1); }
    }
    return Array.from(tagCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([tag]) => tag);
  }, [videos]);

  const performSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim().toLowerCase();
      setSearchQuery(query.trim());
      if (!trimmed) { setSearchResults([]); setIsSearching(false); setHasSearched(false); return; }
      setIsSearching(true); setHasSearched(true);
      const results = videos.filter((v) => {
        const nameMatch = v.name.toLowerCase().includes(trimmed);
        const tagMatch = v.tag?.toLowerCase().includes(trimmed);
        const tagsStr = (v.tags || '').toLowerCase();
        const tagsMatch = tagsStr.includes(trimmed);
        const yearMatch = (v.year || '').includes(trimmed);
        const langMatch = (v.language || '').toLowerCase().includes(trimmed);
        return nameMatch || tagMatch || tagsMatch || yearMatch || langMatch;
      });
      setSearchResults(results); setIsSearching(false);
    },
    [videos, setSearchQuery, setSearchResults, setIsSearching],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(localQuery), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [localQuery, performSearch]);

  const handleTagClick = (tag: string) => setLocalQuery(tag);

  const handleVideoClick = (video: (typeof videos)[number]) => {
    if (video.contentType === 'series') {
      setPage('series-detail', { seriesId: video.id });
    } else {
      setCurrentVideo(video);
      setPage('player', { videoId: video.id });
    }
  };

  const handleClear = () => {
    setLocalQuery(''); setSearchQuery(''); setSearchResults([]);
    setHasSearched(false); inputRef.current?.focus();
  };

  const searchResults = useAppStore((s) => s.searchResults);
  const isSearching = useAppStore((s) => s.isSearching);
  const showEmptyState = hasSearched && !isSearching && searchResults.length === 0 && localQuery.trim().length > 0;

  return (
    <div className="px-4 pb-6 pt-2">
      {/* Premium search bar */}
      <div className="relative mb-4">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Search className="w-4 h-4 text-primary" />
        </div>
        <Input
          ref={inputRef}
          type="text"
          placeholder={t('search.placeholder', lang)}
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="pl-14 pr-12 h-14 bg-card border-border/60 rounded-2xl text-sm font-medium shadow-sm focus:border-primary/40 focus:shadow-md transition-all"
        />
        {localQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-all active:scale-90"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Loading skeletons */}
      {isSearching && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* Search results */}
      {!isSearching && hasSearched && searchResults.length > 0 && (
        <div className="mt-5">
          <p className="text-xs text-muted-foreground mb-3">
            {searchResults.length} {searchResults.length !== 1 ? t('search.resultPlural', lang) : t('search.result', lang)} {t('search.results', lang)} &ldquo;{localQuery.trim()}&rdquo;
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {searchResults.map((video) => (
              <VideoCard key={video.id} video={video} onClick={() => handleVideoClick(video)} />
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {showEmptyState && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1">{t('search.noResults', lang)}</h3>
          <p className="text-sm text-muted-foreground max-w-[260px]">
            {t('search.noResultsDesc', lang)} &ldquo;{localQuery.trim()}&rdquo;. {t('search.tryDifferent', lang)}
          </p>
        </div>
      )}

      {/* Default state — no query */}
      {!localQuery.trim() && !isSearching && (
        <div className="mt-2 space-y-6">
          {/* Browse Categories link */}
          {categories.length > 0 && (
            <button
              onClick={() => setPage('categories')}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 border border-primary/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">{t('search.categories', lang)}</p>
                  <p className="text-[11px] text-muted-foreground">{categories.length} {lang === 'bn' ? 'টি ক্যাটাগরি' : 'categories'}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </button>
          )}

          {/* Trending Tags */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <h2 className="text-sm font-semibold">{t('search.trendingTags', lang)}</h2>
            </div>
            {trendingTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {trendingTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1.5 text-xs rounded-full"
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('search.noTrendingTags', lang)}</p>
            )}
          </div>

          {/* Recent Videos */}
          {videos.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3">{t('search.recentlyAdded', lang)}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {videos.slice(0, 6).map((video) => (
                  <VideoCard key={video.id} video={video} onClick={() => handleVideoClick(video)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
