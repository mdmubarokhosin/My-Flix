import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';

export const runtime = 'edge';

// GET /api/tv-channels — list active channels (public)
export async function GET() {
  try {
    const data = await db.get<Record<string, any>>('tvChannels');
    const channels = db.objectToArray<any>(data)
      .filter((c: any) => c.active !== false)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    return NextResponse.json(channels);
  } catch (error) {
    console.error('GET tv-channels error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/tv-channels — create new channel (admin only)
export async function POST(req: NextRequest) {
  try {
    const body = await getBody<{
      name: string; url: string; logo?: string; order?: number; active?: boolean;
      genre?: string; language?: string; country?: string; adminPassword: string;
    }>(req);

    const settings = await db.get<any>('settings');
    if (!settings?.adminPassword || settings.adminPassword !== body.adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!body.name?.trim()) return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    if (!body.url?.trim() || !body.url.includes('http')) return NextResponse.json({ error: 'Valid stream URL is required' }, { status: 400 });

    const channelData = {
      name: body.name.trim(),
      url: body.url.trim(),
      logo: body.logo?.trim() || '',
      order: typeof body.order === 'number' ? body.order : 0,
      active: body.active !== false,
      genre: body.genre?.trim() || '',
      language: body.language?.trim() || '',
      country: body.country?.trim() || '',
      views: 0,
      createdAt: Date.now(),
    };

    const id = await db.push('tvChannels', channelData);
    return NextResponse.json({ id, ...channelData }, { status: 201 });
  } catch (error) {
    console.error('POST tv-channels error:', error);
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 });
  }
}
