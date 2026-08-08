'use client';

import { motion } from 'framer-motion';
import { Home, Search, Coins, Gift, User, KeyRound } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { hapticLight, hapticSelection } from '@/lib/telegram';
import { t } from '@/lib/i18n';
import type { AppPage } from '@/lib/types';

interface NavTab {
  id: AppPage;
  labelKey: string;
  icon: typeof Home;
}

const tabs: NavTab[] = [
  { id: 'home', labelKey: 'nav.home', icon: Home },
  { id: 'search', labelKey: 'nav.categories', icon: Search },
  { id: 'earn', labelKey: 'nav.earn', icon: Coins },
  { id: 'redeem', labelKey: 'nav.gift', icon: Gift },
  { id: 'profile', labelKey: 'nav.profile', icon: User },
];

export function BottomNav() {
  const { currentPage, setPage, isAdmin, isTelegram, lang } = useAppStore();

  const handleNav = (page: AppPage) => { hapticSelection(); setPage(page); };

  const activeIndex = tabs.findIndex(tab => tab.id === currentPage);

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/50 ${isTelegram ? 'pb-[env(safe-area-inset-bottom)]' : 'safe-area-bottom'}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="relative flex items-center justify-around max-w-lg mx-auto h-16">
        {activeIndex >= 0 && (
          <motion.div
            className="absolute top-0 h-0.5 bg-primary rounded-full"
            initial={false}
            animate={{
              left: `${(activeIndex / (tabs.length + (isAdmin ? 1 : 0))) * 100}%`,
              width: `${100 / (tabs.length + (isAdmin ? 1 : 0))}%`,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}

        {tabs.map((tab) => {
          const isActive = currentPage === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 min-w-[44px] min-h-[44px] justify-center ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => handleNav(tab.id)}
              aria-label={tab.labelKey}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary font-semibold' : ''}`}>
                {t(tab.labelKey, lang)}
              </span>
            </button>
          );
        })}

        {isAdmin && (
          <button
            className={`relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 min-w-[44px] min-h-[44px] justify-center ${
              currentPage === 'admin' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleNav('admin')}
            aria-label="Admin"
            aria-current={currentPage === 'admin' ? 'page' : undefined}
          >
            <div className={`relative ${currentPage === 'admin' ? 'scale-110' : ''} transition-transform`}>
              <KeyRound className="w-6 h-6 text-amber-500" strokeWidth={currentPage === 'admin' ? 2.5 : 2} />
              {currentPage === 'admin' && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </div>
            <span className={`text-[10px] font-medium ${currentPage === 'admin' ? 'text-primary font-semibold' : ''}`}>{t('nav.admin', lang)}</span>
          </button>
        )}
      </div>
    </nav>
  );
}
