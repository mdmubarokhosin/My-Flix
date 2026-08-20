import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import type { GiftCode } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/gift-codes/[id] — get a single gift code
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const code = await db.get<Omit<GiftCode, 'id'>>(`giftCodes/${id}`);
    if (!code) {
      return NextResponse.json({ error: 'Gift code not found' }, { status: 404 });
    }
    return NextResponse.json({ id, ...code });
  } catch (error) {
    console.error(`GET /api/admin/gift-codes/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch gift code' },
      { status: 500 },
    );
  }
}

// PUT /api/admin/gift-codes/[id] — update a gift code
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`giftCodes/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Gift code not found' }, { status: 404 });
    }

    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, id: _id, createdAt: _createdAt, ...data } = body as Record<string, unknown>;

    // Ensure amount is stored as a number
    if (data.amount !== undefined) {
      data.amount = Number(data.amount);
    }

    await db.update(`giftCodes/${id}`, data);
    const updated = await db.get<Omit<GiftCode, 'id'>>(`giftCodes/${id}`);
    return NextResponse.json({ id, ...updated });
  } catch (error) {
    console.error(`PUT /api/admin/gift-codes/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to update gift code' },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/gift-codes/[id] — delete a gift code
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`giftCodes/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Gift code not found' }, { status: 404 });
    }

    await db.remove(`giftCodes/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/admin/gift-codes/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete gift code' },
      { status: 500 },
    );
  }
}
