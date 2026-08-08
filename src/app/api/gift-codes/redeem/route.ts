import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // Authenticate and validate user
    const auth = await requireUser(req.clone());
    if ('response' in auth) return auth.response;

    // Explicit ban check (defense-in-depth)
    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // TODO: Add rate limiting to prevent brute-force guessing of gift codes

    // Find the gift code
    const allGifts = await db.get<Record<string, Record<string, any>>>('gifts');
    if (!allGifts) {
      return NextResponse.json({ error: 'No gift codes found' }, { status: 404 });
    }

    let giftId: string | null = null;
    let giftData: Record<string, any> | null = null;

    const searchCode = String(code).trim().toUpperCase();
    const searchNoDash = searchCode.replace(/[^A-Z0-9]/g, '');

    for (const [id, gift] of Object.entries(allGifts)) {
      const storedCode = String(gift.code || '').toUpperCase();
      const storedNoDash = storedCode.replace(/[^A-Z0-9]/g, '');

      // Match by stored code field (preferred) or by ID
      const isMatch =
        storedCode === searchCode ||
        storedNoDash === searchNoDash ||
        id.toUpperCase() === searchCode ||
        id.toUpperCase().replace(/[^A-Z0-9]/g, '') === searchNoDash;

      if (isMatch) {
        giftId = id;
        giftData = gift;
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

    // Credit user FIRST, then mark code as used
    const userId = auth.userId;
    const user = await db.get<Record<string, any>>(`users/${userId}`);
    if (!user) {
      return NextResponse.json({ error: 'User not found. Please open the app first to create your account.' }, { status: 404 });
    }

    const balance = Number(user.balance) || 0;
    const transactions = (user.transactions as Record<string, any>[]) || [];
    const giftHistory = (user.giftHistory as Record<string, any>[]) || [];

    transactions.unshift({
      type: 'redeem',
      title: `Gift Code: ${code}`,
      amount,
      time: Date.now(),
    });

    giftHistory.unshift({
      code,
      amount,
      time: Date.now(),
    });

    await db.update(`users/${userId}`, {
      balance: balance + amount,
      transactions: transactions.slice(0, 50),
      giftHistory: giftHistory.slice(0, 50),
    });

    // Then mark code as used
    await db.update(`gifts/${giftId}`, {
      status: 'used',
      redeemedBy: userId,
      redeemedAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      amount,
      newBalance: balance + amount,
      package: giftData.package,
    });
  } catch (error) {
    console.error('POST /api/gift-codes/redeem error:', error);
    return NextResponse.json({ error: 'Redemption failed' }, { status: 500 });
  }
}
