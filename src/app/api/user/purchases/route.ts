import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // Use clone so requireUser doesn't consume the body — we still need videoId
    const auth = await requireUser(req.clone());
    if ('response' in auth) return auth.response;

    // Explicit ban check (defense-in-depth)
    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const { videoId } = await req.json();
    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const userId = auth.userId;
    const videoIdStr = String(videoId);

    // Get user and video
    const user = await db.get<Record<string, any>>(`users/${userId}`);
    const video = await db.get<Record<string, any>>(`videos/${videoId}`);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const purchased = (user.purchased as (string | number)[]) || [];
    const isAlreadyPurchased = purchased.some((p) => String(p) === videoIdStr);
    if (isAlreadyPurchased) {
      return NextResponse.json({ error: 'Already purchased' }, { status: 400 });
    }

    const amount = Number(video.amount) || 0;
    const balance = Number(user.balance) || 0;

    // TODO: There is a race condition risk here — the user's balance could change between
    // the read above and the update below. Consider using a transaction or atomic decrement.

    if (balance < amount) {
      return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });
    }

    // Update user
    const transactions = (user.transactions as Record<string, any>[]) || [];
    transactions.unshift({
      type: 'spend',
      title: `Purchased: ${video.name || 'Video'}`,
      amount: -amount,
      time: Date.now(),
    });

    const targetIdToSave = isNaN(Number(videoId)) ? videoIdStr : Number(videoId);

    await db.update(`users/${userId}`, {
      balance: balance - amount,
      purchased: [...purchased, targetIdToSave],
      transactions: transactions.slice(0, 50),
    });

    return NextResponse.json({ success: true, newBalance: balance - amount });
  } catch (error) {
    console.error('POST /api/user/purchases error:', error);
    return NextResponse.json({ error: 'Failed to purchase' }, { status: 500 });
  }
}
