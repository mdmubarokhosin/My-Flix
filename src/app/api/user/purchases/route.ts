import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';

export const runtime = 'edge';

// POST /api/user/purchases — purchase a video with coins.
//
// Uses an atomic multi-location update so balance + purchased list +
// transaction all update together. The purchased array always stores
// videoId as a STRING for consistency (legacy mixed types are normalized
// on read).
export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req.clone());
    if ('response' in auth) return auth.response;

    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const body = await getBody<{ videoId?: string }>(req);
    const videoId = body.videoId;
    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }
    const videoIdStr = String(videoId);

    const userId = auth.userId;
    const user = await db.get<Record<string, unknown>>(`users/${userId}`);
    const video = await db.get<Record<string, unknown>>(`videos/${videoIdStr}`);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Normalize purchased array to strings.
    const purchasedRaw = (user.purchased as (string | number)[] | undefined) || [];
    const purchased: string[] = purchasedRaw.map((p) => String(p));
    if (purchased.includes(videoIdStr)) {
      return NextResponse.json({ error: 'Already purchased' }, { status: 400 });
    }

    const amount = Number(video.amount) || 0;
    const balance = Number(user.balance) || 0;

    if (amount === 0) {
      // Free video — just add to purchased list (atomic).
      await db.multiUpdate({
        [`users/${userId}/purchased`]: [...purchased, videoIdStr],
      });
      return NextResponse.json({ success: true, newBalance: balance });
    }

    if (balance < amount) {
      return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });
    }

    // Build new transaction.
    const txnsRaw = user.transactions;
    const txns: unknown[] = Array.isArray(txnsRaw)
      ? txnsRaw
      : txnsRaw && typeof txnsRaw === 'object'
        ? Object.values(txnsRaw)
        : [];
    const newTx = {
      type: 'spend',
      title: `Purchased: ${video.name || 'Video'}`,
      amount: -amount,
      time: Date.now(),
    };
    const trimmedTx = [newTx, ...txns].slice(0, 50);

    // Atomic multi-location update.
    await db.multiUpdate({
      [`users/${userId}/balance`]: balance - amount,
      [`users/${userId}/purchased`]: [...purchased, videoIdStr],
      [`users/${userId}/transactions`]: trimmedTx,
    });

    return NextResponse.json({ success: true, newBalance: balance - amount });
  } catch (error) {
    console.error('POST /api/user/purchases error:', error);
    return NextResponse.json({ error: 'Failed to purchase' }, { status: 500 });
  }
}
