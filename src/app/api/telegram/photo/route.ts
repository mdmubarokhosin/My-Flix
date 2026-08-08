import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';

export const runtime = 'edge';

// Cache: store resolved photo URLs to avoid repeated Bot API calls
const photoCache = new Map<string, { url: string; expiry: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

async function getBotToken(): Promise<string | null> {
  try {
    const settings = await db.get<Record<string, any>>('settings');
    return (settings?.telegramBotToken as string) || null;
  } catch {
    return null;
  }
}

/**
 * Fetches a Telegram user's profile photo using the Bot API.
 *
 * Steps:
 * 1. getUserProfilePhotos -> gets file_id of the latest photo
 * 2. getFile -> gets file_path
 * 3. Construct public URL: https://api.telegram.org/file/bot{token}/{file_path}
 * 4. Save the photoUrl to the user's Firebase record
 */
export async function POST(req: NextRequest) {
  // Validate user authentication first
  const authResult = await requireUser(req);
  if ('response' in authResult) {
    return authResult.response;
  }
  const { userId: authenticatedUserId } = authResult;

  try {
    const { userId, telegramId } = await req.json();

    if (!userId && !telegramId) {
      return NextResponse.json({ error: 'userId or telegramId is required' }, { status: 400 });
    }

    // Ensure the authenticated user matches the requested user
    const requestedUserId = userId || String(telegramId);
    if (authenticatedUserId !== requestedUserId) {
      return NextResponse.json({ error: 'Unauthorized: cannot fetch photo for another user' }, { status: 403 });
    }

    const botToken = await getBotToken();
    if (!botToken) {
      return NextResponse.json({ error: 'Telegram Bot Token not configured' }, { status: 400 });
    }

    const tid = telegramId || parseInt(userId);
    if (!tid || isNaN(tid)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Check cache first
    const cacheKey = String(tid);
    const cached = photoCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return NextResponse.json({ photoUrl: cached.url });
    }

    // Step 1: Get user profile photos
    const photosRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${tid}&limit=1`
    );
    if (!photosRes.ok) {
      const errText = await photosRes.text();
      console.error('Bot API getUserProfilePhotos error:', errText);
      return NextResponse.json({ error: 'Failed to fetch profile photos from Telegram' }, { status: 500 });
    }
    const photosData = await photosRes.json() as any;

    if (!photosData.ok || !photosData.result?.total_count || photosData.result.total_count === 0) {
      return NextResponse.json({ error: 'No profile photo found' }, { status: 404 });
    }

    const fileId = photosData.result.photos[0][0].file_id;

    // Step 2: Get file path
    const fileRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'Failed to get file info' }, { status: 500 });
    }
    const fileData = await fileRes.json() as any;

    if (!fileData.ok || !fileData.result?.file_path) {
      return NextResponse.json({ error: 'File path not available' }, { status: 500 });
    }

    // Step 3: Construct the public URL
    const photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;

    // Cache it
    photoCache.set(cacheKey, { url: photoUrl, expiry: Date.now() + CACHE_TTL });

    // Step 4: Save to Firebase user record
    const firebaseUserId = userId || String(tid);
    try {
      await db.update(`users/${firebaseUserId}`, { photoUrl });
    } catch (e) {
      console.error('Failed to save photoUrl to Firebase:', e);
    }

    return NextResponse.json({ photoUrl });
  } catch (error) {
    console.error('POST /api/telegram/photo error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile photo' },
      { status: 500 }
    );
  }
}
