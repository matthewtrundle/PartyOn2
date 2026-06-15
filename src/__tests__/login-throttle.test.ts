/**
 * Unit tests for the ops-login brute-force throttle.
 *
 * Forces the in-memory fallback path (isKVConfigured → false) so the
 * counting / lockout / reset logic is exercised deterministically without a
 * live KV. In production the same logic runs against Vercel KV.
 */

import { describe, it, expect, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// Force the in-memory path; the kv stub here is never reached.
vi.mock('@/lib/database/client', () => ({
  isKVConfigured: () => false,
  kv: { get: async () => null, set: async () => null },
}));

import {
  checkLoginThrottle,
  recordFailedLogin,
  clearLoginThrottle,
  getClientIp,
} from '@/lib/auth/login-throttle';

const MAX = 10; // keep in sync with login-throttle.ts

// The module's Map persists across tests, so each test uses a distinct IP.
describe('login-throttle (in-memory fallback)', () => {
  it('allows up to MAX failed attempts, then blocks', async () => {
    const ip = 'ip-block';
    for (let i = 0; i < MAX; i++) {
      const r = await checkLoginThrottle(ip);
      expect(r.allowed).toBe(true);
      await recordFailedLogin(ip);
    }

    const blocked = await checkLoginThrottle(ip);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('reports decreasing remaining budget', async () => {
    const ip = 'ip-remaining';
    expect((await checkLoginThrottle(ip)).remaining).toBe(MAX);
    await recordFailedLogin(ip);
    expect((await checkLoginThrottle(ip)).remaining).toBe(MAX - 1);
    await recordFailedLogin(ip);
    expect((await checkLoginThrottle(ip)).remaining).toBe(MAX - 2);
  });

  it('clearLoginThrottle resets a blocked IP (successful login frees the bucket)', async () => {
    const ip = 'ip-clear';
    for (let i = 0; i < MAX; i++) await recordFailedLogin(ip);
    expect((await checkLoginThrottle(ip)).allowed).toBe(false);

    await clearLoginThrottle(ip);
    const after = await checkLoginThrottle(ip);
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(MAX);
  });

  it('tracks each IP independently', async () => {
    const a = 'ip-a';
    const b = 'ip-b';
    for (let i = 0; i < MAX; i++) await recordFailedLogin(a);
    expect((await checkLoginThrottle(a)).allowed).toBe(false);
    expect((await checkLoginThrottle(b)).allowed).toBe(true);
  });
});

describe('getClientIp', () => {
  const make = (headers: Record<string, string>): NextRequest =>
    ({ headers: new Headers(headers) } as unknown as NextRequest);

  it('uses the first hop of x-forwarded-for', () => {
    expect(getClientIp(make({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    expect(getClientIp(make({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9');
  });

  it("returns 'unknown' when no IP headers are present", () => {
    expect(getClientIp(make({}))).toBe('unknown');
  });
});
