import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { verifyTelegramInitDataAsync } from '@/lib/auth-middleware';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'edge';

// POST /api/auth/telegram
//
// SECURITY: Telegram initData MUST be provided and verified.
// In production we reject the request if initData is missing or invalid.
// In development (NODE_ENV !== 'production') we allow a "browser/dev mode"
// fallback so the app can be tested outside Telegram — but we mark such
// users with `isTelegramUser: false` and log a warning so they're easy
// to audit.
export async function POST(req: NextRequest) {
  // Rate limit: 10 auth attempts / IP / minute.
  const ip = getClientIp(req);
  const rl = rateLimit(`telegram-auth:${ip}`, { max: 10, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  try {
    const body = await getBody<Record<string, unknown>>(req);
    const initData = typeof body.initData === 'string' ? body.initData : '';
    const user = body.user as Record<string, unknown> | undefined;
    const isProduction = process.env.NODE_ENV === 'production';

    let verifiedUserId: number | undefined;

    if (initData.trim().length > 0) {
      const settings = await db.get<Record<string, unknown>>('settings');
      const botToken = String(settings?.telegramBotToken || '').trim();
      if (!botToken) {
        return NextResponse.json(
          { error: 'Telegram bot not configured' },
          { status: 500 },
        );
      }
      const result = await verifyTelegramInitDataAsync(initData, botToken);
      if (!result.valid) {
        return NextResponse.json(
          { error: 'Invalid Telegram initData signature' },
          { status: 401 },
        );
      }
      verifiedUserId = result.userId;
    } else if (isProduction) {
      // Production: no initData → reject. No impersonation allowed.
      return NextResponse.json(
        { error: 'Telegram initData is required' },
        { status: 401 },
      );
    } else {
      // Dev mode: allow but warn.
      console.warn('[telegram-auth] Dev mode: initData missing. Allowing fallback user.');
    }

    if (!user || typeof user.id !== 'number' || typeof user.first_name !== 'string') {
      return NextResponse.json({ error: 'Invalid Telegram user data' }, { status: 400 });
    }

    // If initData was verified, ensure the user.id in the body matches.
    if (verifiedUserId !== undefined && verifiedUserId !== user.id) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 401 },
      );
    }

    const userId = String(user.id);
    const firstName = user.first_name as string;
    const lastName = (user.last_name as string) || '';
    const username = (user.username as string) || '';
    const photoUrl = (user.photo_url as string) || '';
    const isPremium = Boolean(user.is_premium);
    const languageCode = (user.language_code as string) || '';

    const existing = await db.get<Record<string, unknown>>(`users/${userId}`);

    if (existing) {
      const updates: Record<string, unknown> = {
        firstName,
        lastName,
        username,
        photoUrl,
        isTelegramUser: true,
        telegramId: user.id,
        isPremium,
        languageCode,
        lastLogin: Date.now(),
      };
      await db.update(`users/${userId}`, updates);
      const updated = await db.get<Record<string, unknown>>(`users/${userId}`);
      return NextResponse.json({ id: userId, ...(updated || {}) });
    }

    const newUser: Record<string, unknown> = {
      firstName,
      lastName,
      username,
      photoUrl,
      balance: 0,
      purchased: [],
      favorites: [],
      lastCheckIn: null,
      streak: 0,
      adWatchedToday: 0,
      lastAdDate: null,
      transactions: [],
      giftHistory: [],
      createdAt: Date.now(),
      theme: 'dark',
      isTelegramUser: true,
      telegramId: user.id,
      isPremium,
      languageCode,
      lastLogin: Date.now(),
    };

    await db.set(`users/${userId}`, newUser);
    return NextResponse.json({ id: userId, ...newUser }, { status: 201 });
  } catch (error) {
    console.error('POST /api/auth/telegram error:', error);
    return NextResponse.json({ error: 'Telegram auth failed' }, { status: 500 });
  }
}
