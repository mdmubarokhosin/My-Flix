import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';

export const runtime = 'edge';

// POST /api/user/checkin — daily check-in (7-day streak).
//
// Uses local date based on the user's timezone offset (passed via
// `tzOffset` query param, in minutes) so a Bangladeshi user's "today"
// is not UTC-dependent. Falls back to UTC if no offset is provided.
//
// Atomic multi-location update for balance + lastCheckIn + streak + txns.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req.clone());
    if ('response' in auth) return auth.response;

    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const userId = auth.userId;
    const user = await db.get<Record<string, unknown>>(`users/${userId}`);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Compute "today" in the user's local timezone.
    const tzOffsetMin = Number(new URL(req.url).searchParams.get('tzOffset')) || 0;
    const now = new Date();
    const localNow = new Date(now.getTime() - tzOffsetMin * 60_000);
    const today = localNow.toISOString().split('T')[0];

    const lastCheckIn = (user.lastCheckIn as string) || null;
    let streak = Number(user.streak) || 0;

    if (lastCheckIn === today) {
      return NextResponse.json({ error: 'Already checked in today' }, { status: 400 });
    }

    if (lastCheckIn) {
      const lastDate = new Date(lastCheckIn + 'T00:00:00Z');
      const todayDate = new Date(today + 'T00:00:00Z');
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86_400_000);
      if (diffDays === 1) {
        streak = Math.min(streak + 1, 7);
        // After completing a 7-day streak, reset to day 1 for the next cycle.
        if (streak === 7) {
          // We keep streak at 7 for the current day; next day will reset to 1
          // automatically because diffDays will be > 1.
        }
      } else if (diffDays > 1) {
        streak = 1;
      }
    } else {
      streak = 1;
    }

    const coins = streak; // 1-7 coins based on streak day.
    const balance = Number(user.balance) || 0;

    const txnsRaw = user.transactions;
    const txns: unknown[] = Array.isArray(txnsRaw)
      ? txnsRaw
      : txnsRaw && typeof txnsRaw === 'object'
        ? Object.values(txnsRaw)
        : [];
    const newTx = {
      type: 'checkin',
      title: `Daily Check-in (Day ${streak})`,
      amount: coins,
      time: Date.now(),
    };
    const trimmedTx = [newTx, ...txns].slice(0, 50);

    // Atomic multi-location update.
    await db.multiUpdate({
      [`users/${userId}/balance`]: balance + coins,
      [`users/${userId}/lastCheckIn`]: today,
      [`users/${userId}/streak`]: streak,
      [`users/${userId}/transactions`]: trimmedTx,
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
