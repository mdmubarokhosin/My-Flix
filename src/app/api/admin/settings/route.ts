import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'edge';

// GET /api/admin/settings — fetch all settings
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const settings = await db.get<Record<string, unknown>>('settings');
    return NextResponse.json(settings || {});
  } catch (error) {
    console.error('GET /api/admin/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 },
    );
  }
}

// PUT /api/admin/settings — update settings (merge)
export async function PUT(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, ...data } = body;

    // Build update object, only allow known setting keys
    const allowedKeys = [
      'adminPassword',
      'tmdbApiKey',
      'imdbApiKey',
      'bohudurApiKey',
      'telegramBotToken',
      'defaultLanguage',
      'coinsPerAd',
      'adsNotice',
    ];

    const updateData: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (data[key] !== undefined) {
        if (key === 'coinsPerAd') {
          updateData[key] = Number(data[key]) || 0;
        } else {
          updateData[key] = data[key];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    await db.update('settings', updateData);
    const updated = await db.get<Record<string, unknown>>('settings');
    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 },
    );
  }
}
