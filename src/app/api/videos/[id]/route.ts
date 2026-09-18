import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import { validateDownloadLinks } from '@/lib/download-utils';

export const runtime = 'edge';

// GET /api/videos/[id] — public; returns the full video record.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const video = await db.get<Record<string, unknown>>(`videos/${id}`);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    return NextResponse.json({ id, ...video });
  } catch (error) {
    console.error('GET /api/videos/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 });
  }
}

// PUT /api/videos/[id] — admin-only; updates a video with full allowlist.
// Note: admin UI uses /api/admin/videos/[id] which has more thorough
// validation, but we keep this route's allowlist in sync too for callers
// that hit it directly.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await getBody<Record<string, unknown>>(req);

    const existing = await db.get(`videos/${id}`);
    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // String fields (with sensible length caps).
    const optStr = (key: string, maxLen: number) => {
      if (typeof body[key] === 'string') {
        updateData[key] = body[key].slice(0, maxLen);
      } else if (body[key] === null) {
        updateData[key] = null;
      }
    };
    optStr('name', 500);
    optStr('url', 2000);
    optStr('img', 2000);
    optStr('thumbnail', 2000);
    optStr('tag', 500);
    optStr('tags', 500);
    optStr('time', 50);
    optStr('duration', 50);
    optStr('quality', 50);
    optStr('year', 20);
    optStr('language', 50);
    optStr('imdbId', 30);
    optStr('director', 200);
    optStr('firstAirDate', 20);

    // Numeric fields
    if (body.amount !== undefined && body.amount !== null) {
      const n = Number(body.amount);
      if (!isNaN(n) && n >= 0) updateData.amount = n;
    }
    if (body.tmdbId !== undefined && body.tmdbId !== null && body.tmdbId !== '') {
      const n = Number(body.tmdbId);
      if (!isNaN(n)) updateData.tmdbId = n;
    } else if (body.tmdbId === null) {
      updateData.tmdbId = null;
    }
    if (body.rating !== undefined && body.rating !== null && body.rating !== '') {
      const r = Number(body.rating);
      if (!isNaN(r) && r >= 0 && r <= 10) updateData.rating = r;
    } else if (body.rating === null) {
      updateData.rating = null;
    }

    // contentType
    if (body.contentType === 'movie' || body.contentType === 'series' || body.contentType === null) {
      updateData.contentType = body.contentType;
    }
    // importSource
    if (body.importSource === 'tmdb' || body.importSource === 'imdb' || body.importSource === null) {
      updateData.importSource = body.importSource;
    }

    // Array fields
    if (Array.isArray(body.info)) {
      updateData.info = body.info.filter((s): s is string => typeof s === 'string').map(s => s.slice(0, 1000)).slice(0, 50);
    }
    if (Array.isArray(body.genres)) {
      updateData.genres = body.genres.filter((s): s is string => typeof s === 'string').map(s => s.slice(0, 100)).slice(0, 20);
    }
    if (Array.isArray(body.cast)) {
      updateData.cast = body.cast.filter((s): s is string => typeof s === 'string').map(s => s.slice(0, 200)).slice(0, 30);
    }
    if (Array.isArray(body.backdrops)) {
      updateData.backdrops = body.backdrops.filter((s): s is string => typeof s === 'string' && /^https?:\/\//i.test(s)).slice(0, 20);
    }
    if (Array.isArray(body.downloadLinks)) {
      updateData.downloadLinks = validateDownloadLinks(body.downloadLinks);
    }
    if (Array.isArray(body.seasons)) {
      updateData.seasons = body.seasons
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

    // Sync img/thumbnail + tag/tags + time/duration (legacy convenience).
    if (typeof updateData.img === 'string') updateData.thumbnail = updateData.img;
    if (typeof updateData.thumbnail === 'string') updateData.img = updateData.thumbnail;
    if (typeof updateData.time === 'string') updateData.duration = updateData.time;
    if (typeof updateData.duration === 'string') updateData.time = updateData.duration;
    if (typeof updateData.tag === 'string') updateData.tags = updateData.tag;
    if (typeof updateData.tags === 'string') updateData.tag = updateData.tags;

    await db.update(`videos/${id}`, updateData);
    return NextResponse.json({ id, ...existing, ...updateData });
  } catch (error) {
    console.error('PUT /api/videos/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update video' }, { status: 500 });
  }
}

// DELETE /api/videos/[id] — admin-only.
// Note: this does NOT clean up user purchased/favorites arrays. Prefer
// /api/admin/videos/[id] DELETE which uses deleteVideoAndCleanup.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    await db.remove(`videos/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/videos/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}
