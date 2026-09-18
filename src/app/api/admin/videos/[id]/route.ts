import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import { deleteVideoAndCleanup } from '@/lib/video-utils';
import { validateDownloadLinks } from '@/lib/download-utils';
import type { Video } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/videos/[id] — get a single video.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;
  try {
    const video = await db.get<Omit<Video, 'id'>>(`videos/${id}`);
    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    return NextResponse.json({ id, ...video });
  } catch (error) {
    console.error(`GET /api/admin/videos/${id} error:`, error);
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 });
  }
}

// PUT /api/admin/videos/[id] — update a video (with allowlist + validation).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;
  try {
    const existing = await db.get(`videos/${id}`);
    if (!existing) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

    const body = await getBody<Record<string, unknown>>(req);
    const { adminPassword, id: _id, createdAt: _createdAt, ...data } = body;

    // Build update payload with allowlist + validation.
    const updateData: Record<string, unknown> = {};

    // Optional string fields (with max length).
    const optStr = (key: string, maxLen: number) => {
      if (typeof data[key] === 'string') {
        updateData[key] = data[key].slice(0, maxLen);
      } else if (data[key] === null) {
        updateData[key] = null; // allow clearing
      }
    };
    optStr('name', 500);
    optStr('url', 2000);
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

    // Numeric fields
    if (data.amount !== undefined && data.amount !== null) {
      const n = Number(data.amount);
      if (!isNaN(n) && n >= 0) updateData.amount = n;
    }
    if (data.tmdbId !== undefined && data.tmdbId !== null && data.tmdbId !== '') {
      const n = Number(data.tmdbId);
      if (!isNaN(n)) updateData.tmdbId = n;
    } else if (data.tmdbId === null) {
      updateData.tmdbId = null;
    }
    if (data.rating !== undefined && data.rating !== null && data.rating !== '') {
      const r = Number(data.rating);
      if (!isNaN(r) && r >= 0 && r <= 10) updateData.rating = r;
    } else if (data.rating === null) {
      updateData.rating = null;
    }

    // contentType
    if (data.contentType === 'movie' || data.contentType === 'series' || data.contentType === null) {
      updateData.contentType = data.contentType;
    }

    // Array fields
    if (Array.isArray(data.info)) {
      updateData.info = data.info.filter((s): s is string => typeof s === 'string').map(s => s.slice(0, 1000)).slice(0, 50);
    }
    if (Array.isArray(data.genres)) {
      updateData.genres = data.genres.filter((s): s is string => typeof s === 'string').map(s => s.slice(0, 100)).slice(0, 20);
    }
    if (Array.isArray(data.cast)) {
      updateData.cast = data.cast.filter((s): s is string => typeof s === 'string').map(s => s.slice(0, 200)).slice(0, 30);
    }
    if (Array.isArray(data.backdrops)) {
      updateData.backdrops = data.backdrops.filter((s): s is string => typeof s === 'string' && /^https?:\/\//i.test(s)).slice(0, 20);
    }

    // downloadLinks — validated
    if (Array.isArray(data.downloadLinks)) {
      const clean = validateDownloadLinks(data.downloadLinks);
      updateData.downloadLinks = clean; // [] if all invalid
    }

    // Seasons (TV series)
    if (Array.isArray(data.seasons)) {
      updateData.seasons = data.seasons
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
      updateData.totalSeasons = (updateData.seasons as unknown[]).length;
      updateData.totalEpisodes = (updateData.seasons as { episodes?: unknown[] }[])
        .reduce((sum, s) => sum + (s.episodes?.length || 0), 0);
    }

    await db.update(`videos/${id}`, updateData);
    const updated = await db.get<Omit<Video, 'id'>>(`videos/${id}`);
    return NextResponse.json({ id, ...updated });
  } catch (error) {
    console.error(`PUT /api/admin/videos/${id} error:`, error);
    return NextResponse.json({ error: 'Failed to update video' }, { status: 500 });
  }
}

// DELETE /api/admin/videos/[id] — delete a video and clean up user references.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;
  try {
    const existing = await db.get(`videos/${id}`);
    if (!existing) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    await deleteVideoAndCleanup(db, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/admin/videos/${id} error:`, error);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}
