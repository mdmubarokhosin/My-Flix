'use client';

import { Search, ArrowLeft, Coins, Film, Globe, Tv } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { hapticLight } from '@/lib/telegram';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

export function Header() {
  const { currentPage, goBack, setPage, user, isTelegram, lang, setLang } = useAppStore();

  const showBack = currentPage !== 'home' && !isTelegram;

  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'bn' : 'en';
    setLang(next);
    localStorage.setItem('myflix-lang-manual', '1');
    hapticLight();
  };

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/40 shadow-sm">
      <div className="flex items-center justify-between gap-2 px-3.5 h-14 max-w-lg mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-9 w-9 min-w-[44px] rounded-full hover:bg-muted"
              onClick={() => { goBack(); hapticLight(); }}
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Button>
          )}

          <div
            onClick={() => { setPage('home'); hapticLight(); }}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
              <Film className="w-4 h-4 text-white fill-white/20" />
            </div>
            <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              MyFlix
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setPage('earn'); hapticLight(); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold text-xs transition-all active:scale-95 min-h-[38px]"
          >
            <Coins className="w-3.5 h-3.5 fill-amber-500" />
            <span>{user?.balance ?? 0}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-bold text-[10px] transition-all active:scale-95 min-h-[38px]"
            title={lang === 'en' ? 'বাংলায় পরিবর্তন করুন' : 'Switch to English'}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'বাংলা' : 'EN'}</span>
          </button>

          <button
            onClick={() => { setPage('live-tv'); hapticLight(); }}
            className="relative flex items-center justify-center h-9 w-9 min-w-[44px] rounded-full hover:bg-muted transition-colors"
            aria-label={t('liveTv.title', lang)}
          >
            <Tv className="w-4 h-4 text-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 min-w-[44px] rounded-full hover:bg-muted"
            onClick={() => { setPage('search'); hapticLight(); }}
            aria-label={t('header.search', lang)}
          >
            <Search className="w-4 h-4 text-foreground" />
          </Button>
        </div>
      </div>
    </header>
  );
}
