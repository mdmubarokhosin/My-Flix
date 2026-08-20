import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import type { GiftCode } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/gift-codes — list all gift codes, sorted by newest first
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const data = await db.get<Record<string, Omit<GiftCode, 'id'>>>('giftCodes');
    const codes = db.objectToArray(data).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    );
    return NextResponse.json(codes);
  } catch (error) {
    console.error('GET /api/admin/gift-codes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gift codes' },
      { status: 500 },
    );
  }
}

// POST /api/admin/gift-codes — create a new gift code
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, ...data } = body;

    if (data.amount === undefined || data.amount === null) {
      return NextResponse.json(
        { error: 'amount is required' },
        { status: 400 },
      );
    }

    const payload: Omit<GiftCode, 'id'> = {
      amount: Number(data.amount) || 0,
      package: String(data.package || ''),
      status: 'active',
      createdAt: Date.now(),
    };

    const id = await db.push('giftCodes', payload);
    return NextResponse.json({ id, ...payload }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/gift-codes error:', error);
    return NextResponse.json(
      { error: 'Failed to create gift code' },
      { status: 500 },
    );
  }
}
