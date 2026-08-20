import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import { normalizeUserData } from '@/lib/user-utils';

export const runtime = 'edge';

// GET /api/admin/users/[id] — get a single user with normalized data
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const raw = await db.get<Record<string, unknown>>(`users/${id}`);
    if (!raw) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const user = normalizeUserData(raw, id);
    return NextResponse.json(user);
  } catch (error) {
    console.error(`GET /api/admin/users/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 },
    );
  }
}

// PUT /api/admin/users/[id] — update user fields (balance, isBanned, firstName, etc.)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`users/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, ...data } = body;

    // Only allow updating specific user fields
    const allowedKeys = [
      'balance',
      'firstName',
      'lastName',
      'username',
      'isBanned',
      'photoUrl',
      'theme',
    ];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (data[key] !== undefined) {
        if (key === 'balance') {
          updateData[key] = Number(data[key]);
        } else if (key === 'isBanned') {
          updateData[key] = Boolean(data[key]);
        } else {
          updateData[key] = data[key];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    await db.update(`users/${id}`, updateData);
    const updatedRaw = await db.get<Record<string, unknown>>(`users/${id}`);
    const user = normalizeUserData(updatedRaw, id);
    return NextResponse.json(user);
  } catch (error) {
    console.error(`PUT /api/admin/users/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/users/[id] — delete a user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await db.get(`users/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.remove(`users/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/admin/users/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 },
    );
  }
}
