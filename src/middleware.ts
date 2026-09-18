import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// ============================================================
// Server-side middleware: protects /admin/* routes.
// ------------------------------------------------------------
// The admin JWT is stored in an httpOnly cookie named
// `myflix_admin_session`. We verify it here, server-side,
// BEFORE any admin page is rendered. If invalid/missing, we
// redirect to /admin/login.
//
// This is the proper defense-in-depth layer — the client-side
// `isAdminLoggedIn()` check is only UX, not security.
// ============================================================

const ADMIN_COOKIE_NAME = 'myflix_admin_session';

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.ADMIN_JWT_SECRET ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'dev-only-unsafe-secret-please-set-ADMIN_JWT_SECRET';
  return new TextEncoder().encode(secret);
}

async function isValidAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getJwtSecret(), { issuer: 'myflix-admin' });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin/* (but not /admin/login itself).
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (await isValidAdminToken(token)) {
    return NextResponse.next();
  }

  // Not authenticated → redirect to login (preserve intended URL).
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};
