import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { verifyTelegramInitDataAsync } from '@/lib/auth-middleware';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { initData, user } = body;

    // If initData is provided (Telegram Mini App mode), validate it
    if (initData && initData.trim().length > 0) {
      const settings = await db.get<Record<string, any>>('settings');
      const botToken = String(settings?.telegramBotToken || '').trim();

      if (!botToken) {
        console.error('Telegram bot token not configured in settings');
        return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 500 });
      }

      const result = await verifyTelegramInitDataAsync(initData, botToken);
      if (!result.valid) {
        console.error('Telegram initData verification failed:', result.error);
        return NextResponse.json({ error: 'Invalid Telegram initData signature' }, { status: 401 });
      }
    }
    // If initData is empty, proceed as before (browser/dev mode)

    if (!user || !user.id || !user.first_name) {
      return NextResponse.json({ error: 'Invalid Telegram user data' }, { status: 400 });
    }

    const userId = String(user.id);
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const username = user.username || '';
    const photoUrl = user.photo_url || '';
    const isPremium = user.is_premium || false;
    const languageCode = user.language_code || '';

    const existing: any = await db.get(`users/${userId}`);

    if (existing) {
      const updates: Record<string, any> = {
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
      if (existing.isTelegramUser) {
        updates.firstName = firstName;
        updates.lastName = lastName;
      }
      await db.update(`users/${userId}`, updates);
      const updated: any = await db.get(`users/${userId}`);
      return NextResponse.json({ id: userId, ...(updated || {}) });
    }

    const newUser = {
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
