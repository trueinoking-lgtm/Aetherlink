/**
 * Simple in-memory rate limiter for API routes.
 * For production, replace with Redis-based limiter (e.g., @upstash/ratelimit).
 */

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per window

const hits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = hits.get(identifier);

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    hits.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt };
  }

  entry.count += 1;
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  const allowed = entry.count <= RATE_LIMIT_MAX;

  return { allowed, remaining, resetAt: entry.resetAt };
}

export function getRateLimitHeaders(allowed: boolean, remaining: number, resetAt: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
    ...(!allowed ? { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) } : {}),
  };
}
