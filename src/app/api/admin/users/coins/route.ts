import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import { addTransaction } from '@/lib/transaction-utils';

export const runtime = 'edge';

// POST /api/admin/users/coins — add or subtract coins from a user
// Body: { userId, amount, reason }
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, userId, amount, reason } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required and must be a string' },
        { status: 400 },
      );
    }
    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'amount is required' },
        { status: 400 },
      );
    }
    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'reason is required and must be a string' },
        { status: 400 },
      );
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount === 0) {
      return NextResponse.json(
        { error: 'amount must be a non-zero number' },
        { status: 400 },
      );
    }

    // Fetch the user to check existence and current balance
    const user = await db.get<Record<string, unknown>>(`users/${userId}`);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentBalance = Number(user.balance) || 0;
    const newBalance = currentBalance + numericAmount;

    // Prevent negative balance
    if (newBalance < 0) {
      return NextResponse.json(
        { error: 'Insufficient balance: operation would result in negative balance' },
        { status: 400 },
      );
    }

    // Update balance
    await db.update(`users/${userId}`, { balance: newBalance });

    // Record the transaction
    await addTransaction(db, userId as string, {
      type: 'admin',
      title: reason as string,
      amount: numericAmount,
    });

    return NextResponse.json({
      success: true,
      userId,
      previousBalance: currentBalance,
      newBalance,
      amount: numericAmount,
      reason,
    });
  } catch (error) {
    console.error('POST /api/admin/users/coins error:', error);
    return NextResponse.json(
      { error: 'Failed to update user coins' },
      { status: 500 },
    );
  }
}
