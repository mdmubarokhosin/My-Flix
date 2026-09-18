import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import type { GiftCode } from '@/lib/types';

export const runtime = 'edge';

// All routes use the unified `gifts` path (the same path the user-facing
// /api/gift-codes/redeem reads from). The [id] parameter is the gift code
// string itself (which we use as the Firebase key).

// GET /api/admin/gift-codes/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;
  try {
    const code = await db.get<Omit<GiftCode, 'id'>>(`gifts/${id}`);
    if (!code) {
      return NextResponse.json({ error: 'Gift code not found' }, { status: 404 });
    }
    return NextResponse.json({ id, ...code });
  } catch (error) {
    console.error(`GET /api/admin/gift-codes/${id} error:`, error);
    return NextResponse.json({ error: 'Failed to fetch gift code' }, { status: 500 });
  }
}

// PUT /api/admin/gift-codes/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;
  try {
    const existing = await db.get(`gifts/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Gift code not found' }, { status: 404 });
    }
    const body = await getBody<Record<string, unknown>>(req);
    const { id: _id, createdAt: _createdAt, ...data } = body;
    if (data.amount !== undefined) data.amount = Number(data.amount);
    await db.update(`gifts/${id}`, data);
    const updated = await db.get<Omit<GiftCode, 'id'>>(`gifts/${id}`);
    return NextResponse.json({ id, ...updated });
  } catch (error) {
    console.error(`PUT /api/admin/gift-codes/${id} error:`, error);
    return NextResponse.json({ error: 'Failed to update gift code' }, { status: 500 });
  }
}

// DELETE /api/admin/gift-codes/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;
  try {
    const existing = await db.get(`gifts/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Gift code not found' }, { status: 404 });
    }
    await db.remove(`gifts/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/admin/gift-codes/${id} error:`, error);
    return NextResponse.json({ error: 'Failed to delete gift code' }, { status: 500 });
  }
}
