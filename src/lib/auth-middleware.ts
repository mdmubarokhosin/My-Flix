import { NextRequest, NextResponse } from 'next/server';
import { db } from './firebase-server';

export interface AuthResult {
  userId: string;
  user: Record<string, unknown>;
}

/**
 * Validates that a userId exists in the database and is not banned.
 * Extracts userId from query params or JSON body.
 */
export async function requireUser(request: Request): Promise<
  { response: NextResponse } | AuthResult
> {
  let userId = new URL(request.url).searchParams.get('userId');

  if (!userId) {
    try {
      const body = await request.json();
      userId = body.userId;
    } catch {
      // Body not available or not JSON
    }
  }

  if (!userId) {
    return {
      response: NextResponse.json(
        { error: 'Authentication required: userId is missing' },
        { status: 401 },
      ),
    };
  }

  try {
    const user = await db.get<Record<string, unknown>>(`users/${userId}`);
    if (!user) {
      return {
        response: NextResponse.json(
          { error: 'User not found' },
          { status: 404 },
        ),
      };
    }

    if (user.isBanned) {
      return {
        response: NextResponse.json(
          { error: 'Your account has been suspended' },
          { status: 403 },
        ),
      };
    }

    return { userId, user };
  } catch {
    return {
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      ),
    };
  }
}

/**
 * Verifies Telegram WebApp initData using HMAC-SHA256.
 * Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export async function verifyTelegramInitDataAsync(
  initData: string,
  botToken: string,
): Promise<{ valid: boolean; userId?: number; error?: string }> {
  if (!initData || !botToken) {
    return { valid: false, error: 'Missing initData or botToken' };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(botToken),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(dataCheckString),
    );
    const computedHash = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (computedHash !== hash) {
      return { valid: false, error: 'Invalid signature' };
    }

    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) {
      return { valid: false, error: 'InitData expired (older than 5 minutes)' };
    }

    const userStr = params.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return { valid: true, userId: user.id };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: 'Verification failed: ' + String(err) };
  }
}

/**
 * Sensitive settings keys that should never be exposed to clients.
 */
export const SENSITIVE_SETTINGS_KEYS = [
  'adminPassword',
  'tmdbApiKey',
  'imdbApiKey',
  'bohudurApiKey',
  'telegramBotToken',
];

/**
 * Strips sensitive keys from a settings object.
 */
export function stripSensitiveSettings(
  settings: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized = { ...settings };
  for (const key of SENSITIVE_SETTINGS_KEYS) {
    delete sanitized[key];
  }
  return sanitized;
}
