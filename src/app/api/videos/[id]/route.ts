import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const video = await db.get(`videos/${id}`);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    return NextResponse.json({ id, ...video });
  } catch (error) {
    console.error('GET /api/videos/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();
    
    const existing = await db.get(`videos/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    const allowed = ['name', 'url', 'img', 'thumbnail', 'amount', 'time', 'duration', 'tag', 'tags', 'info', 'tmdbId', 'year', 'language', 'quality'];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }
    // Sync img/thumbnail
    if (updateData.img) updateData.thumbnail = updateData.img;
    if (updateData.thumbnail) updateData.img = updateData.thumbnail;
    if (updateData.time) updateData.duration = updateData.time;
    if (updateData.duration) updateData.time = updateData.duration;
    if (updateData.tag) updateData.tags = updateData.tag;
    if (updateData.tags) updateData.tag = updateData.tags;

    await db.update(`videos/${id}`, updateData);
    return NextResponse.json({ id, ...existing, ...updateData });
  } catch (error) {
    console.error('PUT /api/videos/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update video' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    await db.remove(`videos/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/videos/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}
