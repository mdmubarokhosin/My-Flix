import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import type { CoinPackage } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/coin-packages — list all coin packages, sorted by newest first
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const data = await db.get<Record<string, Omit<CoinPackage, 'id'>>>('coinPackages');
    const packages = db.objectToArray(data).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    );
    return NextResponse.json(packages);
  } catch (error) {
    console.error('GET /api/admin/coin-packages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coin packages' },
      { status: 500 },
    );
  }
}

// POST /api/admin/coin-packages — create a new coin package
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, ...data } = body;

    if (!data.name || typeof data.name !== 'string') {
      return NextResponse.json(
        { error: 'name is required and must be a string' },
        { status: 400 },
      );
    }
    if (data.coins === undefined || data.coins === null) {
      return NextResponse.json(
        { error: 'coins is required' },
        { status: 400 },
      );
    }
    if (data.price === undefined || data.price === null) {
      return NextResponse.json(
        { error: 'price is required' },
        { status: 400 },
      );
    }

    const payload: Omit<CoinPackage, 'id'> = {
      name: data.name as string,
      coins: Number(data.coins) || 0,
      price: Number(data.price) || 0,
      popular: data.popular !== undefined ? Boolean(data.popular) : false,
      createdAt: Date.now(),
    };

    const id = await db.push('coinPackages', payload);
    return NextResponse.json({ id, ...payload }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/coin-packages error:', error);
    return NextResponse.json(
      { error: 'Failed to create coin package' },
      { status: 500 },
    );
  }
}
