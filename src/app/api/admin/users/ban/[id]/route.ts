import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'edge';

// POST /api/admin/users/ban/[id] — toggle ban status for a user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const user = await db.get<Record<string, unknown>>(`users/${id}`);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentBanned = Boolean(user.isBanned);
    const newBannedStatus = !currentBanned;

    await db.update(`users/${id}`, { isBanned: newBannedStatus });

    return NextResponse.json({
      success: true,
      userId: id,
      isBanned: newBannedStatus,
    });
  } catch (error) {
    console.error(`POST /api/admin/users/ban/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to toggle ban status' },
      { status: 500 },
    );
  }
}
