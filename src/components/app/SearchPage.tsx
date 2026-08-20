'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, TrendingUp, Film, ChevronRight } from 'lucide-react';
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

  const handleCategoryClick = (catName: string) => {
    useAppStore.getState().setSelectedCategory(catName);
    setPage('category-detail', { category: catName });
  };

  const searchResults = useAppStore((s) => s.searchResults);
  const isSearching = useAppStore((s) => s.isSearching);
  const showEmptyState = hasSearched && !isSearching && searchResults.length === 0 && localQuery.trim().length > 0;

  // Category stats
  const categoryStats = useMemo(() => {
    const stats = new Map<string, number>();
    for (const v of videos) {
      if (v.tag) stats.set(v.tag, (stats.get(v.tag) || 0) + 1);
    }
    return stats;
  }, [videos]);

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef} type="text" placeholder={t('search.placeholder', lang)}
          value={localQuery} onChange={(e) => setLocalQuery(e.target.value)}
          className="pl-10 pr-10 h-11 bg-card border-border/60 rounded-xl text-sm"
        />
        {localQuery && (
          <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors">
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>

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

      {showEmptyState && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1">{t('search.noResults', lang)}</h3>
          <p className="text-sm text-muted-foreground max-w-[260px]">{t('search.noResultsDesc', lang)} &ldquo;{localQuery.trim()}&rdquo;. {t('search.tryDifferent', lang)}</p>
        </div>
      )}

      {!localQuery.trim() && !isSearching && (
        <div className="mt-6">
          {/* Categories Grid */}
          {categories.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Film className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold">{t('search.categories', lang)}</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const count = categoryStats.get(cat.name) || 0;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.name)}
                      className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50 hover:bg-accent/50 hover:border-primary/30 transition-all min-h-[52px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Film className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">{count}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trending Tags */}
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold">{t('search.trendingTags', lang)}</h2>
          </div>
          {trendingTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {trendingTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1 text-xs rounded-full" onClick={() => handleTagClick(tag)}>
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('search.noTrendingTags', lang)}</p>
          )}

          {/* Recent Videos */}
          {videos.length > 0 && (
            <div className="mt-6">
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
