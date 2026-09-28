/**
 * Fixed-window in-memory rate limiter. Sufficient for a single instance; for
 * horizontal scaling swap the store for Redis (same interface).
 */
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const b = store.get(key);
  if (!b || b.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    if (store.size > 50_000) for (const [k, v] of store) if (v.resetAt < now) store.delete(k);
    return { ok: true, retryAfterMs: 0 };
  }
  b.count++;
  return b.count > limit ? { ok: false, retryAfterMs: b.resetAt - now } : { ok: true, retryAfterMs: 0 };
}
