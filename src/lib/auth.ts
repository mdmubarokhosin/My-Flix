import { NextRequest, NextResponse } from 'next/server';
import { db } from './firebase-server';

// TODO: In production, replace plaintext password comparison with proper JWT/session-based authentication.
// The current admin password check is suitable for development/demo only.
// SECURITY: Passwords should be hashed (e.g., using bcrypt) before storing.
// In production, store only password hashes and compare using timing-safe comparison functions.

// SECURITY: Admin password must be passed in the request body (POST/PUT/DELETE).
// Query parameters are NO LONGER accepted — they are logged in web server access
// logs, browser history, and proxy logs, exposing credentials.

/**
 * Verify admin password from request body only.
 * Returns true if the provided password matches the stored admin password.
 *
 * SECURITY FIX: Password is only read from the POST/PUT/DELETE request body,
 * never from URL query parameters (which are visible in logs and browser history).
 *
 * IMPORTANT: If no admin password is configured in the database settings,
 * authentication is denied. There is no default fallback password.
 */
export async function verifyAdmin(request: NextRequest): Promise<boolean> {
  try {
    let providedPassword: string | undefined;

    // Priority 1: Read adminPassword from request body (POST/PUT/DELETE)
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const body = await request.clone().json();
        providedPassword = body.adminPassword;
      } catch {
        // Body not available or not JSON
      }
    }

    // Priority 2: Read from X-Admin-Password header (for GET requests)
    // Headers are more secure than query params — not visible in URL or browser history.
    if (!providedPassword) {
      providedPassword = request.headers.get('x-admin-password') || undefined;
    }

    if (!providedPassword) {
      return false;
    }

    const settings = await db.get<Record<string, unknown>>('settings');
    const storedPassword = settings?.adminPassword as string | undefined;

    // If no password is configured in settings, deny access entirely.
    // There is no default fallback password.
    if (!storedPassword) {
      return false;
    }

    return providedPassword === storedPassword;
  } catch {
    return false;
  }
}

/**
 * Middleware helper: reject request if not admin.
 * Pass adminPassword in the request body (POST/PUT/DELETE with JSON content-type).
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Admin password required.' }, { status: 401 });
  }
  return null;
}

/**
 * Middleware helper: reject request if user is banned.
 * Returns null if user is not banned or userId is null.
 */
export async function requireNotBanned(userId: string | null): Promise<NextResponse | null> {
  if (!userId) return null;
  try {
    const user = await db.get<Record<string, any>>(`users/${userId}`);
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
