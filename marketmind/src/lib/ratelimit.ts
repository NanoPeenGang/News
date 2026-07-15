/**
 * Minimal in-memory fixed-window rate limiter for sensitive endpoints
 * (brokerage sync, order placement). Per-process — fine for a single web
 * instance; swap for Redis if the web tier scales horizontally.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (w.count >= max) return { ok: false, retryAfterSec: Math.ceil((w.resetAt - now) / 1000) };
  w.count++;
  return { ok: true, retryAfterSec: 0 };
}

// Periodic cleanup so the map doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
}, 60_000).unref?.();
