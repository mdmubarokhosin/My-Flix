import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import { deleteVideoAndCleanup } from '@/lib/video-utils';
import type { Video } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/videos/[id] — get a single video
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const video = await db.get<Omit<Video, 'id'>>(`videos/${id}`);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    return NextResponse.json({ id, ...video });
  } catch (error) {
    console.error(`GET /api/admin/videos/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 },
    );
  }
}

// PUT /api/admin/videos/[id] — update a video
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`videos/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, id: _id, createdAt: _createdAt, ...data } = body as Record<string, unknown>;

    await db.update(`videos/${id}`, data);
    const updated = await db.get<Omit<Video, 'id'>>(`videos/${id}`);
    return NextResponse.json({ id, ...updated });
  } catch (error) {
    console.error(`PUT /api/admin/videos/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/videos/[id] — delete a video and clean up user references
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`videos/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    await deleteVideoAndCleanup(db, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/admin/videos/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 },
    );
  }
}
