import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import { validateDownloadLinks } from '@/lib/download-utils';
import type { Video } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/videos — list all videos, sorted by newest first.
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const data = await db.get<Record<string, Omit<Video, 'id'>>>('videos');
    const videos = db.objectToArray(data).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    );
    return NextResponse.json(videos);
  } catch (error) {
    console.error('GET /api/admin/videos error:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}

// POST /api/admin/videos — create a new video.
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, ...data } = body;

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      return NextResponse.json({ error: 'name is required and must be a non-empty string' }, { status: 400 });
    }
    // URL is OPTIONAL — admin may save a video with metadata only and add
    // the streaming URL later. If provided, it must be a string.
    if (data.url !== undefined && data.url !== null && typeof data.url !== 'string') {
      return NextResponse.json({ error: 'url must be a string when provided' }, { status: 400 });
    }

    // Build payload with validated fields.
    const payload: Record<string, unknown> = {
      name: String(data.name).trim().slice(0, 500),
      url: typeof data.url === 'string' ? data.url.trim().slice(0, 2000) : '',
      amount: Number(data.amount) || 0,
      createdAt: Date.now(),
    };

    // Optional string fields.
    const optStr = (key: string, maxLen: number) => {
      if (typeof data[key] === 'string' && data[key].trim()) {
        payload[key] = data[key].slice(0, maxLen);
      }
    };
    optStr('thumbnail', 2000);
    optStr('img', 2000);
    optStr('tag', 500);
    optStr('tags', 500);
    optStr('duration', 50);
    optStr('quality', 50);
    optStr('year', 20);
    optStr('language', 50);
    optStr('imdbId', 30);
    optStr('director', 200);

    // contentType
    if (data.contentType === 'movie' || data.contentType === 'series') {
      payload.contentType = data.contentType;
    }

    // Numeric fields
    if (data.tmdbId !== undefined && data.tmdbId !== null && data.tmdbId !== '') {
      const n = Number(data.tmdbId);
      if (!isNaN(n)) payload.tmdbId = n;
    }
    if (data.rating !== undefined && data.rating !== null && data.rating !== '') {
      const r = Number(data.rating);
      if (!isNaN(r) && r >= 0 && r <= 10) payload.rating = r;
    }

    // Array fields
    if (Array.isArray(data.info)) {
      payload.info = data.info.filter((s): s is string => typeof s === 'string').map(s => s.slice(0, 1000)).slice(0, 50);
    }
    if (Array.isArray(data.genres)) {
      payload.genres = data.genres.filter((s): s is string => typeof s === 'string').map(s => s.slice(0, 100)).slice(0, 20);
    }
    if (Array.isArray(data.cast)) {
      payload.cast = data.cast.filter((s): s is string => typeof s === 'string').map(s => s.slice(0, 200)).slice(0, 30);
    }
    if (Array.isArray(data.backdrops)) {
      payload.backdrops = data.backdrops.filter((s): s is string => typeof s === 'string' && /^https?:\/\//i.test(s)).slice(0, 20);
    }

    // downloadLinks — validated via helper
    const cleanLinks = validateDownloadLinks(data.downloadLinks);
    if (cleanLinks.length > 0) payload.downloadLinks = cleanLinks;

    // Seasons (for TV series)
    if (Array.isArray(data.seasons)) {
      payload.seasons = data.seasons
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .map((season) => {
          const out: Record<string, unknown> = {
            seasonNumber: Number(season.seasonNumber) || 1,
            name: typeof season.name === 'string' ? season.name : 'Season',
          };
          if (Array.isArray(season.episodes)) {
            out.episodes = season.episodes
              .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
              .map((ep) => {
                const epOut: Record<string, unknown> = {
                  episodeNumber: Number(ep.episodeNumber) || 1,
                  name: typeof ep.name === 'string' ? ep.name : '',
                  url: typeof ep.url === 'string' ? ep.url : '',
                };
                if (typeof ep.thumbnail === 'string' && /^https?:\/\//i.test(ep.thumbnail)) {
                  epOut.thumbnail = ep.thumbnail;
                }
                if (typeof ep.duration === 'string' && ep.duration.trim()) {
                  epOut.duration = ep.duration.trim();
                }
                const epLinks = validateDownloadLinks(ep.downloadLinks);
                if (epLinks.length > 0) epOut.downloadLinks = epLinks;
                return epOut;
              });
          } else {
            out.episodes = [];
          }
          return out;
        });
      payload.totalSeasons = (payload.seasons as unknown[]).length;
      payload.totalEpisodes = (payload.seasons as { episodes?: unknown[] }[])
        .reduce((sum, s) => sum + (s.episodes?.length || 0), 0);
    }

    const id = await db.push('videos', payload);
    return NextResponse.json({ id, ...payload }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/videos error:', error);
    return NextResponse.json({ error: 'Failed to create video' }, { status: 500 });
  }
}
