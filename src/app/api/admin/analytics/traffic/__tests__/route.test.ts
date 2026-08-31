/**
 * Tests for GET /api/admin/analytics/traffic.
 *
 * Two things matter here. The endpoint is admin-only — this repo's `/api/admin/**`
 * routes are NOT covered by middleware, so each handler carries its own gate, and
 * the nav-level admin restriction is a client-side redirect an employee session
 * could simply skip by calling the route directly. And the `days` window must
 * survive junk input: Math.max/Math.min propagate NaN, which would otherwise
 * reach the query as an Invalid Date.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const requireAdminRoleMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/ops-session', () => ({ requireAdminRole: requireAdminRoleMock }));

const getWebsiteInsightsMock = vi.hoisted(() => vi.fn());
const getDailyTrafficMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/vercel-events', () => ({
  getWebsiteInsights: getWebsiteInsightsMock,
  getDailyTraffic: getDailyTrafficMock,
}));

import { GET } from '../route';

function makeRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/admin/analytics/traffic${query}`, { method: 'GET' });
}

describe('GET /api/admin/analytics/traffic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminRoleMock.mockResolvedValue({ role: 'admin' });
    getWebsiteInsightsMock.mockResolvedValue({
      days: 30,
      pageViews: 10,
      botViews: 4,
      uniqueVisitors: 7,
      topPages: [],
    });
  });

  it('refuses a non-admin caller without querying', async () => {
    const denied = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    requireAdminRoleMock.mockResolvedValue(denied);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(getWebsiteInsightsMock).not.toHaveBeenCalled();
  });

  it('defaults to a 30-day window', async () => {
    await GET(makeRequest());
    expect(getWebsiteInsightsMock).toHaveBeenCalledWith(30);
  });

  it('honours an explicit window and clamps it to 1..90', async () => {
    await GET(makeRequest('?days=7'));
    expect(getWebsiteInsightsMock).toHaveBeenCalledWith(7);

    await GET(makeRequest('?days=9999'));
    expect(getWebsiteInsightsMock).toHaveBeenCalledWith(90);

    await GET(makeRequest('?days=-5'));
    expect(getWebsiteInsightsMock).toHaveBeenCalledWith(1);
  });

  it('falls back to 30 days on non-numeric input instead of passing NaN through', async () => {
    await GET(makeRequest('?days=abc'));
    expect(getWebsiteInsightsMock).toHaveBeenCalledWith(30);
  });

  it('returns 500 when the query fails', async () => {
    getWebsiteInsightsMock.mockRejectedValue(new Error('relation does not exist'));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it('omits the daily series unless asked — headline callers should not pay for it', async () => {
    const res = await GET(makeRequest('?days=7'));
    const body = await res.json();

    expect(getDailyTrafficMock).not.toHaveBeenCalled();
    expect(body).not.toHaveProperty('daily');
  });

  it('includes the zero-filled daily series with include=daily', async () => {
    getDailyTrafficMock.mockResolvedValue([
      { day: '2026-08-29', human: 0, bot: 0 },
      { day: '2026-08-30', human: 25, bot: 22 },
    ]);

    const res = await GET(makeRequest('?days=7&include=daily'));
    const body = await res.json();

    expect(getDailyTrafficMock).toHaveBeenCalledWith(7);
    expect(body.daily).toHaveLength(2);
    expect(body.daily[1]).toEqual({ day: '2026-08-30', human: 25, bot: 22 });
  });
});
