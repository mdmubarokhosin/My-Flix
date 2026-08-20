import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  try {
    const data = await db.get<Record<string, any>>('videos');
    const videos = db.objectToArray<{
      name: string;
      url: string;
      img?: string;
      thumbnail?: string;
      amount: number;
      time?: string;
      duration?: string;
      tag?: string;
      tags?: string;
      info?: string[];
      createdAt: number;
      tmdbId?: number;
      year?: string;
      language?: string;
      quality?: string;
    }>(data);
    // Sort by createdAt descending
    videos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return NextResponse.json(videos);
  } catch (error) {
    console.error('GET /api/videos error:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { name, url, img, thumbnail, amount, time, duration, tag, tags, info, tmdbId, year, language, quality } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    const id = db.generateId();
    const video = {
      name,
      url,
      img: img || thumbnail || '',
      thumbnail: img || thumbnail || '',
      amount: Number(amount) || 0,
      time: time || duration || '',
      duration: time || duration || '',
      tag: tag || tags || '',
      tags: tag || tags || '',
      info: info || [],
      createdAt: Date.now(),
      tmdbId: tmdbId ? Number(tmdbId) : undefined,
      year: year || '',
      language: language || '',
      quality: quality || '',
    };

    await db.set(`videos/${id}`, video);
    return NextResponse.json({ id, ...video }, { status: 201 });
  } catch (error) {
    console.error('POST /api/videos error:', error);
    return NextResponse.json({ error: 'Failed to create video' }, { status: 500 });
  }
}
