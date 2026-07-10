/**
 * Unit tests for GET /api/ops/nav-badges — the HQ shell tab-badge counts.
 * Tightly mocked: verifies auth gating, the CT-today delivery window, and
 * that employees never pay for (or see) recommendation counts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

const prismaMock = vi.hoisted(() => ({
  order: { count: vi.fn() },
  recommendationItem: { count: vi.fn() },
  operationsRecommendation: { count: vi.fn() },
  financeRecommendation: { count: vi.fn() },
}));

const authMock = vi.hoisted(() => ({ requireOpsAuth: vi.fn() }));
const groupingMock = vi.hoisted(() => ({ todayCT: vi.fn() }));

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth/ops-session', () => ({ requireOpsAuth: authMock.requireOpsAuth }));
vi.mock('@/lib/ops/cooler-grouping', () => ({ todayCT: groupingMock.todayCT }));

import { GET } from '../route';

beforeEach(() => {
  prismaMock.order.count.mockReset();
  prismaMock.recommendationItem.count.mockReset();
  prismaMock.operationsRecommendation.count.mockReset();
  prismaMock.financeRecommendation.count.mockReset();
  authMock.requireOpsAuth.mockReset();
  groupingMock.todayCT.mockReturnValue('2026-07-09');
});

describe('GET /api/ops/nav-badges', () => {
  it('passes through the 401 when unauthenticated', async () => {
    const denied = NextResponse.json({ error: 'nope' }, { status: 401 });
    authMock.requireOpsAuth.mockResolvedValue(denied);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(prismaMock.order.count).not.toHaveBeenCalled();
  });

  it('admin gets ordersToday + summed recsOpen across the three stores', async () => {
    authMock.requireOpsAuth.mockResolvedValue({ role: 'admin' });
    prismaMock.order.count.mockResolvedValue(4);
    prismaMock.recommendationItem.count.mockResolvedValue(2);
    prismaMock.operationsRecommendation.count.mockResolvedValue(1);
    prismaMock.financeRecommendation.count.mockResolvedValue(3);

    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ ordersToday: 4, recsOpen: 6 });
  });

  it('scopes ordersToday to the UTC window of the CT date, undelivered, non-cancelled', async () => {
    authMock.requireOpsAuth.mockResolvedValue({ role: 'admin' });
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.recommendationItem.count.mockResolvedValue(0);
    prismaMock.operationsRecommendation.count.mockResolvedValue(0);
    prismaMock.financeRecommendation.count.mockResolvedValue(0);

    await GET();

    const where = prismaMock.order.count.mock.calls[0][0].where;
    expect(where.deliveryDate.gte.toISOString()).toBe('2026-07-09T00:00:00.000Z');
    expect(where.deliveryDate.lt.toISOString()).toBe('2026-07-10T00:00:00.000Z');
    expect(where.fulfillmentStatus).toEqual({ not: 'DELIVERED' });
    expect(where.status).toEqual({ not: 'CANCELLED' });
  });

  it('employee gets ordersToday but no recommendation queries', async () => {
    authMock.requireOpsAuth.mockResolvedValue({ role: 'employee' });
    prismaMock.order.count.mockResolvedValue(7);

    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ ordersToday: 7, recsOpen: 0 });
    expect(prismaMock.recommendationItem.count).not.toHaveBeenCalled();
    expect(prismaMock.operationsRecommendation.count).not.toHaveBeenCalled();
    expect(prismaMock.financeRecommendation.count).not.toHaveBeenCalled();
  });
});
