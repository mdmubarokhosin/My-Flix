import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';

export const runtime = 'edge';

// SECURITY WARNING: This proxy endpoint is currently public. In production,
// this should be restricted to admin-only access or protected with rate limiting
// to prevent abuse and unauthorized use of the IMDB/OMDb API key.

// OMDb API base (free tier: 1000 requests/day)
// IMDB does not have a public API, so we use OMDb as the proxy
const OMDB_BASE = 'https://www.omdbapi.com/';

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

async function omdbFetch(params: Record<string, string>, apiKey: string): Promise<unknown> {
  const cacheKey = `omdb:${JSON.stringify(params)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const url = `${OMDB_BASE}?${new URLSearchParams({ ...params, apikey: apiKey }).toString()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    const msg = `OMDb API error: ${res.status} - ${errBody}`;
    throw new Error(sanitizeErrorMessage(msg, apiKey));
  }
  const data = await res.json();
  cache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL });
  return data;
}

async function getApiKey(): Promise<string | null> {
  try {
    const settings = await db.get<Record<string, any>>('settings');
    return (settings?.imdbApiKey as string) || null;
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
        { error: 'IMDB (OMDb) API key not configured. Set it in Admin > Settings.' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'search': {
        const query = searchParams.get('query');
        const type = searchParams.get('type') || ''; // movie, series, episode, empty = all
        if (!query) {
          return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
        }
        const params: Record<string, string> = { s: query };
        if (type) params.type = type;
        const results = await omdbFetch(params, apiKey);
        const parsed = results as Record<string, any>;
        if (parsed.Response === 'False') {
          return NextResponse.json({ error: parsed.Error || 'No results found', results: [] });
        }
        return NextResponse.json({ results: parsed.Search || [] });
      }

      case 'details': {
        const id = searchParams.get('id');
        const title = searchParams.get('title');
        const plot = searchParams.get('plot') || 'full';

        if (!id && !title) {
          return NextResponse.json({ error: 'IMDB ID or title is required' }, { status: 400 });
        }

        const params: Record<string, string> = { plot };
        if (id) {
          // Support both tt1234567 and 1234567 formats
          params.i = id.startsWith('tt') ? id : `tt${id}`;
        } else {
          params.t = title!;
        }

        const data = await omdbFetch(params, apiKey);
        const parsed = data as Record<string, any>;
        if (parsed.Response === 'False') {
          return NextResponse.json({ error: parsed.Error || 'Not found' });
        }
        return NextResponse.json(parsed);
      }

      case 'search_by_id': {
        // Search by IMDB ID directly — supports both tt1234567 and 1234567
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json({ error: 'IMDB ID is required' }, { status: 400 });
        }
        const imdbId = id.startsWith('tt') ? id : `tt${id}`;
        const data = await omdbFetch({ i: imdbId, plot: 'full' }, apiKey);
        const parsed = data as Record<string, any>;
        if (parsed.Response === 'False') {
          return NextResponse.json({ error: parsed.Error || 'Not found' });
        }
        return NextResponse.json(parsed);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: search, details, search_by_id' },
          { status: 400 }
        );
    }
  } catch (error) {
    const apiKey = await getApiKey().catch(() => null);
    const message = error instanceof Error ? error.message : 'IMDB request failed';
    // Ensure API key is never exposed in client-facing error messages
    const safeMessage = apiKey ? sanitizeErrorMessage(message, apiKey) : message;
    console.error(`IMDB API error [action=${action || 'none'}]:`, error);
    return NextResponse.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}
