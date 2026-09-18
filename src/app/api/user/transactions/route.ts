import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'edge';

const MAX_DAILY_ADS = 10;
const DEFAULT_AD_COINS = 5;

// GET /api/user/transactions — list the authenticated user's own transactions.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const user = await db.get<Record<string, unknown>>(`users/${auth.userId}`);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const txnsRaw = user.transactions;
    const transactions: unknown[] = Array.isArray(txnsRaw)
      ? txnsRaw
      : txnsRaw && typeof txnsRaw === 'object'
        ? Object.values(txnsRaw)
        : [];
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('GET /api/user/transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// POST /api/user/transactions — record an ad-watch reward.
//
// SECURITY: Only `type: 'earn'` (ad reward) is accepted from clients.
// The coin amount is read from `settings.coinsPerAd` (server-side) — the
// client's `amount` field is IGNORED. This prevents a malicious client
// from rewarding itself 10 coins per "ad watch".
//
// Rate-limited: 12 ad rewards / IP / minute (slightly above the 10/day cap
// so legitimate users never hit it, but brute-force farming is throttled).
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`ad-reward:${ip}`, { max: 12, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const auth = await requireUser(req.clone());
    if ('response' in auth) return auth.response;

    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const body = await getBody<{ type?: string; title?: string }>(req);
    if (body.type && body.type !== 'earn' && body.type !== 'ad') {
      return NextResponse.json(
        { error: 'Only earn/ad type is allowed from client requests.' },
        { status: 400 },
      );
    }

    const userId = auth.userId;
    const user = await db.get<Record<string, unknown>>(`users/${userId}`);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // ---- Server-side ad-coin amount (settings.coinsPerAd) ----
    const settings = await db.get<Record<string, unknown>>('settings');
    const adCoins = typeof settings?.coinsPerAd === 'number'
      ? settings.coinsPerAd
      : DEFAULT_AD_COINS;

    // ---- Daily ad limit (timezone-aware) ----
    const tzOffsetMin = Number(new URL(req.url).searchParams.get('tzOffset')) || 0;
    const localNow = new Date(Date.now() - tzOffsetMin * 60_000);
    const today = localNow.toISOString().split('T')[0];

    const lastAdDate = (user.lastAdDate as string) || null;
    let adWatchedToday = Number(user.adWatchedToday) || 0;
    if (lastAdDate === today) {
      if (adWatchedToday >= MAX_DAILY_ADS) {
        return NextResponse.json({ error: 'Max 10 ads per day' }, { status: 400 });
      }
      adWatchedToday += 1;
    } else {
      adWatchedToday = 1;
    }

    const balance = Number(user.balance) || 0;
    const txnsRaw = user.transactions;
    const txns: unknown[] = Array.isArray(txnsRaw)
      ? txnsRaw
      : txnsRaw && typeof txnsRaw === 'object'
        ? Object.values(txnsRaw)
        : [];
    const newTx = {
      type: 'ad',
      title: body.title || 'Ad Reward',
      amount: adCoins,
      time: Date.now(),
    };
    const trimmedTx = [newTx, ...txns].slice(0, 50);

    // Atomic multi-location update.
    await db.multiUpdate({
      [`users/${userId}/balance`]: balance + adCoins,
      [`users/${userId}/adWatchedToday`]: adWatchedToday,
      [`users/${userId}/lastAdDate`]: today,
      [`users/${userId}/transactions`]: trimmedTx,
    });

    return NextResponse.json({
      success: true,
      coins: adCoins,
      adsToday: adWatchedToday,
      newBalance: balance + adCoins,
    });
  } catch (error) {
    console.error('POST /api/user/transactions error:', error);
    return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
  }
}
