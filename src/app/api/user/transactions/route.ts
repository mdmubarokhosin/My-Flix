import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';

export const runtime = 'edge';

// SECURITY: Client-initiated transactions are restricted to 'earn' type only (ad watching),
// with a maximum amount of 10 coins per transaction. All other transaction types
// (spend, purchase, checkin, redeem, gift, admin) must be created server-side only.
const ALLOWED_CLIENT_TYPE = 'earn';
const MAX_AD_COIN_AMOUNT = 10;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const userId = auth.userId;

    const user = await db.get<Record<string, any>>(`users/${userId}`);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only return the authenticated user's own transaction list
    const transactions = (user.transactions as unknown[]) || [];
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('GET /api/user/transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Use clone so requireUser doesn't consume the body
    const auth = await requireUser(req.clone());
    if ('response' in auth) return auth.response;

    // Explicit ban check (defense-in-depth alongside requireUser's built-in check)
    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const { type, title, amount } = await req.json();
    if (!type || !title || amount === undefined) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // CRITICAL: Only allow 'earn' type from client requests.
    // All other transaction types (spend, purchase, checkin, redeem, gift, admin)
    // must only be created server-side by the appropriate API endpoints.
    if (type !== ALLOWED_CLIENT_TYPE) {
      return NextResponse.json({ error: 'Invalid transaction type. Only earn type is allowed from client.' }, { status: 400 });
    }

    // Restrict amount to positive numbers, capped at 10 per transaction (ad watching reward)
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > MAX_AD_COIN_AMOUNT) {
      return NextResponse.json(
        { error: `Invalid amount. Must be a positive number up to ${MAX_AD_COIN_AMOUNT}.` },
        { status: 400 },
      );
    }

    const userId = auth.userId;
    const user = await db.get<Record<string, any>>(`users/${userId}`);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Daily ad limit logic for 'earn' type (ad watching)
    if (type === ALLOWED_CLIENT_TYPE) {
      const today = new Date().toISOString().split('T')[0];
      const lastAdDate = (user.lastAdDate as string) || null;
      let adWatchedToday = Number(user.adWatchedToday) || 0;

      if (lastAdDate === today) {
        if (adWatchedToday >= 10) {
          return NextResponse.json({ error: 'Max 10 ads per day' }, { status: 400 });
        }
        adWatchedToday += 1;
      } else {
        adWatchedToday = 1;
      }

      const balance = Number(user.balance) || 0;
      const transactions = (user.transactions as Record<string, any>[]) || [];

      transactions.unshift({
        type: 'earn',
        title: title || 'Ad Reward',
        amount: numAmount,
        time: Date.now(),
      });

      await db.update(`users/${userId}`, {
        balance: balance + numAmount,
        adWatchedToday,
        lastAdDate: today,
        transactions: transactions.slice(0, 50),
      });

      return NextResponse.json({
        success: true,
        coins: numAmount,
        adsToday: adWatchedToday,
        newBalance: balance + numAmount,
      });
    }

    // For 'earn' type, always go through the ad-limit logic above.
    // This branch should not be reachable, but return an error if it is.
    return NextResponse.json({ error: 'Invalid transaction request' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/user/transactions error:', error);
    return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
  }
}
