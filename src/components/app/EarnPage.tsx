'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Coins, Play, CalendarCheck, Gift, ArrowUpRight,
  Clock, CheckCircle2, Lock, Share2, ShoppingBag, Loader2, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/lib/store';
import { database } from '@/lib/firebase-client';
import { ref, onValue, off } from 'firebase/database';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';
import { formatRelativeTime } from '@/lib/format-utils';
import { getTransactionDisplay } from '@/lib/transaction-utils';
import type { UserTransaction, CoinPackage } from '@/lib/types';

const DAY_LABELS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
const MAX_DAILY_ADS = 10;
const DEFAULT_AD_COINS = 5;
const AD_COUNTDOWN_SECONDS = 5;

function getTodayKey(): string { return new Date().toISOString().slice(0, 10); }

export function EarnPage() {
  const { user, userId, setUser, setPage, lang } = useAppStore();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{ coins: number; streak: number } | null>(null);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);
  const [adWatchesToday, setAdWatchesToday] = useState(0);
  const [transactions, setLocalTransactions] = useState<UserTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [adCoins, setAdCoins] = useState(DEFAULT_AD_COINS);
  const adTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;
    const userRef = ref(database, `users/${userId}`);
    const unsub = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUser({
          id: userId, firstName: data.firstName, lastName: data.lastName,
          username: data.username, photoUrl: data.photoUrl,
          balance: data.balance || 0, purchased: data.purchased || [],
          favorites: data.favorites || [], lastCheckIn: data.lastCheckIn || null,
          streak: data.streak || 0, adWatchedToday: data.adWatchedToday || 0,
          lastAdDate: data.lastAdDate || null, transactions: data.transactions || [],
          giftHistory: data.giftHistory || [], createdAt: data.createdAt || 0, theme: data.theme,
        });
        setLocalTransactions(data.transactions || []);
        setAdWatchesToday(data.adWatchedToday || 0);
        setTxLoading(false);
      } else { setTxLoading(false); }
    });
    return () => off(userRef);
  }, [userId, setUser]);

  useEffect(() => { return () => { if (adTimerRef.current) clearInterval(adTimerRef.current); }; }, []);

  useEffect(() => {
    fetch('/api/coin-packages').then((r) => r.json()).then((data: CoinPackage[]) => {
      setCoinPackages(Array.isArray(data) ? data : []);
    }).catch(() => setCoinPackages([])).finally(() => setPackagesLoading(false));
  }, []);

  // Fetch coinsPerAd from settings
  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((s: any) => {
      if (s.coinsPerAd !== undefined && s.coinsPerAd !== null) {
        setAdCoins(Number(s.coinsPerAd));
      }
    }).catch(() => {});
  }, []);

  const handlePurchase = useCallback(async (pkg: CoinPackage) => {
    if (!userId || purchasingId) return;
    setPurchasingId(pkg.id);
    try {
      const res = await fetch('/api/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, packageId: pkg.id, packageName: pkg.name, coins: pkg.coins, amount: pkg.price, userName: user?.firstName || undefined }),
      });
      const data = await res.json();
      if (data.success && data.payment_url) { window.location.href = data.payment_url; }
      else { toast.error(data.error || 'Payment failed'); }
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Network error'); }
  }, [userId, purchasingId, user]);

  const handleCheckIn = useCallback(async () => {
    if (!userId || isCheckingIn) return;
    setIsCheckingIn(true);
    try {
      const res = await fetch('/api/user/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); toast.error((err as any).error || 'Check-in failed'); return; }
      const data = await res.json();
      setCheckInResult({ coins: data.coins ?? 0, streak: data.streak ?? 0 });
      toast.success(`+${data.coins ?? 0} coins! Day ${data.streak ?? 0} streak`);
    } catch (err) { toast.error('Network error'); }
    finally { setIsCheckingIn(false); }
  }, [userId, isCheckingIn]);

  const handleWatchAd = useCallback(async () => {
    if (isWatchingAd || adWatchesToday >= MAX_DAILY_ADS || !userId) return;
    setIsWatchingAd(true); setAdCountdown(AD_COUNTDOWN_SECONDS);
    adTimerRef.current = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          if (adTimerRef.current) clearInterval(adTimerRef.current);
          fetch('/api/user/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, type: 'earn', title: 'Watched ad', amount: adCoins }) }).catch(() => {});
          setAdWatchesToday((prev) => prev + 1); setIsWatchingAd(false);
          toast.success(`+${adCoins} coins from ad!`); return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isWatchingAd, adWatchesToday, userId, adCoins]);

  const checkedInToday = user?.lastCheckIn ? user.lastCheckIn.slice(0, 10) === getTodayKey() : false;
  const currentStreak = user?.streak ?? 0;
  const streakDayIndex = currentStreak > 7 ? 6 : currentStreak - 1;
  const adProgress = (adWatchesToday / MAX_DAILY_ADS) * 100;

  return (
    <div className="px-4 pb-6 pt-2 space-y-5">
      <Card className="overflow-hidden border-0">
        <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 p-6 text-center text-white">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"><Coins className="w-9 h-9" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t('earn.yourBalance', lang)}</p>
              <p className="text-4xl font-bold tabular-nums mt-0.5">{user?.balance ?? 0}</p>
              <p className="text-xs text-white/70 mt-1">{t('earn.coins', lang)}</p>
            </div>
            <div className="flex gap-2.5 mt-3 w-full max-w-xs">
              <Button variant="secondary" size="sm" onClick={() => setPage('redeem')} className="flex-1 text-xs font-bold bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm gap-1.5 h-9"><Gift className="w-3.5 h-3.5" />{t('earn.redeemCode', lang)}</Button>
              <Button variant="secondary" size="sm" onClick={() => setPage('redeem')} className="flex-1 text-xs font-bold bg-white text-orange-600 hover:bg-white/90 gap-1.5 h-9 shadow-sm"><Share2 className="w-3.5 h-3.5" />{t('earn.shareCoins', lang)}</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-amber-500" />{t('earn.dailyCheckin', lang)}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between gap-1">
            {DAY_LABELS.map((_, i) => {
              const isCompleted = i < streakDayIndex; const isCurrent = i === streakDayIndex; const isLocked = i > streakDayIndex;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                  <span className="text-[9px] text-muted-foreground font-medium">{i+1}</span>
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors ${isCompleted ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-amber-500 text-white ring-2 ring-amber-300 ring-offset-2 ring-offset-background' : 'bg-muted text-muted-foreground'}`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : <Coins className="w-4 h-4" />}
                  </div>
                  <span className={`text-[9px] sm:text-[10px] font-semibold tabular-nums ${isLocked ? 'text-muted-foreground/50' : isCurrent ? 'text-amber-600' : 'text-foreground'}`}>+{i+1}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{t('earn.currentStreak', lang)} <span className="font-semibold text-foreground">{currentStreak} {currentStreak !== 1 ? t('earn.days', lang) : t('earn.day', lang)}</span></p>
            {currentStreak >= 7 && <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">{t('earn.maxStreak', lang)}</Badge>}
          </div>
          {checkInResult && <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg p-3 text-center text-sm font-medium">+{checkInResult.coins} {t('earn.coin', lang)}! {t('earn.earnedMsg', lang)} {checkInResult.streak} {t('earn.streakMsg', lang)}</div>}
          <Button className="w-full h-11 text-sm font-semibold" disabled={checkedInToday || isCheckingIn} onClick={handleCheckIn}>
            {isCheckingIn ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />{t('earn.checkingIn', lang)}</span> : checkedInToday ? <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{t('earn.checkedIn', lang)}</span> : <span className="flex items-center gap-2"><CalendarCheck className="w-4 h-4" />{t('earn.checkIn', lang)}</span>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Play className="w-5 h-5 text-amber-500" />{t('earn.watchAd', lang)}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">{t('earn.todaysAds', lang)} <span className="font-semibold text-amber-600">{adCoins} {t('earn.coin', lang)}</span> {lang === 'bn' ? t('earn.adsEach', lang) : 'each time.'} <span className="font-semibold">{MAX_DAILY_ADS}</span> {lang === 'bn' ? t('earn.adsPerDay', lang) : 'ads per day.'}</p>
          <div className="space-y-1.5"><div className="flex justify-between text-xs"><span className="text-muted-foreground">{t('earn.todaysAds', lang)}</span><span className="font-medium tabular-nums">{adWatchesToday}/{MAX_DAILY_ADS}</span></div><Progress value={adProgress} className="h-2" /></div>
          {isWatchingAd && <div className="relative bg-muted rounded-xl p-6 text-center overflow-hidden"><div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10" /><div className="relative z-10"><p className="text-xs text-muted-foreground mb-2">{t('earn.watchingAd', lang)}</p><p className="text-3xl font-bold tabular-nums text-amber-600">{adCountdown}</p><p className="text-xs text-muted-foreground mt-1">{t('earn.secondsRemaining', lang)}</p></div></div>}
          {!isWatchingAd && <Button variant="outline" className="w-full h-11 text-sm" disabled={adWatchesToday >= MAX_DAILY_ADS} onClick={handleWatchAd}><span className="flex items-center gap-2"><Play className="w-4 h-4" />{adWatchesToday >= MAX_DAILY_ADS ? t('earn.dailyLimit', lang) : t('earn.watchAdBtn', lang)}</span></Button>}
          {adWatchesToday >= MAX_DAILY_ADS && !isWatchingAd && <p className="text-xs text-center text-muted-foreground">{t('earn.comeBack', lang)}</p>}
        </CardContent>
      </Card>

      {/* Coin Packages - Redesigned */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-amber-500" />{t('earn.buyCoins', lang)}</CardTitle></CardHeader>
        <CardContent>
          {packagesLoading ? (<div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />)}</div>) : coinPackages.length === 0 ? (
            <div className="py-8 text-center"><ShoppingBag className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" /><p className="text-sm text-muted-foreground">{t('earn.noPackages', lang)}</p><p className="text-xs text-muted-foreground/70 mt-1">{t('earn.noPackages.sub', lang)}</p></div>
          ) : (
            <div className="grid grid-cols-2 gap-3">{coinPackages.map((pkg, idx) => {
              const pricePerCoin = pkg.price > 0 && pkg.coins > 0 ? (pkg.price / pkg.coins).toFixed(2) : '0';
              const isPopular = pkg.popular;
              const gradients = ['from-slate-800 via-slate-700 to-slate-900','from-amber-600 via-orange-500 to-yellow-500','from-violet-700 via-purple-600 to-indigo-600','from-emerald-700 via-teal-600 to-cyan-600','from-rose-700 via-pink-600 to-fuchsia-600','from-sky-700 via-blue-600 to-indigo-500'];
              const grad = gradients[idx % gradients.length];
              const isLightGrad = grad.includes('amber') || grad.includes('yellow');
              const textColor = isLightGrad ? 'text-slate-900' : 'text-white';
              const subTextColor = isLightGrad ? 'text-slate-700/80' : 'text-white/70';
              const badgeBg = isLightGrad ? 'bg-black/20 text-slate-900' : 'bg-white/20 text-white';
              const btnBg = isPopular ? 'bg-white text-amber-700 hover:bg-white/90 font-bold shadow-lg shadow-amber-500/25' : isLightGrad ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/30';
              return (
                <div key={pkg.id} className={`relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-xl cursor-pointer group ${isPopular ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-background' : ''}`} onClick={() => handlePurchase(pkg)}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,white_0%,transparent_50%)]" />
                  {isPopular && <div className="absolute top-2.5 right-2.5 z-10"><span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${badgeBg}`}><Sparkles className="w-2.5 h-2.5" />{t('earn.popular', lang)}</span></div>}
                  <div className={`relative z-10 p-4 flex flex-col justify-between h-full min-h-[140px]`}>
                    <div><p className={`text-[11px] font-semibold uppercase tracking-wider ${subTextColor}`}>{pkg.name}</p><div className="flex items-baseline gap-1.5 mt-2"><span className={`text-3xl font-extrabold tabular-nums ${textColor}`}>{pkg.coins}</span><Coins className={`w-5 h-5 ${isLightGrad ? 'text-amber-700' : 'text-amber-300'}`} /></div><p className={`text-[10px] ${subTextColor} mt-0.5`}>{t('earn.coin', lang)}</p></div>
                    <div className="mt-3 space-y-2">
                      <div className={`flex items-center justify-between text-[10px] ${subTextColor}`}><span>{t('earn.perCoin', lang)}</span><span className={`font-semibold ${textColor}`}>৳{pricePerCoin}</span></div>
                      <button className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${btnBg} disabled:opacity-50 disabled:cursor-not-allowed`} disabled={purchasingId === pkg.id} onClick={(e) => { e.stopPropagation(); handlePurchase(pkg); }}>{purchasingId === pkg.id ? <span className="flex items-center justify-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('earn.processing', lang)}</span> : <span className="flex items-center justify-center gap-1">৳{pkg.price}<ArrowUpRight className="w-3 h-3" /></span>}</button>
                    </div>
                  </div>
                </div>
              );
            })}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="w-5 h-5 text-muted-foreground" />{t('earn.transactionHistory', lang)}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {txLoading ? (<div className="px-6 py-4 space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-muted animate-pulse" /><div className="flex-1 space-y-1.5"><div className="h-3.5 bg-muted rounded animate-pulse w-3/4" /><div className="h-2.5 bg-muted rounded animate-pulse w-1/3" /></div><div className="h-4 bg-muted rounded animate-pulse w-12" /></div>)}</div>) : transactions.length === 0 ? (
            <div className="py-10 text-center"><Coins className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" /><p className="text-sm text-muted-foreground">{t('earn.noTransactions', lang)}</p><p className="text-xs text-muted-foreground/70 mt-1">{t('earn.noTransactions.sub', lang)}</p></div>
          ) : (
            <ScrollArea className="max-h-96 overflow-y-auto"><div className="px-6 divide-y divide-border/50">{transactions.map((tx, i) => {
              const isPositive = tx.type === 'earn' || tx.type === 'gift' || tx.type === 'admin' || tx.type === 'checkin' || tx.type === 'purchase';
              const txDisplay = getTransactionDisplay(tx.type);
              const TxIcon = txDisplay.icon;
              return (<div key={i} className="flex items-center gap-3 py-3"><div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${txDisplay.bgColor}`}><TxIcon className={`w-4 h-4 ${txDisplay.color}`} /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{tx.title}</p><p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{formatRelativeTime(tx.time)}</p></div><span className={`text-sm font-semibold tabular-nums shrink-0 ${isPositive ? 'text-emerald-500' : 'text-red-400'}`}>{isPositive ? '+' : '-'}{tx.amount}</span></div>);
            })}</div></ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
