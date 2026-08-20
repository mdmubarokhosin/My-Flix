'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Gift, Coins, ArrowLeft, RefreshCw, Star, Info, Share2, Copy, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { database } from '@/lib/firebase-client';
import { ref, onValue, off } from 'firebase/database';
import { formatRelativeTime } from '@/lib/format-utils';
import { normalizeUser } from '@/lib/user-utils';
import type { GiftHistoryEntry } from '@/lib/types';

export function RedeemPage() {
  const { userId, user, setUser, goBack, lang } = useAppStore();

  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [giftHistory, setGiftHistory] = useState<GiftHistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Share coins state
  const [shareAmount, setShareAmount] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatedAmount, setGeneratedAmount] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Real-time listener for user gift history
  useEffect(() => {
    if (!userId) return;
    const userRef = ref(database, `users/${userId}`);
    const unsub = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const normalized = normalizeUser(data, userId);
        if (normalized) setUser(normalized);
        setGiftHistory(data.giftHistory || []);
      }
    });
    return () => off(userRef);
  }, [userId, setUser]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep uppercase alphanumeric characters and hyphens intact
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');
    setCode(value);
  };

  const handleRedeem = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      toast.error(t('redeem.enterGiftCode', lang));
      inputRef.current?.focus();
      return;
    }
    if (cleanCode.replace(/[^A-Z0-9]/g, '').length < 3) {
      toast.error(t('redeem.codeTooShort', lang));
      return;
    }

    setIsRedeeming(true);
    try {
      const res = await fetch('/api/gift-codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: cleanCode }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setEarnedCoins(data.amount || data.coins || 0);
        setShowSuccess(true);
        setCode('');
        toast.success(`🎉 ${data.amount || data.coins || 0} ${t('redeem.codeRedeemed', lang)}`);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        toast.error(data.error || t('redeem.redeemFailed', lang));
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error(err instanceof Error ? err.message : 'নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন');
    }
  };

  const handleShareCoins = async () => {
    const amt = parseInt(shareAmount, 10);
    if (isNaN(amt) || amt <= 0) {
      toast.error(t('redeem.enterCoinAmount', lang));
      return;
    }
    if (amt > (user?.balance || 0)) {
      toast.error(t('redeem.insufficientCoins', lang));
      return;
    }

    setIsSharing(true);
    try {
      const res = await fetch('/api/gift-codes/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: amt }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setGeneratedCode(data.code);
        setGeneratedAmount(data.amount);
        setShareAmount('');
        toast.success(`🎉 ${data.amount} ${t('redeem.giftCodeCreated', lang)}`);
      } else {
        toast.error(data.error || t('redeem.giftCodeCreateFailed', lang));
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error(err instanceof Error ? err.message : t('redeem.networkError', lang));
    }
  };

  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success(t('redeem.codeCopiedToast', lang));
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareCodeDirect = () => {
    if (!generatedCode) return;
    const shareText = `🎁 আমি তোমাকে ${generatedAmount} Coins গিফট করেছি! MyFlix অ্যাপের Redeem অপশনে গিয়ে এই কোডটি দিয়ে কয়েন সংগ্রহ কর:\n\n👉 Gift Code: ${generatedCode}`;
    if (navigator.share) {
      navigator.share({
        title: 'MyFlix Gift Code',
        text: shareText,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success(t('redeem.shareMsgCopied', lang));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Success overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 bg-card border border-border rounded-2xl p-8 mx-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-lg font-bold mb-1">{t('redeem.codeRedeemed', lang)}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t('redeem.youEarned', lang)}</p>
            <div className="flex items-center justify-center gap-2">
              <Coins className="w-6 h-6 text-amber-500" />
              <span className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                +{earnedCoins}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t('redeem.addedToBalance', lang)}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={goBack} className="-ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-semibold">{t('redeem.title', lang)}</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-6">
        <Tabs defaultValue="redeem" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 h-11 p-1 bg-muted/80 rounded-xl">
            <TabsTrigger value="redeem" className="rounded-lg text-xs font-bold gap-1.5">
              <Gift className="w-3.5 h-3.5 text-amber-500" />
              {t('redeem.codeRedeem', lang)}
            </TabsTrigger>
            <TabsTrigger value="share" className="rounded-lg text-xs font-bold gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-primary" />
              {t('redeem.shareCoins', lang)}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: REDEEM CODE */}
          <TabsContent value="redeem" className="space-y-6">
            <Card className="border-border/50 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-3">
                    <Gift className="w-8 h-8 text-amber-500" />
                  </div>
                  <h2 className="text-lg font-bold">{t('redeem.enterCode', lang)}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('redeem.enterCode.desc', lang)}
                  </p>
                </div>

                <div className="space-y-3">
                  <Input
                    ref={inputRef}
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="GIFT-XXXX-XXXX-XXXX"
                    className="h-12 text-center text-lg font-mono tracking-wider uppercase placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                    maxLength={30}
                    disabled={isRedeeming}
                    autoComplete="off"
                    spellCheck={false}
                  />

                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {t('redeem.currentBalance', lang)} <strong className="text-foreground">{user?.balance ?? 0} coins</strong>
                    </span>
                  </div>

                  <Button
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 gap-2 disabled:opacity-60"
                    onClick={handleRedeem}
                    disabled={isRedeeming || code.trim().length < 3}
                  >
                    {isRedeeming ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        {t('redeem.redeeming', lang)}
                      </>
                    ) : (
                      <>
                        <Gift className="w-5 h-5" />
                        {t('redeem.redeemBtn', lang)}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Gift History */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t('redeem.recentRedemptions', lang)}</h3>
              {giftHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center border rounded-xl bg-card">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                    <Gift className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground max-w-[220px]">
                    {t('redeem.noRedemptions', lang)}
                  </p>
                </div>
              ) : (
                <Card className="border-border/50">
                  <CardContent className="p-0 divide-y divide-border/50">
                    {giftHistory.map((entry, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                          <Gift className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded inline-block">
                            {entry.code}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{formatRelativeTime(entry.time)}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className="text-sm font-semibold text-emerald-500">+{entry.amount}</span>
                          <p className="text-[10px] text-muted-foreground">coins</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: SHARE COINS */}
          <TabsContent value="share" className="space-y-6">
            <Card className="border-border/50 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-orange-500/20 flex items-center justify-center mb-3">
                    <Share2 className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold">{t('redeem.shareTitle', lang)}</h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    আপনার Balance coins থেকে কয়েন লিখে {t('redeem.share', lang)}। একটি unique Gift Code জেনারেট হবে যা যে কেউ Redeem করতে পারবে।
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">{t('redeem.enterAmount', lang)}</span>
                      <span className="text-muted-foreground">
                        {t('redeem.balance', lang)} <strong className="text-amber-500 font-bold">{user?.balance ?? 0} Coins</strong>
                      </span>
                    </div>
                    <div className="relative">
                      <Coins className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                      <Input
                        type="number"
                        placeholder={t('redeem.exampleAmount', lang)}
                        value={shareAmount}
                        onChange={(e) => setShareAmount(e.target.value)}
                        min="1"
                        max={user?.balance || 0}
                        className="h-12 pl-10 text-center font-bold text-lg"
                      />
                    </div>
                    {/* Quick presets */}
                    <div className="flex gap-2 pt-1">
                      {[10, 50, 100, 200, 500].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setShareAmount(String(num))}
                          className="flex-1 py-1.5 px-2 text-xs font-bold rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-border/50"
                        >
                          +{num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleShareCoins}
                    disabled={
                      isSharing ||
                      !shareAmount ||
                      parseInt(shareAmount, 10) <= 0 ||
                      parseInt(shareAmount, 10) > (user?.balance || 0)
                    }
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-orange-500 text-primary-foreground gap-2 shadow-lg shadow-primary/20"
                  >
                    {isSharing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        {t('redeem.generating', lang)}
                      </>
                    ) : (
                      <>
                        <Gift className="w-5 h-5" />
                        {t('redeem.generateCode', lang)}
                      </>
                    )}
                  </Button>

                  {/* Display Generated Code Result */}
                  {generatedCode && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="text-center">
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                          🎉 {t('redeem.yourGiftCode', lang)}
                        </span>
                        <div className="bg-background px-4 py-2.5 rounded-xl border border-amber-500/40 text-lg font-mono font-bold tracking-widest text-foreground select-all flex items-center justify-between shadow-inner my-2">
                          <span>{generatedCode}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCopyCode}
                            className="h-8 px-2 text-xs gap-1 text-primary hover:bg-primary/10"
                          >
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            {copied ? t('redeem.copied', lang) : t('redeem.copy', lang)}
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          যে কেউ MyFlix অ্যাপের <strong className="text-foreground">{t('redeem.title', lang)}</strong> অপশনে এই কোডটি ব্যবহার করে{' '}
                          <strong className="text-amber-500 font-bold">{generatedAmount} Coins</strong> সংগ্রহ করতে পারবে!
                        </p>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyCode}
                          className="flex-1 text-xs gap-1.5 h-9"
                        >
                          <Copy className="w-3.5 h-3.5" /> {t('redeem.copy', lang)}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleShareCodeDirect}
                          className="flex-1 text-xs gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Send className="w-3.5 h-3.5" /> {t('redeem.share', lang)}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Info Section */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info className="w-4 h-4 text-amber-500" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">{t('redeem.howToGet', lang)}</h4>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>{t('redeem.howToGet.1', lang)}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>{t('redeem.howToGet.2', lang)}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>{t('redeem.howToGet.3', lang)}</span>
                  </li>
                </ul>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground">
                  💬 Contact an <strong className="text-foreground">admin</strong> to request a gift code. Codes are single-use.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
