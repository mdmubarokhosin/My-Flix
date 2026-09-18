import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import type { AppNotification } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/notifications/[id] — get a single notification
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const notification = await db.get<Omit<AppNotification, 'id'>>(`notifications/${id}`);
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    return NextResponse.json({ id, ...notification });
  } catch (error) {
    console.error(`GET /api/admin/notifications/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 },
    );
  }
}

// PUT /api/admin/notifications/[id] — update a notification
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`notifications/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, id: _id, createdAt: _createdAt, createdBy: _createdBy, ...data } = body as Record<string, unknown>;

    // Validate type if provided
    if (data.type !== undefined && !['alert', 'action'].includes(data.type as string)) {
      return NextResponse.json(
        { error: 'type must be "alert" or "action"' },
        { status: 400 },
      );
    }

    await db.update(`notifications/${id}`, data);
    const updated = await db.get<Omit<AppNotification, 'id'>>(`notifications/${id}`);
    return NextResponse.json({ id, ...updated });
  } catch (error) {
    console.error(`PUT /api/admin/notifications/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/notifications/[id] — delete a notification
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`notifications/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await db.remove(`notifications/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/admin/notifications/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 },
    );
  }
}
