import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import type { ShortVideo } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/shorts — list all shorts, sorted by newest first
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const data = await db.get<Record<string, Omit<ShortVideo, 'id'>>>('shorts');
    const shorts = db.objectToArray(data).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    );
    return NextResponse.json(shorts);
  } catch (error) {
    console.error('GET /api/admin/shorts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shorts' },
      { status: 500 },
    );
  }
}

// POST /api/admin/shorts — create a new short video
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
    if (!data.url || typeof data.url !== 'string') {
      return NextResponse.json(
        { error: 'url is required and must be a string' },
        { status: 400 },
      );
    }

    const payload = {
      ...data,
      views: Number(data.views) || 0,
      createdAt: Date.now(),
    };

    const id = await db.push('shorts', payload);
    return NextResponse.json({ id, ...payload }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/shorts error:', error);
    return NextResponse.json(
      { error: 'Failed to create short' },
      { status: 500 },
    );
  }
}
