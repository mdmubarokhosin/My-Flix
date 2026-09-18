import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'edge';

// Cache file_path → fetched bytes (small avatars only).
// We cache the *file path* + photoUrl string for 24h, but we stream the
// actual image bytes on-demand so the bot token is never exposed.
const filePathCache = new Map<string, { filePath: string; expiry: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

async function getBotToken(): Promise<string | null> {
  try {
    const settings = await db.get<Record<string, unknown>>('settings');
    return (settings?.telegramBotToken as string) || null;
  } catch {
    return null;
  }
}

/**
 * POST /api/telegram/photo
 * Body: { userId } or { telegramId }
 *
 * Returns: { photoUrl: "/api/telegram/photo?id=<userId>" }
 * The returned URL is a PROXY URL on our own domain — it never contains
 * the bot token. The actual image bytes are streamed by the GET handler
 * below, which fetches from Telegram server-side.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireUser(req.clone());
  if ('response' in authResult) return authResult.response;
  const { userId: authenticatedUserId } = authResult;

  // Rate limit: 10 photo fetches / IP / minute.
  const ip = getClientIp(req);
  const rl = rateLimit(`telegram-photo:${ip}`, { max: 10, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await getBody<{ userId?: string; telegramId?: number }>(req);
    const { userId, telegramId } = body;

    if (!userId && !telegramId) {
      return NextResponse.json({ error: 'userId or telegramId is required' }, { status: 400 });
    }

    const requestedUserId = userId || String(telegramId);
    if (authenticatedUserId !== requestedUserId) {
      return NextResponse.json(
        { error: 'Unauthorized: cannot fetch photo for another user' },
        { status: 403 },
      );
    }

    const tid = telegramId || parseInt(userId || '', 10);
    if (!tid || isNaN(tid)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const botToken = await getBotToken();
    if (!botToken) {
      return NextResponse.json({ error: 'Telegram Bot Token not configured' }, { status: 400 });
    }

    // Resolve file_path (cached).
    let filePath = filePathCache.get(String(tid))?.filePath;
    if (!filePath) {
      // 1. getUserProfilePhotos
      const photosRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${tid}&limit=1`,
      );
      if (!photosRes.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch profile photos from Telegram' },
          { status: 500 },
        );
      }
      const photosData = (await photosRes.json()) as {
        ok: boolean;
        result?: { total_count: number; photos?: { file_id: string }[][] };
      };
      if (!photosData.ok || !photosData.result?.total_count) {
        return NextResponse.json({ error: 'No profile photo found' }, { status: 404 });
      }
      const fileId = photosData.result.photos?.[0]?.[0]?.file_id;
      if (!fileId) return NextResponse.json({ error: 'No file_id' }, { status: 500 });

      // 2. getFile
      const fileRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`,
      );
      if (!fileRes.ok) {
        return NextResponse.json({ error: 'Failed to get file info' }, { status: 500 });
      }
      const fileData = (await fileRes.json()) as {
        ok: boolean;
        result?: { file_path?: string };
      };
      if (!fileData.ok || !fileData.result?.file_path) {
        return NextResponse.json({ error: 'File path not available' }, { status: 500 });
      }
      filePath = fileData.result.file_path;
      filePathCache.set(String(tid), { filePath, expiry: Date.now() + CACHE_TTL });
    }

    // 3. Save the proxy URL to the user record (so the client can use it as <img src>).
    const proxyUrl = `/api/telegram/photo?id=${tid}`;
    try {
      await db.update(`users/${requestedUserId}`, { photoUrl: proxyUrl });
    } catch (e) {
      console.error('Failed to save photoUrl to Firebase:', e);
    }

    return NextResponse.json({ photoUrl: proxyUrl });
  } catch (error) {
    console.error('POST /api/telegram/photo error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile photo' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/telegram/photo?id=<telegramUserId>
 *
 * Streams the actual image bytes from Telegram's servers, server-side.
 * The bot token is NEVER included in the URL or response — it stays
 * on the server.
 */
export async function GET(req: NextRequest) {
  const tidStr = new URL(req.url).searchParams.get('id')?.trim();
  if (!tidStr) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const tid = parseInt(tidStr, 10);
  if (isNaN(tid)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const botToken = await getBotToken();
  if (!botToken) return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });

  // Resolve filePath (cached).
  let filePath = filePathCache.get(String(tid))?.filePath;
  if (!filePath) {
    // Same logic as POST — fetch fresh.
    const photosRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${tid}&limit=1`,
    );
    if (!photosRes.ok) return NextResponse.json({ error: 'Telegram API error' }, { status: 500 });
    const photosData = (await photosRes.json()) as {
      ok: boolean;
      result?: { total_count: number; photos?: { file_id: string }[][] };
    };
    if (!photosData.ok || !photosData.result?.total_count) {
      return NextResponse.json({ error: 'No photo' }, { status: 404 });
    }
    const fileId = photosData.result.photos?.[0]?.[0]?.file_id;
    if (!fileId) return NextResponse.json({ error: 'No file_id' }, { status: 500 });
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    if (!fileRes.ok) return NextResponse.json({ error: 'getFile failed' }, { status: 500 });
    const fileData = (await fileRes.json()) as { ok: boolean; result?: { file_path?: string } };
    if (!fileData.ok || !fileData.result?.file_path) {
      return NextResponse.json({ error: 'No file_path' }, { status: 500 });
    }
    filePath = fileData.result.file_path;
    filePathCache.set(String(tid), { filePath, expiry: Date.now() + CACHE_TTL });
  }

  // Stream the image bytes through.
  const imageUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
  }
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
  const cacheControl = 'public, max-age=86400';
  return new NextResponse(imgRes.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    },
  });
}
