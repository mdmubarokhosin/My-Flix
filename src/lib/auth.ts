import { NextRequest, NextResponse } from 'next/server';
import { db } from './firebase-server';
import { SignJWT, jwtVerify } from 'jose';

// ============================================================
// Admin authentication (production-grade)
// ------------------------------------------------------------
// - Passwords are stored as bcrypt hashes (NOT plaintext) in
//   `settings.adminPasswordHash`.
// - For backwards-compatibility, if `adminPasswordHash` is missing
//   but `adminPassword` (plaintext) is present, we honor it on the
//   FIRST login, then transparently migrate it to a bcrypt hash.
// - On successful login the server issues a short-lived JWT signed
//   with ADMIN_JWT_SECRET. The token is sent as an httpOnly cookie
//   named `myflix_admin_session`.
// - All admin API routes accept EITHER:
//     (a) the cookie JWT, OR
//     (b) the X-Admin-Token header (for non-browser clients), OR
//     (c) for backwards compatibility, the X-Admin-Password header /
//         body.adminPassword — but only when the value is the *raw*
//         password, which we hash-compare server-side. This path is
//         kept so existing clients keep working during migration.
// ============================================================

const ADMIN_COOKIE_NAME = 'myflix_admin_session';
const ADMIN_TOKEN_HEADER = 'x-admin-token';
const ADMIN_PASSWORD_HEADER = 'x-admin-password';
const ADMIN_TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.ADMIN_JWT_SECRET ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'dev-only-unsafe-secret-please-set-ADMIN_JWT_SECRET';
  return new TextEncoder().encode(secret);
}

/** Constant-time string comparison. Falls back to `===` if lengths differ. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return a === b;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Hash a password using bcrypt.
 * Uses bcryptjs (pure JS, Edge-runtime compatible).
 */
async function hashPassword(plaintext: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  const rounds = Number(process.env.BCRYPT_ROUNDS || '10');
  const salt = await bcrypt.genSalt(rounds);
  return bcrypt.hash(plaintext, salt);
}

/**
 * Verify a password against a bcrypt hash.
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  try {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}

/**
 * Issue a JWT admin session token.
 */
export async function issueAdminToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + ADMIN_TOKEN_TTL_SECONDS)
    .setIssuer('myflix-admin')
    .sign(getJwtSecret());
}

/**
 * Verify a JWT admin session token. Returns true if valid.
 */
export async function verifyAdminToken(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getJwtSecret(), { issuer: 'myflix-admin' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Set the admin session cookie on a NextResponse.
 */
export function setAdminCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_TOKEN_TTL_SECONDS,
  });
  return response;
}

/**
 * Clear the admin session cookie.
 */
export function clearAdminCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

/**
 * Get the admin cookie name (for client-side logout).
 */
export function getAdminCookieName(): string {
  return ADMIN_COOKIE_NAME;
}

/**
 * Verify admin request — accepts JWT (cookie or X-Admin-Token header) OR
 * raw password (X-Admin-Password header / body.adminPassword) for backwards
 * compatibility.
 *
 * Side effect: if the password path is used and only `settings.adminPassword`
 * (plaintext) exists, transparently migrates it to `settings.adminPasswordHash`
 * and clears the plaintext value.
 */
export async function verifyAdmin(request: NextRequest): Promise<boolean> {
  try {
    // Path 1: JWT in cookie
    const cookieToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (cookieToken && (await verifyAdminToken(cookieToken))) {
      return true;
    }

    // Path 2: JWT in X-Admin-Token header
    const headerToken = request.headers.get(ADMIN_TOKEN_HEADER);
    if (headerToken && (await verifyAdminToken(headerToken))) {
      return true;
    }

    // Path 3: raw password (backwards-compatibility) — body or header
    let providedPassword: string | undefined;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const body = await request.clone().json();
        providedPassword = body.adminPassword;
      } catch {
        // ignore
      }
    }
    if (!providedPassword) {
      providedPassword = request.headers.get(ADMIN_PASSWORD_HEADER) || undefined;
    }
    if (!providedPassword) return false;

    const settings = await db.get<Record<string, unknown>>('settings');
    if (!settings) return false;

    const storedHash = settings.adminPasswordHash as string | undefined;
    const storedPlaintext = settings.adminPassword as string | undefined;
    if (!storedHash && !storedPlaintext) return false;

    let ok = false;
    if (storedHash) {
      ok = await verifyPassword(providedPassword, storedHash);
    } else if (storedPlaintext) {
      // Legacy plaintext fallback — use constant-time compare and migrate.
      ok = safeEqual(providedPassword, storedPlaintext);
      if (ok) {
        // Migrate to bcrypt hash in the background.
        try {
          const newHash = await hashPassword(providedPassword);
          await db.update('settings', {
            adminPasswordHash: newHash,
            adminPassword: null, // remove plaintext
          } as Record<string, unknown>);
        } catch {
          // Migration failure is non-fatal.
        }
      }
    }
    return ok;
  } catch {
    return false;
  }
}

/**
 * Hash-and-store a new admin password (used by settings update routes).
 */
export async function setAdminPassword(plaintext: string): Promise<void> {
  const hash = await hashPassword(plaintext);
  await db.update('settings', {
    adminPasswordHash: hash,
    adminPassword: null,
  } as Record<string, unknown>);
}

/**
 * Middleware helper: reject request if not admin.
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const ok = await verifyAdmin(request);
  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 401 });
  }
  return null;
}

/**
 * Reject request if user is banned. Returns null if not banned.
 */
export async function requireNotBanned(userId: string | null): Promise<NextResponse | null> {
  if (!userId) return null;
  try {
    const user = await db.get<Record<string, unknown>>(`users/${userId}`);
    if (user?.isBanned) {
      return NextResponse.json({ error: 'Your account has been banned.' }, { status: 403 });
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sanitize a string input: trim whitespace, remove null bytes, limit length.
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/\0/g, '')
    .slice(0, 1000);
}

/**
 * Validate a userId: must be non-empty, alphanumeric (with hyphens/underscores), max 100 chars.
 */
export function validateUserId(userId: string | null): boolean {
  if (!userId || userId.length === 0 || userId.length > 100) return false;
  return /^[a-zA-Z0-9_-]+$/.test(userId);
}
