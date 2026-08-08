import { NextRequest } from 'next/server';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCQBkhXfLefbOQHmP5Mw2tmR93U_63YhNM",
  authDomain: "myflixbd01.firebaseapp.com",
  databaseURL: "https://myflixbd01-default-rtdb.firebaseio.com",
  projectId: "myflixbd01",
  storageBucket: "myflixbd01.firebasestorage.app",
  messagingSenderId: "30562578046",
  appId: "1:30562578046:web:b43f91251a45963221b22f",
  measurementId: "G-GCKXR5XKMS"
};

const BASE_URL = FIREBASE_CONFIG.databaseURL;

/**
 * Server-side Firebase RTDB helper using REST API.
 * Works in any Node.js / Edge runtime without Admin SDK.
 */
export class FirebaseRTDB {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BASE_URL;
  }

  /** GET data at a path. Returns the full object at that path. */
  async get<T = unknown>(path: string): Promise<T | null> {
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

  /** SET (overwrite) data at a path. Returns the written data. */
  async set<T = unknown>(path: string, data: T): Promise<T> {
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
    const url = `${this.baseUrl}/${path}.json`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error(`Firebase DELETE ${path} failed: ${res.status}`);
    }
    return null;
  }

  /** PUSH (generate unique key) data at a path. Returns the key name. */
  async push<T = unknown>(path: string, data: T): Promise<string> {
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

  /** Generate a new unique ID (client-side safe). */
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}

// Singleton instance for server-side use
export const db = new FirebaseRTDB();

/**
 * Extract JSON body from a NextRequest safely.
 */
export async function getBody<T = unknown>(req: NextRequest): Promise<T> {
  return req.json();
}
