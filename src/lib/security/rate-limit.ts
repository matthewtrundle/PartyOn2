/**
 * Shared fixed-window rate limiter.
 *
 * Uses Vercel KV when configured — the counter is global across serverless
 * instances, so the limit is a real cap. Falls back to an in-memory Map when
 * KV is unavailable (dev, or a KV outage), which still limits per instance.
 * Fails OPEN on KV errors: the caller's primary auth gate must stand on its
 * own — this is a throttle, not an access control.
 *
 * Same get/set pattern as src/lib/auth/login-throttle.ts (the kv stub only
 * exposes get/set).
 */
import { kv, isKVConfigured } from '@/lib/database/client';

const memory = new Map<string, { count: number; resetAt: number }>();

/**
 * Count a hit against `scope:identifier` and report whether it is within
 * `limit` per `windowSeconds`. Returns true when the request is allowed.
 */
export async function checkRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const key = `ratelimit:${scope}:${identifier}`;

  if (isKVConfigured()) {
    try {
      const current = ((await kv.get(key)) as number | null) ?? 0;
      if (current >= limit) return false;
      await kv.set(key, current + 1, { ex: windowSeconds });
      return true;
    } catch (error) {
      console.error(`[Rate Limit] KV error for ${scope}, falling back to memory:`, error);
    }
  }

  const now = Date.now();
  const entry = memory.get(key);
  if (entry && now < entry.resetAt) {
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  }
  memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });

  // Bound fallback memory growth under identifier-rotating abuse.
  if (memory.size > 10_000) {
    for (const [k, v] of memory) {
      if (now >= v.resetAt) memory.delete(k);
    }
  }
  return true;
}
