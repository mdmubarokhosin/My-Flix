import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'edge';

// GET /api/tv-channels/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await db.get<Record<string, unknown>>(`tvChannels/${id}`);
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ id, ...data });
  } catch (error) {
    console.error('GET tv-channels/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch channel' }, { status: 500 });
  }
}

// PUT /api/tv-channels/[id] — admin-only updates.
// View-count increments are handled by a separate POST endpoint below
// (PUT with `views` only is no longer accepted — that allowed anyone to
// inflate view counts).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await getBody<{
      name?: string; url?: string; logo?: string; order?: number; active?: boolean;
      genre?: string; language?: string; country?: string;
    }>(req);

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.url !== undefined) updateData.url = body.url.trim();
    if (body.logo !== undefined) updateData.logo = body.logo.trim();
    if (body.order !== undefined) updateData.order = body.order;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.genre !== undefined) updateData.genre = body.genre.trim();
    if (body.language !== undefined) updateData.language = body.language.trim();
    if (body.country !== undefined) updateData.country = body.country.trim();

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    await db.update(`tvChannels/${id}`, updateData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT tv-channels/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
  }
}

// DELETE /api/tv-channels/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    await db.remove(`tvChannels/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE tv-channels/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
  }
}

// POST /api/tv-channels/[id] — increment view count (rate-limited).
// This replaces the old "PUT with views only" path that allowed anyone to
// inflate view counts without auth.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const rl = rateLimit(`tv-view:${ip}`, { max: 30, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { id } = await params;
    const existing = await db.get<{ views?: number } | null>(`tvChannels/${id}`);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const newViews = (Number(existing.views) || 0) + 1;
    await db.update(`tvChannels/${id}`, { views: newViews });
    return NextResponse.json({ success: true, views: newViews });
  } catch (error) {
    console.error('POST tv-channels/[id] view error:', error);
    return NextResponse.json({ error: 'Failed to update views' }, { status: 500 });
  }
}
