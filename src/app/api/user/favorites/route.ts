import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const userId = auth.userId;

    const user = await db.get<Record<string, any>>(`users/${userId}`);
    const favoriteIds: string[] = (user?.favorites as string[]) || [];

    // Only return the authenticated user's favorites list
    return NextResponse.json(favoriteIds);
  } catch (error) {
    console.error('GET /api/user/favorites error:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Use clone so requireUser doesn't consume the body — we still need videoId
    const auth = await requireUser(req.clone());
    if ('response' in auth) return auth.response;

    // Explicit ban check (defense-in-depth)
    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const { videoId } = await req.json();
    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const userId = auth.userId;
    const videoIdStr = String(videoId);

    const user = await db.get<Record<string, any>>(`users/${userId}`);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const favorites: string[] = (user.favorites as string[]) || [];
    if (!favorites.includes(videoIdStr)) {
      await db.update(`users/${userId}`, { favorites: [...favorites, videoIdStr] });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/user/favorites error:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Use clone so requireUser doesn't consume the body — we still need videoId
    const auth = await requireUser(req.clone());
    if ('response' in auth) return auth.response;

    // Explicit ban check (defense-in-depth)
    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const { videoId } = await req.json();
    if (videoId === undefined) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

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
    console.error('DELETE /api/user/favorites error:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}
