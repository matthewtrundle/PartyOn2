/**
 * Brute-force throttle for the ops login endpoint (/api/admin/verify).
 *
 * That endpoint is the single gate in front of the entire /api/admin and
 * /api/v1/admin surface, so it must not be guessable at edge throughput.
 * We cap failed attempts per client IP using Vercel KV (shared across all
 * serverless instances), with an in-memory fallback for local/dev or KV
 * outages. The limiter fails OPEN — a KV/logic error never blocks a login,
 * because the password check is still required either way.
 */

import { NextRequest } from 'next/server';
import { kv, isKVConfigured } from '@/lib/database/client';

const MAX_FAILED_ATTEMPTS = 10; // per IP, per window
const WINDOW_SECONDS = 60;

// In-memory fallback when KV is not configured (dev, or KV outage)
const memory = new Map<string, { count: number; resetAt: number }>();

/** Best-effort client IP from proxy headers; 'unknown' shares one bucket. */
export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function key(ip: string): string {
  return `ratelimit:ops-login:${ip}`;
}

/**
 * Read-only check: is this IP allowed another login attempt?
 * Does not increment — call recordFailedLogin() on a wrong password.
 */
export async function checkLoginThrottle(
  ip: string
): Promise<{ allowed: boolean; remaining: number }> {
  if (isKVConfigured()) {
    try {
      const current = ((await kv.get(key(ip))) as number | null) ?? 0;
      return {
        allowed: current < MAX_FAILED_ATTEMPTS,
        remaining: Math.max(0, MAX_FAILED_ATTEMPTS - current),
      };
    } catch (error) {
      console.error('[Login Throttle] KV read error, falling back to memory:', error);
    }
  }

  const entry = memory.get(ip);
  if (entry && Date.now() < entry.resetAt) {
    return {
      allowed: entry.count < MAX_FAILED_ATTEMPTS,
      remaining: Math.max(0, MAX_FAILED_ATTEMPTS - entry.count),
    };
  }
  return { allowed: true, remaining: MAX_FAILED_ATTEMPTS };
}

/** Increment the failed-attempt counter for this IP. */
export async function recordFailedLogin(ip: string): Promise<void> {
  if (isKVConfigured()) {
    try {
      const current = ((await kv.get(key(ip))) as number | null) ?? 0;
      await kv.set(key(ip), current + 1, { ex: WINDOW_SECONDS });
      return;
    } catch (error) {
      console.error('[Login Throttle] KV write error, falling back to memory:', error);
    }
  }

  const now = Date.now();
  const entry = memory.get(ip);
  if (entry && now < entry.resetAt) {
    entry.count++;
  } else {
    memory.set(ip, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
  }

  // Bound memory growth under IP-rotating attacks (fallback path only)
  if (memory.size > 10_000) {
    for (const [k, v] of memory) {
      if (now >= v.resetAt) memory.delete(k);
    }
  }
}

/** Clear the counter for an IP after a successful login (frees shared-NAT budget). */
export async function clearLoginThrottle(ip: string): Promise<void> {
  if (isKVConfigured()) {
    try {
      // Reset to 0 with a 1s TTL — equivalent to delete, using the shared
      // kv stub's get/set surface (which doesn't expose del).
      await kv.set(key(ip), 0, { ex: 1 });
      return;
    } catch {
      // ignore — counter will expire on its own
    }
  }
  memory.delete(ip);
}
