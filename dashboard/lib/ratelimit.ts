// SECURITY: Rate limiting utilities (OWASP API4:2023 — Unrestricted Resource Consumption).
// Provides three tiers of sliding-window limiters backed by Upstash Redis.
// If Upstash env vars are missing (e.g. local dev without Redis), all limiters
// gracefully no-op so the app still works — they NEVER throw at module load.

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// SECURITY: Shape we expose — same surface as Ratelimit#limit so callers don't
// have to special-case the no-op path. Only `success` is consumed today, but
// expose the standard fields for parity if we ever want to surface remaining/reset.
export type RateLimitResult = {
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
};

// SECURITY: No-op limiter used when Upstash credentials are absent. Always allows
// the request. This is intentional — failing open in local dev is the documented
// behavior. In production the env vars MUST be set; the deploy gate is the
// missing-env warning logged on first import below.
const noopLimiter = {
  limit: async (_identifier: string): Promise<RateLimitResult> => ({ success: true }),
};

// Construct one Redis client and reuse it across all three limiters.
// `Redis.fromEnv()` would also work but we want an explicit graceful fallback.
const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV === 'production') {
  // SECURITY: Loud warning if rate limiting is disabled in production.
  // Don't crash — that would take the whole app down — but make it noisy.
  console.warn(
    '[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting is DISABLED. This is unsafe in production.'
  );
}

function build(tokens: number, window: `${number} s` | `${number} m`, prefix: string) {
  if (!redis) return noopLimiter;
  return new Ratelimit({
    redis,
    // Sliding window provides smoother throttling than fixed windows by
    // weighting the previous bucket. See @upstash/ratelimit docs.
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix,
    analytics: false,
  });
}

// SECURITY: Auth tier — strictest. Protects login/session/payment endpoints
// against credential stuffing & brute force. 5 requests / 60s per IP.
export const authLimiter = build(5, '60 s', 'rl:auth');

// SECURITY: General API tier — 20 requests / 60s per IP. Suitable for
// authenticated CRUD endpoints where light bursting is normal.
export const apiLimiter = build(20, '60 s', 'rl:api');

// SECURITY: Scrape tier — most restrictive throughput. 3 requests / 60s
// because each call fans out to expensive third-party services
// (Python scraper engine, OpenAI completions). Protects against bill-padding.
export const scrapeLimiter = build(3, '60 s', 'rl:scrape');

// SECURITY: Helper — extracts a best-effort client IP from the request headers.
// Trusts standard proxy headers in this order: x-forwarded-for, x-real-ip.
// Falls back to a constant so the limiter still keys *something* and we don't
// accidentally treat un-headered requests as one shared bucket without a key.
export function getClientIp(request: Request | { headers: Headers }): string {
  const headers = request.headers;
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    // x-forwarded-for can be a comma-separated chain — the leftmost entry is
    // the original client per the de-facto convention used by most proxies.
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = headers.get('x-real-ip');
  if (real) return real;
  return '127.0.0.1';
}
