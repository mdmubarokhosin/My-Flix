import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import {
  issueAdminToken,
  setAdminCookie,
  setAdminPassword,
  verifyPassword,
} from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';

// POST /api/admin/login
// - Verifies password against bcrypt hash (or legacy plaintext, with migration).
// - On success, issues a JWT and sets it as an httpOnly cookie.
// - Rate-limited: 5 attempts per IP per minute (brute-force protection).
export async function POST(req: NextRequest) {
  // Rate limit: 5 login attempts / IP / minute
  const ip = req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const rl = rateLimit(`admin-login:${ip}`, { max: 5, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const settings = await db.get<Record<string, unknown>>('settings');
    if (!settings) {
      return NextResponse.json({ error: 'No admin password configured' }, { status: 401 });
    }

    const storedHash = settings.adminPasswordHash as string | undefined;
    const storedPlaintext = settings.adminPassword as string | undefined;
    if (!storedHash && !storedPlaintext) {
      return NextResponse.json({ error: 'No admin password configured' }, { status: 401 });
    }

    let ok = false;
    if (storedHash) {
      ok = await verifyPassword(password, storedHash);
    } else if (storedPlaintext) {
      ok = password === storedPlaintext;
      if (ok) {
        // Migrate plaintext → bcrypt hash in the background.
        try {
          await setAdminPassword(password);
        } catch {
          // Non-fatal.
        }
      }
    }

    if (!ok) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    // Issue JWT and set httpOnly cookie.
    const token = await issueAdminToken();
    const res = NextResponse.json({ success: true });
    return setAdminCookie(res, token);
  } catch (error) {
    console.error('POST /api/admin/login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
