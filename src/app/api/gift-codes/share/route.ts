import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';

export const runtime = 'edge';

const GIFT_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateGiftCode(): string {
  const randomValues = new Uint8Array(12);
  crypto.getRandomValues(randomValues);
  let code = 'GIFT-';
  for (let i = 0; i < 4; i++) {
    code += GIFT_CHARS[randomValues[i] % GIFT_CHARS.length];
  }
  code += '-';
  for (let i = 4; i < 8; i++) {
    code += GIFT_CHARS[randomValues[i] % GIFT_CHARS.length];
  }
  code += '-';
  for (let i = 8; i < 12; i++) {
    code += GIFT_CHARS[randomValues[i] % GIFT_CHARS.length];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate and validate user
    const auth = await requireUser(req.clone());
    if ('response' in auth) return auth.response;

    // Explicit ban check (defense-in-depth)
    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const { amount } = await req.json();

    const coinAmount = Math.floor(Number(amount));
    if (isNaN(coinAmount) || coinAmount <= 0) {
      return NextResponse.json({ error: 'সঠিক কয়েন সংখ্যা প্রয়োজন' }, { status: 400 });
    }

    const userId = auth.userId;

    // Fetch latest user data (requireUser validated existence & ban status)
    const user = await db.get<Record<string, any>>(`users/${userId}`);
    if (!user) {
      // User was deleted between requireUser check and now — create a full record
      const fullUser = {
        firstName: '',
        lastName: '',
        username: '',
        photoUrl: '',
        balance: 0,
        purchased: [],
        favorites: [],
        lastCheckIn: null,
        streak: 0,
        adWatchedToday: 0,
        lastAdDate: null,
        transactions: [],
        giftHistory: [],
        createdAt: Date.now(),
        theme: 'dark',
      };
      await db.set(`users/${userId}`, fullUser);
      return NextResponse.json({ error: 'Account was recreated. Please try again.' }, { status: 400 });
    }

    const currentBalance = Number(user.balance) || 0;
    if (currentBalance < coinAmount) {
      return NextResponse.json(
        { error: `পর্যাপ্ত ব্যালেন্স নেই। আপনার বর্তমান ব্যালেন্স: ${currentBalance} কয়েন।` },
        { status: 400 }
      );
    }

    // Generate gift code
    const code = generateGiftCode();

    // Deduct coins from user
    const newBalance = currentBalance - coinAmount;
    let transactions: Record<string, any>[] = [];
    if (Array.isArray(user.transactions)) {
      transactions = [...user.transactions];
    } else if (user.transactions && typeof user.transactions === 'object') {
      transactions = Object.values(user.transactions as Record<string, any>);
    }

    transactions.unshift({
      type: 'spend',
      title: `Shared Gift Code: ${code}`,
      amount: coinAmount,
      time: Date.now(),
    });

    // Update user balance & transactions
    await db.update(`users/${userId}`, {
      balance: newBalance,
      transactions: transactions.slice(0, 50),
    });

    // Save gift code in Database
    await db.set(`gifts/${code}`, {
      id: code,
      code,
      amount: coinAmount,
      package: 'User Share',
      status: 'active',
      createdBy: userId,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      code,
      amount: coinAmount,
      newBalance,
    });
  } catch (error) {
    console.error('POST /api/gift-codes/share error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate gift code' }, { status: 500 });
  }
}
