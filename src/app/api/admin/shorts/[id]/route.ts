import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import type { ShortVideo } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/shorts/[id] — get a single short video
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const short = await db.get<Omit<ShortVideo, 'id'>>(`shorts/${id}`);
    if (!short) {
      return NextResponse.json({ error: 'Short not found' }, { status: 404 });
    }
    return NextResponse.json({ id, ...short });
  } catch (error) {
    console.error(`GET /api/admin/shorts/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch short' },
      { status: 500 },
    );
  }
}

// PUT /api/admin/shorts/[id] — update a short video
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`shorts/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Short not found' }, { status: 404 });
    }

    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, id: _id, createdAt: _createdAt, ...data } = body as Record<string, unknown>;

    await db.update(`shorts/${id}`, data);
    const updated = await db.get<Omit<ShortVideo, 'id'>>(`shorts/${id}`);
    return NextResponse.json({ id, ...updated });
  } catch (error) {
    console.error(`PUT /api/admin/shorts/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to update short' },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/shorts/[id] — delete a short video
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`shorts/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Short not found' }, { status: 404 });
    }

    await db.remove(`shorts/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/admin/shorts/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete short' },
      { status: 500 },
    );
  }
}
