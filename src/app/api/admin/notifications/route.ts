import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import type { AppNotification } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/notifications — list all notifications, sorted by newest first
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const data = await db.get<Record<string, Omit<AppNotification, 'id'>>>('notifications');
    const notifications = db.objectToArray(data).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    );
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('GET /api/admin/notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 },
    );
  }
}

// POST /api/admin/notifications — create a new notification
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, ...data } = body;

    if (!data.title || typeof data.title !== 'string') {
      return NextResponse.json(
        { error: 'title is required and must be a string' },
        { status: 400 },
      );
    }
    if (!data.message || typeof data.message !== 'string') {
      return NextResponse.json(
        { error: 'message is required and must be a string' },
        { status: 400 },
      );
    }
    if (!['alert', 'action'].includes(data.type as string)) {
      return NextResponse.json(
        { error: 'type must be "alert" or "action"' },
        { status: 400 },
      );
    }

    const payload: Omit<AppNotification, 'id'> = {
      type: data.type as AppNotification['type'],
      title: data.title as string,
      message: data.message as string,
      link: data.link as string | undefined,
      targetUserId: data.targetUserId as string | null | undefined,
      createdBy: 'admin',
      createdAt: Date.now(),
    };

    const id = await db.push('notifications', payload);
    return NextResponse.json({ id, ...payload }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 },
    );
  }
}
