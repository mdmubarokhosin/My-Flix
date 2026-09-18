import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { DEFAULT_CATEGORIES } from '@/lib/types';
import { requireAdmin } from '@/lib/auth';
import { stripSensitiveSettings } from '@/lib/auth-middleware';

export const runtime = 'edge';

export async function GET() {
  try {
    const settings = await db.get<Record<string, any>>('settings');
    if (!settings) {
      return NextResponse.json({
        categories: DEFAULT_CATEGORIES,
      });
    }
    return NextResponse.json(stripSensitiveSettings(settings));
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const allowed = ['adminPassword', 'categories', 'tmdbApiKey', 'imdbApiKey', 'adsNotice', 'bohudurApiKey', 'defaultLanguage', 'coinsPerAd', 'telegramBotToken'];
    const updateData: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }
    await db.update('settings', updateData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
