import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // Auth check — requireUser reads userId from body { userId }
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    // Explicit ban check (defense-in-depth)
    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const userId = auth.userId;

    const user = await db.get<Record<string, any>>(`users/${userId}`);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];
    const lastCheckIn = (user.lastCheckIn as string) || null;
    let streak = Number(user.streak) || 0;

    // Already checked in today
    if (lastCheckIn === today) {
      return NextResponse.json({ error: 'Already checked in today' }, { status: 400 });
    }

    // Calculate streak
    if (lastCheckIn) {
      const lastDate = new Date(lastCheckIn);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);

      if (diffDays === 1) {
        streak = Math.min(streak + 1, 7);
      } else if (diffDays > 1) {
        streak = 1; // Reset streak
      }
    } else {
      streak = 1;
    }

    const coins = streak; // 1-7 coins based on streak
    const balance = Number(user.balance) || 0;
    const transactions = (user.transactions as Record<string, any>[]) || [];

    transactions.unshift({
      type: 'checkin',
      title: `Daily Check-in (Day ${streak})`,
      amount: coins,
      time: Date.now(),
    });

    await db.update(`users/${userId}`, {
      balance: balance + coins,
      lastCheckIn: today,
      streak,
      transactions: transactions.slice(0, 50),
    });

    return NextResponse.json({
      success: true,
      coins,
      streak,
      newBalance: balance + coins,
    });
  } catch (error) {
    console.error('POST /api/user/checkin error:', error);
    return NextResponse.json({ error: 'Check-in failed' }, { status: 500 });
  }
}
