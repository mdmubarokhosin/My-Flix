'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import {
  Coins, Heart, ShoppingBag, Gift, Clock, Edit2, Shield,
  Sun, Moon, Copy, Check, User, Trash2, Tv, Search, Film,
  Languages, Bell, ChevronRight, LogOut,
} from 'lucide-react';
import type { AppUser } from '@/lib/types';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { formatRelativeTime } from '@/lib/format-utils';
import { getTransactionDisplay } from '@/lib/transaction-utils';
import { normalizeUser } from '@/lib/user-utils';
import { VideoCard, VideoCardHorizontal } from '@/components/app/VideoCard';
import { database } from '@/lib/firebase-client';
import { ref, onValue, off } from 'firebase/database';
import type { UserTransaction, Video } from '@/lib/types';
import { hapticLight } from '@/lib/telegram';

function getAmountColor(type: UserTransaction['type']) {
  if (type === 'spend') return 'text-red-400';
  return 'text-emerald-500';
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-[200px]">{message}</p>
    </div>
  );
}

export function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const {
    userId, user, favorites, purchases, isAdmin, videos,
    setUser, setFavorites, setPurchases, setIsAdmin, setPage,
    setCurrentVideo, lang, setLang,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [transactions, setLocalTransactions] = useState<UserTransaction[]>([]);

  // Real-time Firebase listener for current user
  useEffect(() => {
    if (!userId) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }
    const userRef = ref(database, `users/${userId}`);
    const unsub = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const normalized = normalizeUser(data, userId);
        if (normalized) setUser(normalized);
        setFavorites((data.favorites || []).map((f: string | number) => String(f)));
        setPurchases((data.purchased || []).map((p: string | number) => String(p)));
        setLocalTransactions(data.transactions || []);
      }
      setIsLoading(false);
    });
    return () => off(userRef);
  }, [userId, setUser, setFavorites, setPurchases]);

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.username || 'User';

  const handleCopyId = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      toast.success(t('profile.idCopied', lang));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error:', err);
      toast.error(err instanceof Error ? err.message : t('profile.copyFailed', lang));
    }
  };

  const handleEditName = async () => {
    const trimmed = editNameValue.trim();
    if (!trimmed || !userId) return;
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, firstName: trimmed }),
      });
      setUser({
        ...(user || {
          id: userId, balance: 0, purchased: [], favorites: [],
          lastCheckIn: null, streak: 0, adWatchedToday: 0,
          lastAdDate: null, transactions: [], giftHistory: [],
          createdAt: Date.now(),
        } as AppUser),
        id: userId, firstName: trimmed,
      });
      toast.success(t('profile.nameUpdated', lang));
    } catch (err) {
      console.error('Error:', err);
      toast.error(err instanceof Error ? err.message : t('profile.nameUpdateFailed', lang));
    }
  };

  const openEditName = () => {
    setEditNameValue(user?.firstName || '');
    setEditNameOpen(true);
  };

  const handleToggleFavorite = async (videoId: string) => {
    if (!userId) return;
    const vidStr = String(videoId);
    const isFav = favorites.includes(vidStr);
    try {
      if (isFav) {
        await fetch('/api/user/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, videoId: vidStr }),
        });
        setFavorites(favorites.filter((f) => f !== vidStr));
        toast.success(t('profile.removedFav', lang));
      } else {
        await fetch('/api/user/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, videoId: vidStr }),
        });
        setFavorites([...favorites, vidStr]);
        toast.success(t('profile.addedFav', lang));
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update favorite');
    }
  };

  const handleVideoClick = (video: Video) => {
    setCurrentVideo(video);
    setPage('player', { videoId: video.id });
  };

  const handleClearCache = useCallback(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('myflix-')) keysToRemove.push(key);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      toast.success(`Cleared ${keysToRemove.length} items`);
    } catch (err) {
      toast.error('Failed to clear cache');
    }
  }, []);

  const toggleLang = () => {
    const next = lang === 'en' ? 'bn' : 'en';
    setLang(next);
    localStorage.setItem('myflix-lang-manual', '1');
    hapticLight();
  };

  // Get video objects for favorites and purchases
  const favoriteVideos = videos.filter((v) => favorites.includes(String(v.id)));
  const purchasedVideos = videos.filter((v) => purchases.includes(String(v.id)));

  // Quick actions data
  const quickActions = [
    { icon: Heart, label: t('profile.favTab', lang), count: favorites.length, color: 'text-red-500', bg: 'bg-red-500/10', onClick: () => setPage('favorites') },
    { icon: ShoppingBag, label: t('profile.purchaseTab', lang), count: purchases.length, color: 'text-blue-500', bg: 'bg-blue-500/10', onClick: () => {} },
    { icon: Tv, label: t('liveTv.title', lang), count: 0, color: 'text-red-600', bg: 'bg-red-600/10', onClick: () => setPage('live-tv') },
    { icon: Film, label: t('nav.categories', lang), count: 0, color: 'text-amber-500', bg: 'bg-amber-500/10', onClick: () => setPage('search') },
    { icon: Gift, label: t('nav.gift', lang), count: 0, color: 'text-purple-500', bg: 'bg-purple-500/10', onClick: () => setPage('redeem') },
    { icon: Coins, label: t('nav.earn', lang), count: user?.balance ?? 0, color: 'text-amber-500', bg: 'bg-amber-500/10', onClick: () => setPage('earn') },
  ];

  if (isLoading) {
    return (
      <div className="px-4 py-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="px-4 pt-2 pb-4 space-y-5">
      {/* Profile Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 p-6 text-center text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,white_0%,transparent_60%)]" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <Avatar className="w-20 h-20 ring-4 ring-white/30 shadow-xl">
            {user?.photoUrl && <AvatarImage src={user.photoUrl} alt={displayName} />}
            <AvatarFallback className="text-2xl font-bold bg-white/20 text-white backdrop-blur-sm">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{displayName}</h2>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20" onClick={openEditName}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {userId && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <User className="w-3 h-3 text-white/80" />
                <span className="text-sm font-mono font-semibold tracking-wider text-white/90">
                  {userId}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
                onClick={handleCopyId}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          )}

          {memberSince && (
            <p className="text-xs text-white/70">{t('profile.memberSince', lang)} {memberSince}</p>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-3 flex flex-col items-center gap-1">
            <Coins className="w-5 h-5 text-amber-500" />
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{user?.balance ?? 0}</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{t('profile.coins', lang)}</span>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-3 flex flex-col items-center gap-1">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="text-lg font-bold text-red-600 dark:text-red-400">{favorites.length}</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{t('profile.favorites', lang)}</span>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-3 flex flex-col items-center gap-1">
            <ShoppingBag className="w-5 h-5 text-blue-500" />
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{purchases.length}</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{t('profile.purchases', lang)}</span>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-accent/50 active:scale-95 transition-all min-h-[72px] justify-center"
                >
                  <div className={`w-10 h-10 rounded-full ${action.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${action.color}`} />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground leading-tight text-center line-clamp-1">{action.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Settings Section */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-accent/30 transition-colors active:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{theme === 'dark' ? t('profile.lightMode', lang) : t('profile.darkMode', lang)}</p>
                <p className="text-[10px] text-muted-foreground">{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <Separator />

          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-accent/30 transition-colors active:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Languages className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{lang === 'en' ? 'বাংলা' : 'English'}</p>
                <p className="text-[10px] text-muted-foreground">{t('profile.language', lang)}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <Separator />

          {/* Clear Cache */}
          <button
            onClick={handleClearCache}
            className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-accent/30 transition-colors active:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{t('profile.clearCache', lang)}</p>
                <p className="text-[10px] text-muted-foreground">{t('profile.clearCacheDesc', lang)}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <Separator />

          {/* Redeem Code */}
          <button
            onClick={() => setPage('redeem')}
            className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-accent/30 transition-colors active:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Gift className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{t('profile.redeemCode', lang)}</p>
                <p className="text-[10px] text-muted-foreground">{t('earn.redeemCode', lang)}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Admin Panel */}
          {isAdmin && (
            <>
              <Separator />
              <button
                onClick={() => setPage('admin')}
                className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-accent/30 transition-colors active:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{t('profile.adminPanel', lang)}</p>
                    <p className="text-[10px] text-muted-foreground">Manage content & users</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Tabs Section */}
      <Tabs defaultValue="favorites" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-10">
          <TabsTrigger value="favorites" className="text-xs gap-1.5">
            <Heart className="w-3.5 h-3.5" />
            {t('profile.favTab', lang)}
          </TabsTrigger>
          <TabsTrigger value="purchases" className="text-xs gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />
            {t('profile.purchaseTab', lang)}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {t('profile.historyTab', lang)}
          </TabsTrigger>
        </TabsList>

        {/* Favorites Tab */}
        <TabsContent value="favorites" className="mt-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">{favoriteVideos.length} {favoriteVideos.length !== 1 ? t('profile.favoriteCountPlural', lang) : t('profile.favoriteCount', lang)}</h3>
          {favoriteVideos.length === 0 ? (
            <EmptyState icon={Heart} message={t('profile.noFavorites', lang)} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {favoriteVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onClick={() => handleVideoClick(video)}
                  isFavorite={true}
                  onToggleFavorite={() => handleToggleFavorite(video.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Purchases Tab */}
        <TabsContent value="purchases" className="mt-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">{purchasedVideos.length} {purchasedVideos.length !== 1 ? t('profile.purchaseCountPlural', lang) : t('profile.purchaseCount', lang)}</h3>
          {purchasedVideos.length === 0 ? (
            <EmptyState icon={ShoppingBag} message={t('profile.noPurchases', lang)} />
          ) : (
            <div className="space-y-1">
              {purchasedVideos.map((video) => (
                <VideoCardHorizontal
                  key={video.id}
                  video={video}
                  onClick={() => handleVideoClick(video)}
                  isFavorite={favorites.includes(String(video.id))}
                  onToggleFavorite={() => handleToggleFavorite(video.id)}
                  isPurchased={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t('profile.recentActivity', lang)}</h3>
          {transactions.length === 0 ? (
            <EmptyState icon={Clock} message={t('profile.noHistory', lang)} />
          ) : (
            <div className="space-y-1">
              {transactions.map((tx, i) => {
                const txDisplay = getTransactionDisplay(tx.type);
                const TxIcon = txDisplay.icon;
                return (
                <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/50 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${txDisplay.bgColor}`}>
                    <TxIcon className={`w-4 h-4 ${txDisplay.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatRelativeTime(tx.time)}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-sm font-semibold ${getAmountColor(tx.type)}`}>
                      {tx.type === 'spend' ? '-' : '+'}{tx.amount}
                    </span>
                    <p className="text-[10px] text-muted-foreground text-right">{t('profile.coins', lang)}</p>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Version tap (admin access) */}
      <div className="text-center pb-4">
        <p className="text-[11px] text-muted-foreground/40">v1.2.0</p>
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{t('profile.changeName', lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('profile.yourName', lang)}</Label>
            <Input
              placeholder={t('profile.enterName', lang)}
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEditName()}
              maxLength={30}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1">{t('profile.cancel', lang)}</Button>
            </DialogClose>
            <Button onClick={handleEditName} className="flex-1" disabled={!editNameValue.trim()}>{t('profile.save', lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
