import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import type { CoinPackage } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/coin-packages/[id] — get a single coin package
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const pkg = await db.get<Omit<CoinPackage, 'id'>>(`coinPackages/${id}`);
    if (!pkg) {
      return NextResponse.json({ error: 'Coin package not found' }, { status: 404 });
    }
    return NextResponse.json({ id, ...pkg });
  } catch (error) {
    console.error(`GET /api/admin/coin-packages/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch coin package' },
      { status: 500 },
    );
  }
}

// PUT /api/admin/coin-packages/[id] — update a coin package
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`coinPackages/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Coin package not found' }, { status: 404 });
    }

    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, id: _id, createdAt: _createdAt, ...data } = body as Record<string, unknown>;

    // Ensure numeric fields are stored as numbers
    if (data.coins !== undefined) data.coins = Number(data.coins);
    if (data.price !== undefined) data.price = Number(data.price);

    await db.update(`coinPackages/${id}`, data);
    const updated = await db.get<Omit<CoinPackage, 'id'>>(`coinPackages/${id}`);
    return NextResponse.json({ id, ...updated });
  } catch (error) {
    console.error(`PUT /api/admin/coin-packages/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to update coin package' },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/coin-packages/[id] — delete a coin package
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`coinPackages/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Coin package not found' }, { status: 404 });
    }

    await db.remove(`coinPackages/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/admin/coin-packages/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete coin package' },
      { status: 500 },
    );
  }
}
