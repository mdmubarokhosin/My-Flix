'use client';

import { useMemo, useCallback } from 'react';
import { Film, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { matchVideoTag } from '@/lib/video-utils';
import { t } from '@/lib/i18n';

/**
 * Standalone Categories page — separate from Search.
 *
 * Lists every category as a grid of centered cards. Clicking a category
 * navigates to the category-detail page (which shows all videos matching
 * that tag).
 */
export function CategoriesPage() {
  const lang = useAppStore((s) => s.lang);
  const categories = useAppStore((s) => s.categories);
  const videos = useAppStore((s) => s.videos);
  const setPage = useAppStore((s) => s.setPage);
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory);

  // Compute video count per category.
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of videos) {
      for (const cat of categories) {
        if (matchVideoTag(v, cat.name)) {
          map.set(cat.name, (map.get(cat.name) || 0) + 1);
        }
      }
    }
    return map;
  }, [videos, categories]);

  const handleCategoryClick = useCallback((catName: string) => {
    setSelectedCategory(catName);
    setPage('category-detail', { category: catName });
  }, [setPage, setSelectedCategory]);

  // Localized strings
  const noCategoriesTitle = lang === 'bn' ? 'কোন ক্যাটাগরি নেই' : 'No categories yet';
  const noCategoriesDesc = lang === 'bn' ? 'অ্যাডমিন প্যানেল থেকে যোগ করুন' : 'Add some from the admin panel';
  const videoLabel = lang === 'bn' ? 'ভিডিও' : (count: number) => count === 1 ? 'video' : 'videos';

  return (
    <div className="px-4 pb-6 pt-2">
      {/* Header — centered */}
      <div className="flex flex-col items-center justify-center mb-6 mt-2">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
          <Film className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-center">{t('search.categories', lang)}</h1>
        {categories.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {categories.length} {lang === 'bn' ? 'টি ক্যাটাগরি' : 'categories'}
          </p>
        )}
      </div>

      {/* Categories Grid — all content centered */}
      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <Film className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{noCategoriesTitle}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{noCategoriesDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const count = categoryStats.get(cat.name) || 0;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.name)}
                className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-primary/40 hover:shadow-lg transition-all duration-200 active:scale-[0.98] aspect-square flex flex-col items-center justify-center p-3 text-center"
              >
                {/* Icon — centered */}
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors mb-2">
                  {cat.icon ? (
                    <i className={`${cat.icon} text-xl text-primary`} aria-hidden="true" />
                  ) : (
                    <Film className="w-5 h-5 text-primary" />
                  )}
                </div>

                {/* Name — centered */}
                <p className="text-sm font-bold text-center truncate w-full">{cat.name}</p>

                {/* Count — centered */}
                <p className="text-[11px] text-muted-foreground mt-0.5 text-center">
                  {count} {typeof videoLabel === 'function' ? videoLabel(count) : videoLabel}
                </p>

                {/* Chevron on hover */}
                <ChevronRight className="w-4 h-4 text-primary absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Decorative gradient */}
                <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
