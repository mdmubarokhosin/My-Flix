import { NextRequest } from 'next/server';

/**
 * Firebase config — read from environment variables (no Admin SDK, REST only).
 * On Cloudflare Pages these are exposed as build-time env vars.
 */
function readFirebaseConfig() {
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    // eslint-disable-next-line no-console
    console.warn(
      '[firebase-server] NEXT_PUBLIC_FIREBASE_DATABASE_URL is not set. ' +
        'Set it in .env.local or Cloudflare Pages → Environment Variables.',
    );
  }
  return { databaseURL };
}

const FIREBASE_CONFIG = readFirebaseConfig();
const BASE_URL = FIREBASE_CONFIG.databaseURL || '';

/**
 * Server-side Firebase RTDB helper using REST API.
 * Works in any Node.js / Edge runtime (incl. Cloudflare Pages) without Admin SDK.
 */
export class FirebaseRTDB {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BASE_URL;
  }

  private ensure(): void {
    if (!this.baseUrl) {
      throw new Error(
        'Firebase databaseURL is not configured. Set NEXT_PUBLIC_FIREBASE_DATABASE_URL.',
      );
    }
  }

  /** GET data at a path. Returns the full object at that path. */
  async get<T = unknown>(path: string): Promise<T | null> {
    this.ensure();
    const url = `${this.baseUrl}/${path}.json`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Firebase GET ${path} failed: ${res.status}`);
    }
    const data = await res.json();
    return data === null ? null : data;
  }

  /** GET data at a path with shallow=true (only keys, not nested data). */
  async getShallow(path: string): Promise<Record<string, boolean> | null> {
    this.ensure();
    const url = `${this.baseUrl}/${path}.json?shallow=true`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Firebase GET shallow ${path} failed: ${res.status}`);
    }
    const data = await res.json();
    return data === null ? null : data;
  }

  /**
   * Atomic multi-location update using the Firebase REST "PATCH at root" trick.
   *
   * Pass a map of absolute paths → values. All writes succeed or none do
   * (Firebase applies them as a single transaction). This is the proper way
   * to avoid race conditions when balance + transaction + gift-code all need
   * to be updated together.
   */
  async multiUpdate(updates: Record<string, unknown>): Promise<void> {
    this.ensure();
    const url = `${this.baseUrl}/.json`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Firebase multiUpdate failed: ${res.status} - ${err}`);
    }
  }

  /** SET (overwrite) data at a path. Returns the written data. */
  async set<T = unknown>(path: string, data: T): Promise<T> {
    this.ensure();
    const url = `${this.baseUrl}/${path}.json`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Firebase SET ${path} failed: ${res.status} - ${err}`);
    }
    return res.json();
  }

  /** UPDATE (merge) data at a path. */
  async update<T = Record<string, unknown>>(path: string, data: T): Promise<T> {
    this.ensure();
    const url = `${this.baseUrl}/${path}.json`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Firebase UPDATE ${path} failed: ${res.status} - ${err}`);
    }
    return res.json();
  }

  /** DELETE data at a path. */
  async remove(path: string): Promise<null> {
    this.ensure();
    const url = `${this.baseUrl}/${path}.json`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error(`Firebase DELETE ${path} failed: ${res.status}`);
    }
    return null;
  }

  /** PUSH (generate unique key) data at a path. Returns the key name. */
  async push<T = unknown>(path: string, data: T): Promise<string> {
    this.ensure();
    const url = `${this.baseUrl}/${path}.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Firebase PUSH ${path} failed: ${res.status} - ${err}`);
    }
    const result = await res.json();
    return result.name;
  }

  /**
   * Run a transactional compare-and-swap on a numeric field.
   * Returns the new value, or null if the predicate failed.
   *
   * Uses ETags (Firebase REST conditional update with `X-Firebase-ETag`).
   */
  async transactionalUpdate<T = unknown>(
    path: string,
    updater: (current: T | null) => T | null,
  ): Promise<{ ok: true; value: T | null } | { ok: false; reason: 'conflict' | 'error' }> {
    this.ensure();
    const url = `${this.baseUrl}/${path}.json`;
    // First read with ETag.
    const readRes = await fetch(url, { method: 'GET' });
    if (!readRes.ok) {
      return { ok: false, reason: 'error' };
    }
    const etag = readRes.headers.get('ETag');
    const current = (await readRes.json()) as T | null;
    const next = updater(current);
    if (next === null) {
      return { ok: false, reason: 'conflict' };
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (etag) headers['if-match'] = etag;
    const writeRes = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(next),
    });
    if (writeRes.status === 412) {
      return { ok: false, reason: 'conflict' };
    }
    if (!writeRes.ok) {
      return { ok: false, reason: 'error' };
    }
    return { ok: true, value: next };
  }

  /** Convert an object (RTDB format: {key1: {...}, key2: {...}}) to an array with id fields. */
  objectToArray<T>(obj: Record<string, T> | null): (T & { id: string })[] {
    if (!obj) return [];
    return Object.entries(obj).map(([id, data]) => ({
      id,
      ...data,
    })) as (T & { id: string })[];
  }

  /** Convert an array with id fields back to RTDB object format. */
  arrayToObject<T extends { id: string }>(arr: T[]): Record<string, Omit<T, 'id'>> {
    const obj: Record<string, Omit<T, 'id'>> = {};
    for (const item of arr) {
      const { id, ...rest } = item;
      obj[id] = rest as Omit<T, 'id'>;
    }
    return obj;
  }

  /** Generate a new unique ID (client-safe; uses crypto when available). */
  generateId(): string {
    const rand =
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? Array.from(crypto.getRandomValues(new Uint8Array(9)))
            .map((b) => b.toString(36).padStart(2, '0'))
            .join('')
            .slice(0, 9)
        : Math.random().toString(36).substring(2, 11);
    return Date.now().toString(36) + rand;
  }
}

// Singleton instance for server-side use.
export const db = new FirebaseRTDB();

/**
 * Extract JSON body from a NextRequest safely.
 * Falls back to {} for empty bodies so callers don't crash on `await req.json()`.
 */
export async function getBody<T = unknown>(req: NextRequest): Promise<T> {
  try {
    const text = await req.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}
