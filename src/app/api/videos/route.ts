import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'edge';

// GET /api/videos — public; list all videos sorted by createdAt desc.
export async function GET() {
  try {
    const data = await db.get<Record<string, Record<string, unknown>>>('videos');
    const videos = db.objectToArray<Record<string, unknown>>(data);
    videos.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    return NextResponse.json(videos);
  } catch (error) {
    console.error('GET /api/videos error:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}

// POST /api/videos — admin-only; create a video (legacy route).
// Note: admin UI uses /api/admin/videos which has more thorough validation.
// This route is kept for backwards compatibility.
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await getBody<Record<string, unknown>>(req);
    const { name, url, img, thumbnail, amount, time, duration, tag, tags, info, tmdbId, year, language, quality } = body as {
      name?: string; url?: string; img?: string; thumbnail?: string;
      amount?: number | string; time?: string; duration?: string;
      tag?: string; tags?: string; info?: string[];
      tmdbId?: number | string; year?: string; language?: string; quality?: string;
    };

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    // URL is optional — admin may save metadata-only and add URL later.

    const id = db.generateId();
    const video: Record<string, unknown> = {
      name: String(name).trim().slice(0, 500),
      url: typeof url === 'string' ? url.trim().slice(0, 2000) : '',
      img: (img || thumbnail || '') as string,
      thumbnail: (img || thumbnail || '') as string,
      amount: Number(amount) || 0,
      time: (time || duration || '') as string,
      duration: (time || duration || '') as string,
      tag: (tag || tags || '') as string,
      tags: (tag || tags || '') as string,
      info: Array.isArray(info) ? info : [],
      createdAt: Date.now(),
      year: year || '',
      language: language || '',
      quality: quality || '',
    };
    if (tmdbId !== undefined && tmdbId !== null && tmdbId !== '') {
      const n = Number(tmdbId);
      if (!isNaN(n)) video.tmdbId = n;
    }

    await db.set(`videos/${id}`, video);
    return NextResponse.json({ id, ...video }, { status: 201 });
  } catch (error) {
    console.error('POST /api/videos error:', error);
    return NextResponse.json({ error: 'Failed to create video' }, { status: 500 });
  }
}
