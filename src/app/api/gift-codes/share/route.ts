import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';
import { generateGiftCode } from '@/lib/video-utils';

export const runtime = 'edge';

// POST /api/gift-codes/share — user shares their own coins via a generated code.
//
// Atomic: the balance deduction + gift code creation happen in a single
// multi-location update, so coins can never be "lost" if the code write fails.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req.clone());
    if ('response' in auth) return auth.response;

    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const body = await getBody<{ amount?: number }>(req);
    const coinAmount = Math.floor(Number(body.amount));
    if (isNaN(coinAmount) || coinAmount <= 0) {
      return NextResponse.json({ error: 'সঠিক কয়েন সংখ্যা প্রয়োজন' }, { status: 400 });
    }

    const userId = auth.userId;
    const user = await db.get<Record<string, unknown>>(`users/${userId}`);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentBalance = Number(user.balance) || 0;
    if (currentBalance < coinAmount) {
      return NextResponse.json(
        { error: `পর্যাপ্ত ব্যালেন্স নেই। আপনার বর্তমান ব্যালেন্স: ${currentBalance} কয়েন।` },
        { status: 400 },
      );
    }

    const code = generateGiftCode();
    const newBalance = currentBalance - coinAmount;

    // Build new transactions list.
    const txnsRaw = user.transactions;
    const txns: unknown[] = Array.isArray(txnsRaw)
      ? txnsRaw
      : txnsRaw && typeof txnsRaw === 'object'
        ? Object.values(txnsRaw)
        : [];
    const newTx = {
      type: 'spend',
      title: `Shared Gift Code: ${code}`,
      amount: coinAmount,
      time: Date.now(),
    };
    const trimmedTx = [newTx, ...txns].slice(0, 50);

    // Atomic multi-location update: deduct balance + add transaction + create code.
    await db.multiUpdate({
      [`users/${userId}/balance`]: newBalance,
      [`users/${userId}/transactions`]: trimmedTx,
      [`gifts/${code}`]: {
        code,
        amount: coinAmount,
        package: 'User Share',
        status: 'active',
        createdBy: userId,
        createdAt: Date.now(),
      },
    });

    return NextResponse.json({
      success: true,
      code,
      amount: coinAmount,
      newBalance,
    });
  } catch (error) {
    console.error('POST /api/gift-codes/share error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate gift code' },
      { status: 500 },
    );
  }
}
