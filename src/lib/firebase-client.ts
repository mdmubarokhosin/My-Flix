import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

/**
 * Firebase configuration — read from environment variables.
 *
 * Copy `.env.example` → `.env.local` for development, and add the same
 * variables to Cloudflare Pages → Settings → Environment Variables.
 *
 * On Cloudflare Pages, `NEXT_PUBLIC_*` vars are bundled into the client
 * build at build time, so they are available to the browser.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: ReturnType<typeof initializeApp> | null = null;
let _database: Database | null = null;

/**
 * Lazily initialize the Firebase app.
 *
 * We do NOT initialize at module-load time, because Next.js tries to
 * statically prerender pages that import this module. If env vars are
 * missing at build time (e.g. on Cloudflare Pages before they're set),
 * eager initialization would crash the build. By deferring to first
 * access, the build succeeds and the runtime error only fires when the
 * app actually tries to talk to Firebase.
 */
function getAppInstance(): ReturnType<typeof initializeApp> {
  if (_app) return _app;
  _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return _app;
}

/**
 * Get the Realtime Database instance. Throws if `databaseURL` is missing.
 *
 * Use this in new code:
 *   import { getDb } from '@/lib/firebase-client';
 *   const db = getDb();
 *   const videosRef = ref(db, 'videos');
 */
export function getDb(): Database {
  if (_database) return _database;
  if (!firebaseConfig.databaseURL) {
    throw new Error(
      'Firebase databaseURL is not configured. Set NEXT_PUBLIC_FIREBASE_DATABASE_URL in your environment variables.',
    );
  }
  _database = getDatabase(getAppInstance());
  return _database;
}

/**
 * Backwards-compatible `database` export.
 *
 * We expose `database` as a lazy getter so existing call sites
 * (`import { database } from '@/lib/firebase-client'` + `ref(database, '...')`)
 * keep working. The Database instance is created on first access.
 *
 * If env vars are not configured, accessing any property on `database`
 * will throw at runtime (not at build time).
 *
 * Implementation note: we use a `Proxy` so TypeScript still sees
 * `database` as a `Database` instance for type-checking, but the actual
 * instance is created lazily on first property access.
 */
export const database: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const db = getDb();
    const value = Reflect.get(db as unknown as Record<string | symbol, unknown>, prop);
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(db) : value;
  },
}) as Database;

/**
 * Backwards-compatible `app` export (lazy).
 */
export const app = new Proxy({} as ReturnType<typeof initializeApp>, {
  get(_target, prop) {
    const a = getAppInstance();
    const value = Reflect.get(a as unknown as Record<string | symbol, unknown>, prop);
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(a) : value;
  },
}) as ReturnType<typeof initializeApp>;

export default firebaseConfig;
