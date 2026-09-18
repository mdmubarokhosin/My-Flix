import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { generateGiftCode } from '@/lib/video-utils';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'edge';

// Public GET: return only aggregate counts — no code details exposed
export async function GET() {
  try {
    const data = await db.get<Record<string, any>>('gifts');
    const codes = db.objectToArray<{
      status: string;
      createdAt: number;
    }>(data);

    const total = codes.length;
    const active = codes.filter((c) => c.status === 'active').length;

    return NextResponse.json({ active, total });
  } catch (error) {
    console.error('GET /api/gift-codes error:', error);
    return NextResponse.json({ error: 'Failed to fetch gift codes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { amount, package: packageName, count = 1 } = await req.json();
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    const created: Array<{ id: string; code: string; amount: number; package: string }> = [];
    const numCount = Math.min(Number(count), 50);

    for (let i = 0; i < numCount; i++) {
      const id = db.generateId();
      const code = generateGiftCode();
      await db.set(`gifts/${id}`, {
        code,
        amount: Number(amount),
        package: packageName || 'General',
        status: 'active',
        createdAt: Date.now(),
      });
      created.push({ id, code, amount: Number(amount), package: packageName || 'General' });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/gift-codes error:', error);
    return NextResponse.json({ error: 'Failed to create gift codes' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Gift code ID is required' }, { status: 400 });
    }
    await db.remove(`gifts/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/gift-codes error:', error);
    return NextResponse.json({ error: 'Failed to delete gift code' }, { status: 500 });
  }
}
