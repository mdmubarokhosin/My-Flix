import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';

export const runtime = 'edge';

// POST /api/admin/login — authenticate admin via POST body
// SECURITY FIX: Password is read from request body only, never from URL query params.
// NOTE: We read the body directly here instead of using verifyAdmin(), because
// verifyAdmin() uses req.clone().json() which fails after the body stream is consumed.
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const settings = await db.get<Record<string, unknown>>('settings');
    const storedPassword = settings?.adminPassword as string | undefined;

    // If no password is configured in settings, deny access entirely.
    // There is no default fallback password.
    if (!storedPassword) {
      return NextResponse.json({ error: 'No admin password configured' }, { status: 401 });
    }

    if (password !== storedPassword) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/admin/login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
