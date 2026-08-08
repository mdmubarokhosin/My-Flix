import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';

export const runtime = 'edge';

// GET /api/tv-channels/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await db.get<any>(`tvChannels/${id}`);
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ id, ...data });
  } catch (error) {
    console.error('GET tv-channels/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch channel' }, { status: 500 });
  }
}

// PUT /api/tv-channels/[id] — supports both admin updates and view increments
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await getBody<{
      name?: string; url?: string; logo?: string; order?: number; active?: boolean;
      genre?: string; language?: string; country?: string; views?: number;
      adminPassword: string;
    }>(req);

    // If views increment (from frontend, adminPassword may be empty)
    if (body.views !== undefined && !body.name && !body.url) {
      // Simple view count increment — allow without admin password
      await db.update(`tvChannels/${id}`, { views: body.views });
      return NextResponse.json({ success: true });
    }

    // All other updates require admin
    const settings = await db.get<any>('settings');
    if (!settings?.adminPassword || settings.adminPassword !== body.adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.url !== undefined) updateData.url = body.url.trim();
    if (body.logo !== undefined) updateData.logo = body.logo.trim();
    if (body.order !== undefined) updateData.order = body.order;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.genre !== undefined) updateData.genre = body.genre.trim();
    if (body.language !== undefined) updateData.language = body.language.trim();
    if (body.country !== undefined) updateData.country = body.country.trim();

    await db.update(`tvChannels/${id}`, updateData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT tv-channels/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
  }
}

// DELETE /api/tv-channels/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const adminPw = req.headers.get('X-Admin-Password');
    const settings = await db.get<any>('settings');
    if (!settings?.adminPassword || settings.adminPassword !== adminPw) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await db.remove(`tvChannels/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE tv-channels/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
  }
}
