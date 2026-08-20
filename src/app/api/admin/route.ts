import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const videos = await db.get<Record<string, any>>('videos');
    const users = await db.get<Record<string, any>>('users');
    const gifts = await db.get<Record<string, any>>('gifts');

    const videoCount = videos ? Object.keys(videos).length : 0;
    const userCount = users ? Object.keys(users).length : 0;
    let giftCount = 0;
    let activeGiftCount = 0;
    let totalCoins = 0;

    if (gifts) {
      for (const gift of Object.values(gifts) as Record<string, any>[]) {
        giftCount++;
        if (gift.status === 'active') activeGiftCount++;
      }
    }

    if (users) {
      for (const user of Object.values(users) as Record<string, any>[]) {
        totalCoins += Number(user.balance) || 0;
      }
    }

    return NextResponse.json({
      totalVideos: videoCount,
      totalUsers: userCount,
      totalGiftCodes: giftCount,
      activeGiftCodes: activeGiftCount,
      totalCoinsInCirculation: totalCoins,
    });
  } catch (error) {
    console.error('GET /api/admin error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { userId, balance } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.get(`users/${userId}`);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (balance !== undefined) {
      await db.update(`users/${userId}`, { balance: Number(balance) });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
