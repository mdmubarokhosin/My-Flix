import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';

export const runtime = 'edge';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check — requireUser gets userId from query params (?userId=xxx)
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    // Explicit ban check (defense-in-depth)
    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const { id: videoId } = await params;
    const userId = auth.userId;

    const videoIdStr = String(videoId);
    const user = await db.get<Record<string, any>>(`users/${userId}`);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const favorites: string[] = ((user.favorites as string[]) || []).filter(f => f !== videoIdStr);
    await db.update(`users/${userId}`, { favorites });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/user/favorites/[id] error:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}
