import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const data = await db.get<Record<string, any>>('users');
    const users = db.objectToArray<{
      firstName?: string;
      lastName?: string;
      username?: string;
      photoUrl?: string;
      balance: number;
      isBanned?: boolean;
      purchased?: number[];
      favorites?: number[];
      createdAt: number;
    }>(data);
    users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return NextResponse.json(users);
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { id, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const allowed = ['balance', 'firstName', 'lastName', 'username', 'isBanned'];
    const updateData: Record<string, any> = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        if (key === 'balance') {
          updateData[key] = Number(updates[key]);
        } else if (key === 'isBanned') {
          updateData[key] = Boolean(updates[key]);
        } else {
          updateData[key] = updates[key];
        }
      }
    }

    await db.update(`users/${id}`, updateData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/users error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    await db.remove(`users/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/users error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
