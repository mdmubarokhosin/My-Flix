import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import type { TvChannel } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/tv-channels/[id] — get a single TV channel
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const channel = await db.get<Omit<TvChannel, 'id'>>(`tvChannels/${id}`);
    if (!channel) {
      return NextResponse.json({ error: 'TV channel not found' }, { status: 404 });
    }
    return NextResponse.json({ id, ...channel });
  } catch (error) {
    console.error(`GET /api/admin/tv-channels/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch TV channel' },
      { status: 500 },
    );
  }
}

// PUT /api/admin/tv-channels/[id] — update a TV channel
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`tvChannels/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'TV channel not found' }, { status: 404 });
    }

    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, id: _id, createdAt: _createdAt, ...data } = body as Record<string, unknown>;

    await db.update(`tvChannels/${id}`, data);
    const updated = await db.get<Omit<TvChannel, 'id'>>(`tvChannels/${id}`);
    return NextResponse.json({ id, ...updated });
  } catch (error) {
    console.error(`PUT /api/admin/tv-channels/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to update TV channel' },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/tv-channels/[id] — delete a TV channel
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`tvChannels/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'TV channel not found' }, { status: 404 });
    }

    await db.remove(`tvChannels/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/admin/tv-channels/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete TV channel' },
      { status: 500 },
    );
  }
}
