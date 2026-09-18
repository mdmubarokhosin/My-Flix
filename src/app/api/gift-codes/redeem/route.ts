import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'edge';

// POST /api/gift-codes/redeem — redeem a gift code.
//
// Rate-limited: 5 attempts / IP / minute to mitigate brute-force.
// Uses an atomic multi-location update so balance + transaction + code
// status all update together.
export async function POST(req: NextRequest) {
  // Rate limit.
  const ip = getClientIp(req);
  const rl = rateLimit(`redeem:${ip}`, { max: 5, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 },
    );
  }

  try {
    const auth = await requireUser(req.clone());
    if ('response' in auth) return auth.response;

    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const body = await getBody<{ code?: string }>(req);
    const code = (body.code || '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Normalize: strip non-alphanumeric for comparison.
    const searchNoDash = code.replace(/[^A-Z0-9]/g, '');

    // Find the gift code in the unified `gifts` path.
    const allGifts = await db.get<Record<string, Record<string, unknown>>>('gifts');
    if (!allGifts) {
      return NextResponse.json({ error: 'Invalid gift code' }, { status: 404 });
    }

    let giftId: string | null = null;
    let giftData: Record<string, unknown> | null = null;
    for (const [id, gift] of Object.entries(allGifts)) {
      const storedCode = String(gift.code || id || '').toUpperCase();
      const storedNoDash = storedCode.replace(/[^A-Z0-9]/g, '');
      if (storedCode === code || storedNoDash === searchNoDash) {
        giftId = id;
        giftData = gift as Record<string, unknown>;
        break;
      }
    }

    if (!giftId || !giftData) {
      return NextResponse.json({ error: 'Invalid gift code' }, { status: 404 });
    }
    if (giftData.status === 'used') {
      return NextResponse.json({ error: 'Gift code already used' }, { status: 400 });
    }

    const amount = Number(giftData.amount) || 0;
    const userId = auth.userId;
    const user = await db.get<Record<string, unknown>>(`users/${userId}`);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please open the app first to create your account.' },
        { status: 404 },
      );
    }

    const balance = Number(user.balance) || 0;
    const newBalance = balance + amount;

    // Build new transaction + gift history (trimmed to 50).
    const txnsRaw = user.transactions;
    const txns: unknown[] = Array.isArray(txnsRaw)
      ? txnsRaw
      : txnsRaw && typeof txnsRaw === 'object'
        ? Object.values(txnsRaw)
        : [];
    const giftHistRaw = user.giftHistory;
    const giftHist: unknown[] = Array.isArray(giftHistRaw)
      ? giftHistRaw
      : giftHistRaw && typeof giftHistRaw === 'object'
        ? Object.values(giftHistRaw)
        : [];

    const newTx = { type: 'redeem', title: `Gift Code: ${code}`, amount, time: Date.now() };
    const newGift = { code, amount, time: Date.now() };

    const trimmedTx = [newTx, ...txns].slice(0, 50);
    const trimmedGift = [newGift, ...giftHist].slice(0, 50);

    // Atomic multi-location update.
    await db.multiUpdate({
      [`users/${userId}/balance`]: newBalance,
      [`users/${userId}/transactions`]: trimmedTx,
      [`users/${userId}/giftHistory`]: trimmedGift,
      [`gifts/${giftId}/status`]: 'used',
      [`gifts/${giftId}/redeemedBy`]: userId,
      [`gifts/${giftId}/redeemedAt`]: Date.now(),
    });

    return NextResponse.json({
      success: true,
      amount,
      newBalance,
      package: giftData.package,
    });
  } catch (error) {
    console.error('POST /api/gift-codes/redeem error:', error);
    return NextResponse.json({ error: 'Redemption failed' }, { status: 500 });
  }
}
