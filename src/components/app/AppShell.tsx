'use client';

import { useEffect, useCallback, useState, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { database } from '@/lib/firebase-client';
import { ref, onValue, off } from 'firebase/database';
import type { AppPage } from '@/lib/types';
import type { Lang } from '@/lib/i18n';
import { normalizeUserData } from '@/lib/user-utils';

import {
  isTelegramApp,
  getTelegramWebApp,
  getTelegramUser,
  getStartParam,
  initTelegramApp,
  hideMainButton,
  setTelegramThemeCallback,
} from '@/lib/telegram';

import { Header } from '@/components/app/Header';
import { BottomNav } from '@/components/app/BottomNav';
import { HomePage } from '@/components/app/HomePage';
import { VideoPlayer } from '@/components/app/VideoPlayer';
import { SearchPage } from '@/components/app/SearchPage';
import { ShortsPage } from '@/components/app/ShortsPage';
import { EarnPage } from '@/components/app/EarnPage';
import { RedeemPage } from '@/components/app/RedeemPage';
import { ProfilePage } from '@/components/app/ProfilePage';
import { FavoritesPage } from '@/components/app/FavoritesPage';
import { AdminPanel } from '@/components/app/AdminPanel';
import { CategoryDetailPage } from '@/components/app/CategoryDetailPage';
import { SeriesDetailPage } from '@/components/app/SeriesDetailPage';
import { LiveTvPage } from '@/components/app/LiveTvPage';

import { Bell, Megaphone } from 'lucide-react';
import {
  AlertDialog, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogMedia,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ─── Notification Modal ───────────────────────────────────────
function NotificationModal() {
  const { userId, lang } = useAppStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const currentNotifIdRef = useRef<string | null>(null);

  useEffect(() => { openRef.current = open; }, [open]);

  useEffect(() => {
    const notifRef = ref(database, 'notifications');
    const unsub = onValue(notifRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setNotifications([]); setOpen(false); currentNotifIdRef.current = null; return; }
      const all: any[] = Object.entries(data).map(([id, n]: [string, any]) => ({ id, ...n }));
      if (currentNotifIdRef.current && openRef.current) {
        const stillExists = all.some((n) => n.id === currentNotifIdRef.current);
        if (!stillExists) { setOpen(false); currentNotifIdRef.current = null; const relevant = all.filter((n) => !n.targetUserId || (userId && n.targetUserId === userId)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); setNotifications(relevant); return; }
      }
      const relevant = all.filter((n) => !n.targetUserId || (userId && n.targetUserId === userId)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotifications(relevant);
      const dismissed: string[] = JSON.parse(localStorage.getItem('myflix-dismissed-notifs') || '[]');
      const unseen = relevant.filter((n) => !dismissed.includes(n.id));
      if (unseen.length > 0) { setCurrentIdx(0); if (!openRef.current) setTimeout(() => setOpen(true), 1500); }
      else { setOpen(false); currentNotifIdRef.current = null; }
    });
    return () => off(notifRef);
  }, [userId]);

  useEffect(() => { const current = notifications[currentIdx]; if (open && current) currentNotifIdRef.current = current.id; }, [notifications, currentIdx, open]);

  const current = notifications[currentIdx];

  const handleDismiss = () => {
    if (!current) { setOpen(false); return; }
    const dismissed: string[] = JSON.parse(localStorage.getItem('myflix-dismissed-notifs') || '[]');
    if (!dismissed.includes(current.id)) { dismissed.push(current.id); localStorage.setItem('myflix-dismissed-notifs', JSON.stringify(dismissed)); }
    const nextDismissed: string[] = JSON.parse(localStorage.getItem('myflix-dismissed-notifs') || '[]');
    const nextUnseen = notifications.filter((n) => !nextDismissed.includes(n.id));
    if (nextUnseen.length > 0) { setCurrentIdx(notifications.indexOf(nextUnseen[0])); } else { setOpen(false); currentNotifIdRef.current = null; }
  };

  const handleVisit = () => { if (!current?.link) return; window.open(current.link, '_blank', 'noopener,noreferrer'); handleDismiss(); };

  if (!current) return null;
  const isAlert = current.type !== 'action';

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <AlertDialog size="sm">
        <AlertDialogHeader className="text-center">
          <AlertDialogMedia className={isAlert ? 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive' : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'}>
            {isAlert ? <Bell className="w-6 h-6" /> : <Megaphone className="w-6 h-6" />}
          </AlertDialogMedia>
          <div className="flex items-center justify-center gap-2">
            <AlertDialogTitle className="text-base">{current.title}</AlertDialogTitle>
            <Badge variant={isAlert ? 'destructive' : 'default'} className="text-[10px] px-1.5">{isAlert ? 'Alert' : 'Action'}</Badge>
          </div>
          <AlertDialogDescription className="text-xs text-muted-foreground">
            {new Date(current.createdAt).toLocaleString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="text-center">
          <AlertDialogDescription className="text-sm leading-relaxed whitespace-pre-line">{current.message}</AlertDialogDescription>
          {current.type === 'action' && current.link && (<><Separator className="my-3" /><p className="text-xs text-muted-foreground truncate">{current.link}</p></>)}
        </div>
        <AlertDialogFooter className="sm:justify-center">
          {isAlert ? (
            <AlertDialogAction onClick={handleDismiss}>{t('app.okUnderstood', lang)}</AlertDialogAction>
          ) : (
            <><AlertDialogCancel onClick={handleDismiss}>{t('app.cancel', lang)}</AlertDialogCancel><AlertDialogAction onClick={handleVisit}>{t('app.visit', lang)}</AlertDialogAction></>
          )}
        </AlertDialogFooter>
      </AlertDialog>
    </AlertDialog>
  );
}

// ─── App Shell ───────────────────────────────────────────────
interface AppShellProps { forcePage?: AppPage; }

export default function AppShell({ forcePage }: AppShellProps) {
  const {
    currentPage, userId, user, setUserId, setUser, setPurchases, setFavorites, setPage,
    isTelegram, tgUser, setIsTelegram, setTgUser, setTelegramReady, telegramReady,
    goBack, pageHistory, lang, setLang, settings,
  } = useAppStore();

  const backBtnHandlerRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    if (forcePage && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hasVideo = urlParams.has('v');
      const hasPayment = urlParams.has('payment');
      if (!hasVideo && !hasPayment) { setPage(forcePage); }
    }
  }, [forcePage, setPage]);

  // ─── Telegram BackButton sync with navigation ───
  useEffect(() => {
    if (!isTelegram) return;
    const tg = getTelegramWebApp();
    if (!tg) return;
    const showBack = currentPage !== 'home';
    if (showBack) { tg.BackButton.show(); } else { tg.BackButton.hide(); }
  }, [currentPage, isTelegram]);

  // ─── Set up Telegram BackButton click handler ───
  useEffect(() => {
    if (!isTelegram) return;
    const tg = getTelegramWebApp();
    if (!tg) return;
    const handler = () => goBack();
    backBtnHandlerRef.current = handler;
    tg.BackButton.onClick(handler);
    return () => { try { tg.BackButton.offClick(handler); } catch {} };
  }, [isTelegram, goBack]);

  // ─── Telegram MainButton cleanup ───
  useEffect(() => { return () => { hideMainButton(); }; }, []);
  // ─── Load default language from settings ───
  useEffect(() => {
    if (!settings?.defaultLanguage) return;
    const adminDefault: Lang = settings.defaultLanguage === 'bn' ? 'bn' : 'en';
    // Only apply admin default if user has NOT manually toggled language
    const manuallySet = localStorage.getItem('myflix-lang-manual');
    if (!manuallySet && lang !== adminDefault) {
      setLang(adminDefault);
    }
  }, [settings?.defaultLanguage]);


  // ─── Bridge Telegram theme -> next-themes ───
  const { setTheme: setNextTheme } = useTheme();
  useEffect(() => {
    if (!isTelegram) return;
    setTelegramThemeCallback((scheme) => { setNextTheme(scheme); });
  }, [isTelegram, setNextTheme]);

  // ─── Firebase user data listener ───
  useEffect(() => {
    if (!userId) return;
    const userRef = ref(database, `users/${userId}`);
    const unsub = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const normalizedUser = normalizeUserData(data, userId);
        if (normalizedUser) setUser(normalizedUser);
        if (Array.isArray(data.purchased)) { setPurchases(data.purchased.map((p: string | number) => String(p))); }
        if (Array.isArray(data.favorites)) { setFavorites(data.favorites.map((f: string | number) => String(f))); }
      }
    });
    return () => off(userRef);
  }, [userId, setUser, setPurchases, setFavorites]);

  // ─── Auto-seed on first visit ───
  useEffect(() => {
    const seeded = localStorage.getItem('myflix-seeded');
    if (!seeded) {
      fetch('/api/seed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        .then((r) => r.json())
        .then(() => localStorage.setItem('myflix-seeded', 'true'))
        .catch(() => {});
    }
  }, []);

  // ─── Handle URL params ───
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    if (videoId) { setPage('player', { videoId }); }
    const paymentStatus = urlParams.get('payment');
    if (paymentStatus) {
      if (paymentStatus === 'success') { toast.success(t('app.paymentSuccess', lang)); setPage('earn'); }
      else if (paymentStatus === 'cancelled') { toast.error(t('app.paymentCancelled', lang)); }
      else if (paymentStatus === 'pending') { toast.info(t('app.paymentPending', lang)); }
      else { toast.error(t('app.paymentFailed', lang)); }
      window.history.replaceState({}, '', '/');
    }
  }, [setPage]);

  function generateNumericUserId(): string {
    const min = 1000000000; const max = 9999999999;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  // ─── Telegram initialization ───
  const initTelegramUser = useCallback(async () => {
    const detected = isTelegramApp();
    setIsTelegram(detected);

    if (detected) {
      const tgUser = getTelegramUser();
      if (tgUser) {
        setTgUser(tgUser);
        const tgUserId = String(tgUser.id);
        setUserId(tgUserId);
        setTelegramReady(true);
        initTelegramApp();

        try {
          const tg = getTelegramWebApp();
          const res = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              initData: tg?.initData || '',
              user: { id: tgUser.id, first_name: tgUser.first_name, last_name: tgUser.last_name, username: tgUser.username, photo_url: tgUser.photo_url, is_premium: tgUser.is_premium, language_code: tgUser.language_code },
            }),
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);

            // If no photo URL from Telegram initData, fetch via Bot API
            if (!userData.photoUrl) {
              fetch('/api/telegram/photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: tgUserId, telegramId: tgUser.id }),
              })
              .then(photoRes => {
                if (photoRes.ok) return photoRes.json();
                return null;
              })
              .then(photoData => {
                if (photoData?.photoUrl) {
                  // Update the store with the new photo URL
                  const currentUser = useAppStore.getState().user;
                  if (currentUser) {
                    setUser({ ...currentUser, photoUrl: photoData.photoUrl });
                  }
                }
              })
              .catch(() => {});
            }
          }
        } catch (err) { console.error('Telegram auth API error:', err); }

        const startParam = getStartParam();
        if (startParam) {
          const videoMatch = startParam.match(/(?:video_)?(\d+)/);
          if (videoMatch) { setPage('player', { videoId: videoMatch[1] }); }
        }
        return;
      }
    }

    // Browser fallback
    const timer = setTimeout(() => {
      if (!useAppStore.getState().telegramReady) { initBrowserUser(); }
    }, 300);
    const safetyNet = setTimeout(() => {
      if (!useAppStore.getState().userId) { initBrowserUser(); }
    }, 2000);
    return () => { clearTimeout(timer); clearTimeout(safetyNet); };
  }, []);

  const initBrowserUser = useCallback(async () => {
    if (useAppStore.getState().userId) return;
    let storedId = localStorage.getItem('myflix-user-id');
    if (!storedId) { storedId = generateNumericUserId(); localStorage.setItem('myflix-user-id', storedId); }
    setUserId(storedId);
    try {
      const res = await fetch('/api/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: storedId }) });
      if (res.ok) { const user = await res.json(); setUser(user); }
    } catch { }
  }, [setUserId, setUser]);

  useEffect(() => { initTelegramUser(); }, [initTelegramUser]);

  const pageVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'player': return <VideoPlayer />;
      case 'search': return <SearchPage />;
      case 'shorts': return <ShortsPage />;
      case 'earn': return <EarnPage />;
      case 'redeem': return <RedeemPage />;
      case 'profile': return <ProfilePage />;
      case 'admin': return <AdminPanel />;
      case 'category-detail': return <CategoryDetailPage />;
      case 'series-detail': return <SeriesDetailPage />;
      case 'favorites': return <FavoritesPage />;
      case 'live-tv': return <LiveTvPage />;
      default: return <HomePage />;
    }
  };

  const isShorts = currentPage === 'shorts';
  const hideBottomNav = currentPage === 'player';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {user?.isBanned && currentPage !== 'admin' ? (
        <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="h-20 w-20 rounded-full bg-destructive/10 border-2 border-destructive/50 flex items-center justify-center mb-4">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{t('app.banned', lang)}</h1>
          <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
            {t('app.bannedDesc', lang)}
          </p>
          <div className="p-3 bg-muted rounded-lg text-xs font-mono text-muted-foreground">
            {t('app.userId', lang)} {userId}
          </div>
        </div>
      ) : (
        <>
          {!isShorts && <Header />}
          <main className={`flex-1 relative z-0 ${hideBottomNav || isShorts ? 'pb-0' : 'pb-20'} overflow-hidden`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="w-full"
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </main>
          {!hideBottomNav && <BottomNav />}
          <NotificationModal />
        </>
      )}
    </div>
  );
}