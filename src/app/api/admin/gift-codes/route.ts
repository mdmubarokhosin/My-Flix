import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import { generateGiftCode } from '@/lib/video-utils';
import type { GiftCode } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/gift-codes — list all gift codes (from the unified `gifts` path).
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const data = await db.get<Record<string, Omit<GiftCode, 'id'>>>('gifts');
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

// POST /api/admin/gift-codes — create one or more new gift codes.
//
// The body can either include a custom `code` (string) or omit it,
// in which case we generate a secure `XXXX-XXXX-XXXX` code using
// crypto.getRandomValues().
//
// All codes are written to the unified `gifts` path (the same path
// `/api/gift-codes/redeem` reads from) and include a top-level `code`
// field so the redeem route can find them.
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await getBody<
      Record<string, unknown> & { code?: string; count?: number }
    >(req);
    const { code: customCode, count, ...rest } = body;

    if (rest.amount === undefined || rest.amount === null) {
      return NextResponse.json({ error: 'amount is required' }, { status: 400 });
    }
    const amount = Number(rest.amount) || 0;
    if (amount <= 0) {
      return NextResponse.json({ error: 'amount must be positive' }, { status: 400 });
    }
    const pkg = String(rest.package || 'Admin');
    const total = Math.min(Math.max(Number(count) || 1, 1), 50);

    const created: GiftCode[] = [];
    for (let i = 0; i < total; i++) {
      const codeStr = total === 1 && customCode ? String(customCode) : generateGiftCode();
      const payload: Omit<GiftCode, 'id'> = {
        code: codeStr,
        amount,
        package: pkg,
        status: 'active',
        createdAt: Date.now(),
      };
      // Use the code string as the Firebase key (so id == code, easy to look up).
      await db.set(`gifts/${codeStr}`, payload);
      created.push({ id: codeStr, ...payload });
    }

    return NextResponse.json(
      total === 1 ? created[0] : { created, count: created.length },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/admin/gift-codes error:', error);
    return NextResponse.json(
      { error: 'Failed to create gift code' },
      { status: 500 },
    );
  }
}
