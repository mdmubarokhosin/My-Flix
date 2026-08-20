import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';

// GET /api/coin-packages — public, returns active packages
export const runtime = 'edge';

export async function GET() {
  try {
    const data = await db.get<Record<string, any>>('coinPackages');
    const packages = db.objectToArray<any>(data);
    return NextResponse.json(packages);
  } catch (error) {
    console.error('GET /api/coin-packages error:', error);
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}

// POST /api/coin-packages — admin only, create new package
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { name, coins, price, popular } = body;

    if (!name?.trim() || !coins || !price) {
      return NextResponse.json({ error: 'name, coins, and price are required' }, { status: 400 });
    }

    const id = db.generateId();
    const pkg = {
      name: name.trim(),
      coins: Number(coins),
      price: Number(price),
      popular: !!popular,
      createdAt: Date.now(),
    };

    await db.set(`coinPackages/${id}`, pkg);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('POST /api/coin-packages error:', error);
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 });
  }
}

// PUT /api/coin-packages — admin only, update a package
export async function PUT(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, name, coins, price, popular } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (coins !== undefined) updateData.coins = Number(coins);
    if (price !== undefined) updateData.price = Number(price);
    if (popular !== undefined) updateData.popular = !!popular;

    await db.update(`coinPackages/${id}`, updateData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/coin-packages error:', error);
    return NextResponse.json({ error: 'Failed to update package' }, { status: 500 });
  }
}

// DELETE /api/coin-packages — admin only
export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await db.remove(`coinPackages/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/coin-packages error:', error);
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 });
  }
}
