import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';

export const runtime = 'edge';

// SECURITY WARNING: This proxy endpoint is currently public. In production,
// this should be restricted to admin-only access or protected with rate limiting
// to prevent abuse and unauthorized use of the TMDB API key.

const TMDB_BASE = 'https://api.themoviedb.org/3';

// Simple in-memory cache (server-side, per-instance)
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

/**
 * Sanitize an error message to ensure no API key is leaked.
 */
function sanitizeErrorMessage(message: string, apiKey: string): string {
  // Redact the API key if it appears anywhere in the error message
  if (apiKey && message.includes(apiKey)) {
    return message.replace(apiKey, '[REDACTED]');
  }
  return message;
}

async function tmdbFetch(endpoint: string, apiKey: string): Promise<unknown> {
  const cacheKey = `tmdb:${endpoint}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Use ? for api_key if endpoint has no query string, otherwise &
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${TMDB_BASE}${endpoint}${separator}api_key=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    const msg = `TMDB API error: ${res.status} - ${errBody}`;
    throw new Error(sanitizeErrorMessage(msg, apiKey));
  }
  const data = await res.json();
  cache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL });
  return data;
}

async function getApiKey(): Promise<string | null> {
  try {
    const settings = await db.get<Record<string, any>>('settings');
    return (settings?.tmdbApiKey as string) || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get('action');
  try {
    const apiKey = await getApiKey();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'TMDB API key not configured. Set it in Admin > Settings.' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'details': {
        const tmdbId = searchParams.get('id');
        if (!tmdbId) {
          return NextResponse.json({ error: 'TMDB ID is required' }, { status: 400 });
        }
        const details = await tmdbFetch(`/movie/${tmdbId}?language=en-US&append_to_response=credits,images,videos`, apiKey);
        return NextResponse.json(details);
      }

      case 'search': {
        const query = searchParams.get('query');
        if (!query) {
          return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
        }
        const results = await tmdbFetch(`/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=1`, apiKey);
        return NextResponse.json(results);
      }

      case 'search_tv': {
        const query = searchParams.get('query');
        if (!query) {
          return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
        }
        const results = await tmdbFetch(`/search/tv?query=${encodeURIComponent(query)}&language=en-US&page=1`, apiKey);
        return NextResponse.json(results);
      }

      case 'tv_details': {
        const tmdbId = searchParams.get('id');
        if (!tmdbId) {
          return NextResponse.json({ error: 'TMDB TV ID is required' }, { status: 400 });
        }
        const details = await tmdbFetch(`/tv/${tmdbId}?language=en-US&append_to_response=credits,images,videos`, apiKey);
        return NextResponse.json(details);
      }

      case 'tv_season_details': {
        const tmdbId = searchParams.get('id');
        const seasonNum = searchParams.get('season');
        if (!tmdbId || !seasonNum) {
          return NextResponse.json({ error: 'TMDB TV ID and season number are required' }, { status: 400 });
        }
        const details = await tmdbFetch(`/tv/${tmdbId}/season/${seasonNum}?language=en-US`, apiKey);
        return NextResponse.json(details);
      }

      case 'trending': {
        const results = await tmdbFetch('/trending/movie/week?language=en-US', apiKey);
        return NextResponse.json(results);
      }

      case 'trending_tv': {
        const results = await tmdbFetch('/trending/tv/week?language=en-US', apiKey);
        return NextResponse.json(results);
      }

      case 'popular_tv': {
        const page = searchParams.get('page') || '1';
        const results = await tmdbFetch(`/tv/popular?language=en-US&page=${page}`, apiKey);
        return NextResponse.json(results);
      }

      case 'top_rated_tv': {
        const page = searchParams.get('page') || '1';
        const results = await tmdbFetch(`/tv/top_rated?language=en-US&page=${page}`, apiKey);
        return NextResponse.json(results);
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: details, search, search_tv, tv_details, trending, trending_tv' }, { status: 400 });
    }
  } catch (error) {
    const apiKey = await getApiKey().catch(() => null);
    const message = error instanceof Error ? error.message : 'TMDB request failed';
    // Ensure API key is never exposed in client-facing error messages
    const safeMessage = apiKey ? sanitizeErrorMessage(message, apiKey) : message;
    console.error(`TMDB API error [action=${action || 'none'}]:`, error);
    return NextResponse.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}