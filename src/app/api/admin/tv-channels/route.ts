import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import type { TvChannel } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/tv-channels — list all TV channels, sorted by newest first
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const data = await db.get<Record<string, Omit<TvChannel, 'id'>>>('tvChannels');
    const channels = db.objectToArray(data).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    );
    return NextResponse.json(channels);
  } catch (error) {
    console.error('GET /api/admin/tv-channels error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TV channels' },
      { status: 500 },
    );
  }
}

// POST /api/admin/tv-channels — create a new TV channel
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, ...data } = body;

    if (!data.name || typeof data.name !== 'string') {
      return NextResponse.json(
        { error: 'name is required and must be a string' },
        { status: 400 },
      );
    }
    if (!data.url || typeof data.url !== 'string') {
      return NextResponse.json(
        { error: 'url is required and must be a string' },
        { status: 400 },
      );
    }

    const payload = {
      ...data,
      order: Number(data.order) || 0,
      active: data.active !== undefined ? Boolean(data.active) : true,
      views: 0,
      createdAt: Date.now(),
    };

    const id = await db.push('tvChannels', payload);
    return NextResponse.json({ id, ...payload }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/tv-channels error:', error);
    return NextResponse.json(
      { error: 'Failed to create TV channel' },
      { status: 500 },
    );
  }
}
