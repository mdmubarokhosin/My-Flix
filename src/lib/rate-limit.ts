// ============================================================
// In-memory rate limiter (Edge-runtime compatible).
// ------------------------------------------------------------
// On Cloudflare Pages, each isolate has its own memory, so this is
// best-effort: a determined attacker could occasionally exceed the
// limit by hitting different isolates. For strict protection, use
// Cloudflare's Rate Limiting Rules in the dashboard.
//
// Usage:
//   const rl = rateLimit(`login:${ip}`, { max: 5, windowSeconds: 60 });
//   if (!rl.allowed) return new Response('Too many requests', { status: 429 });
// ============================================================

interface RateLimitOptions {
  max: number;        // Max requests allowed in the window.
  windowSeconds: number; // Window duration in seconds.
}

interface Bucket {
  count: number;
  resetAt: number;
}

// Module-scoped cache. Survives across requests within the same isolate.
const buckets = new Map<string, Bucket>();

// Periodically prune expired buckets to avoid unbounded memory growth.
// (Edge isolates are short-lived, so this is mostly defensive.)
let lastPruneAt = 0;

function prune(now: number): void {
  if (now - lastPruneAt < 60_000) return;
  lastPruneAt = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Check rate limit for a given key. Returns { allowed, remaining, resetAt }.
 * Does NOT throw on overflow — caller decides what to do.
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Math.floor(Date.now() / 1000);
  prune(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + options.windowSeconds };
    buckets.set(key, bucket);
    return { allowed: true, remaining: options.max - 1, resetAt: bucket.resetAt };
  }

  existing.count += 1;
  if (existing.count > options.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  return {
    allowed: true,
    remaining: options.max - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Helper: extract a client IP from a NextRequest, using common headers.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
