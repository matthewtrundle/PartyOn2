/**
 * Unit tests for GET /api/ops/session — sliding renewal semantics after the
 * 2026-07-09 security review: renewal requires the explicit x-hq-renew
 * header, respects the absolute chain ceiling, and carries firstIat forward
 * so the ceiling can't be reset by renewing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SESSION_ABSOLUTE_MAX_S } from '@/lib/auth/ops-token';

const sessionMock = vi.hoisted(() => ({
  getOpsSession: vi.fn(),
  setOpsSessionCookie: vi.fn(),
}));

vi.mock('@/lib/auth/ops-session', () => ({
  getOpsSession: sessionMock.getOpsSession,
  setOpsSessionCookie: sessionMock.setOpsSessionCookie,
}));

import { GET } from '../route';

const nowS = Math.floor(Date.now() / 1000);

function req(renew: boolean): NextRequest {
  return new NextRequest('http://x/api/ops/session', {
    headers: renew ? { 'x-hq-renew': '1' } : {},
  });
}

beforeEach(() => {
  sessionMock.getOpsSession.mockReset();
  sessionMock.setOpsSessionCookie.mockReset();
});

describe('GET /api/ops/session', () => {
  it('renews a young chain when the shell asks, carrying firstIat forward', async () => {
    const firstIat = nowS - 5 * 24 * 60 * 60; // 5-day-old chain
    sessionMock.getOpsSession.mockResolvedValue({ role: 'admin', iat: nowS - 100, firstIat });
    const res = await GET(req(true));
    expect(await res.json()).toEqual({ authenticated: true, role: 'admin' });
    expect(sessionMock.setOpsSessionCookie).toHaveBeenCalledWith('admin', firstIat);
  });

  it('does NOT renew without the x-hq-renew header (still authenticates)', async () => {
    sessionMock.getOpsSession.mockResolvedValue({ role: 'admin', iat: nowS, firstIat: nowS });
    const res = await GET(req(false));
    expect(await res.json()).toEqual({ authenticated: true, role: 'admin' });
    expect(sessionMock.setOpsSessionCookie).not.toHaveBeenCalled();
  });

  it('refuses renewal past the absolute ceiling (token runs out naturally)', async () => {
    const firstIat = nowS - (SESSION_ABSOLUTE_MAX_S + 60); // past the 60d cap
    sessionMock.getOpsSession.mockResolvedValue({ role: 'employee', iat: nowS - 100, firstIat });
    const res = await GET(req(true));
    expect(await res.json()).toEqual({ authenticated: true, role: 'employee' });
    expect(sessionMock.setOpsSessionCookie).not.toHaveBeenCalled();
  });

  it('legacy tokens without firstIat fall back to iat as chain origin', async () => {
    const iat = nowS - 1000;
    sessionMock.getOpsSession.mockResolvedValue({ role: 'admin', iat });
    await GET(req(true));
    expect(sessionMock.setOpsSessionCookie).toHaveBeenCalledWith('admin', iat);
  });

  it('never issues a cookie without a valid session', async () => {
    sessionMock.getOpsSession.mockResolvedValue(null);
    const res = await GET(req(true));
    expect(await res.json()).toEqual({ authenticated: false });
    expect(sessionMock.setOpsSessionCookie).not.toHaveBeenCalled();
  });
});
