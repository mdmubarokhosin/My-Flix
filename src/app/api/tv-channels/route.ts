import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'edge';

// GET /api/tv-channels — list active channels (public).
export async function GET() {
  try {
    const data = await db.get<Record<string, { active?: boolean; order?: number }>>('tvChannels');
    const channels = db
      .objectToArray<{ active?: boolean; order?: number }>(data)
      .filter((c) => c.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return NextResponse.json(channels);
  } catch (error) {
    console.error('GET tv-channels error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/tv-channels — create new channel (admin only).
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await getBody<{
      name: string; url: string; logo?: string; order?: number; active?: boolean;
      genre?: string; language?: string; country?: string;
    }>(req);

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }
    const url = (body.url || '').trim();
    if (!url) {
      return NextResponse.json({ error: 'Stream URL is required' }, { status: 400 });
    }
    // Validate URL.
    try {
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return NextResponse.json({ error: 'URL must use http or https' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const channelData = {
      name: body.name.trim(),
      url,
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
