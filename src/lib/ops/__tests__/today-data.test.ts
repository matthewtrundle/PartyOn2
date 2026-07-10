/**
 * Unit tests for the Shift Board aggregate (getTodayData). Sources are
 * mocked; these verify the assembly logic: run/delivery bucketing by card,
 * triage ordering + role gating, stale-cart rules (first tab OPEN + >24h),
 * and the last-week revenue delta.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  groupOrderV2: { findMany: vi.fn() },
  order: { aggregate: vi.fn() },
  recommendationItem: { count: vi.fn() },
  operationsRecommendation: { count: vi.fn() },
  financeRecommendation: { count: vi.fn() },
}));

const ordersViewMock = vi.hoisted(() => ({ getOrdersView: vi.fn() }));
const eventsMock = vi.hoisted(() => ({ getOpsEventSummaries: vi.fn() }));
const groupingMock = vi.hoisted(() => ({ todayCT: vi.fn() }));

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));
vi.mock('../orders-view-data', () => ({ getOrdersView: ordersViewMock.getOrdersView }));
vi.mock('@/lib/events/ops-summary', () => ({ getOpsEventSummaries: eventsMock.getOpsEventSummaries }));
vi.mock('../cooler-grouping', () => ({ todayCT: groupingMock.todayCT }));

import { getTodayData } from '../today-data';

function makeCard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    deliveryTime: '11:30 AM',
    displayName: 'Sarah M',
    total: 480,
    totalItems: 8,
    isCooler: true,
    isVeryLarge: false,
    isBoatish: false,
    orders: [
      { id: 'o1', orderNumber: 2481, status: 'CONFIRMED', fulfillmentStatus: 'UNFULFILLED' },
    ],
    ...overrides,
  };
}

function baseView(cards: Array<Record<string, unknown>>, overdueCards: Array<Record<string, unknown>> = []): Record<string, unknown> {
  return {
    days: [{ date: '2026-07-09', total: 0, cards }],
    overdue: { cards: overdueCards, total: 0 },
    stats: { global: { todayRevenue: 1000, todayOrders: 3 } },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  groupingMock.todayCT.mockReturnValue('2026-07-09');
  prismaMock.$queryRaw.mockResolvedValue([{ low: BigInt(0), out: BigInt(0), oversold: BigInt(0) }]);
  prismaMock.groupOrderV2.findMany.mockResolvedValue([]);
  prismaMock.order.aggregate.mockResolvedValue({ _sum: { total: 0 } });
  prismaMock.recommendationItem.count.mockResolvedValue(0);
  prismaMock.operationsRecommendation.count.mockResolvedValue(0);
  prismaMock.financeRecommendation.count.mockResolvedValue(0);
  eventsMock.getOpsEventSummaries.mockResolvedValue([]);
  ordersViewMock.getOrdersView.mockResolvedValue(baseView([makeCard()]));
});

describe('getTodayData', () => {
  it('counts deliveries by card and computes next run from first undone card', async () => {
    ordersViewMock.getOrdersView.mockResolvedValue(
      baseView([
        makeCard({
          deliveryTime: '10:00 AM',
          orders: [{ id: 'a', orderNumber: 1, status: 'CONFIRMED', fulfillmentStatus: 'DELIVERED' }],
        }),
        makeCard({ deliveryTime: '2:00 PM' }),
        makeCard({
          deliveryTime: '4:00 PM',
          orders: [{ id: 'c', orderNumber: 3, status: 'CANCELLED', fulfillmentStatus: 'UNFULFILLED' }],
        }),
      ]),
    );

    const data = await getTodayData('admin');
    expect(data.kpis.deliveriesTotal).toBe(2); // cancelled-only card excluded
    expect(data.kpis.deliveriesDone).toBe(1);
    expect(data.kpis.nextRunTime).toBe('2:00 PM');
    expect(data.runs).toHaveLength(2);
    expect(data.runs[0].flags).toContain('DONE');
  });

  it('orders triage worst-first and gates recs to admin', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ low: BigInt(2), out: BigInt(1), oversold: BigInt(1) }]);
    prismaMock.recommendationItem.count.mockResolvedValue(4);

    const admin = await getTodayData('admin');
    const keys = admin.triage.map((t) => t.key);
    expect(keys.indexOf('oversold')).toBeLessThan(keys.indexOf('out'));
    expect(keys.indexOf('out')).toBeLessThan(keys.indexOf('low'));
    expect(keys).toContain('recs');

    const employee = await getTodayData('employee');
    expect(employee.triage.map((t) => t.key)).not.toContain('recs');
    expect(prismaMock.recommendationItem.count).toHaveBeenCalledTimes(1); // admin call only
  });

  it('counts only OPEN first-tab carts; stale = older than 24h', async () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const fresh = new Date(Date.now() - 1 * 60 * 60 * 1000);
    prismaMock.groupOrderV2.findMany.mockResolvedValue([
      // stale + open → counted + stale
      { createdAt: old, tabs: [{ status: 'OPEN', draftItems: [{ price: 10, quantity: 2 }] }] },
      // LOCKED first tab → excluded entirely (can't take money without reopening)
      { createdAt: old, tabs: [{ status: 'LOCKED', draftItems: [{ price: 5, quantity: 1 }] }] },
      // fresh + open → counted, not stale yet
      { createdAt: fresh, tabs: [{ status: 'OPEN', draftItems: [{ price: 20, quantity: 1 }] }] },
      // zero-value cart → ignored entirely
      { createdAt: old, tabs: [{ status: 'OPEN', draftItems: [] }] },
    ]);

    const data = await getTodayData('admin');
    expect(data.kpis.unpaidCartCount).toBe(2);
    expect(data.kpis.unpaidCartTotal).toBe(40);
    expect(data.kpis.staleCartCount).toBe(1);

    // 30-day window is part of the query contract
    const where = prismaMock.groupOrderV2.findMany.mock.calls[0][0].where;
    expect(where.createdAt.gte).toBeInstanceOf(Date);
  });

  it('computes revenue delta vs same weekday last week', async () => {
    prismaMock.order.aggregate.mockResolvedValue({ _sum: { total: 800 } });
    const data = await getTodayData('admin');
    expect(data.kpis.revenueToday).toBe(1000);
    expect(data.kpis.revenueDeltaPct).toBeCloseTo(25);

    prismaMock.order.aggregate.mockResolvedValue({ _sum: { total: 0 } });
    const noBaseline = await getTodayData('admin');
    expect(noBaseline.kpis.revenueDeltaPct).toBeNull();
  });

  it('flags below-minimum ticketed events', async () => {
    eventsMock.getOpsEventSummaries.mockResolvedValue([
      {
        key: 'full-moon',
        title: 'Full Moon Party',
        status: 'upcoming',
        detailPath: '/ops/full-moon',
        ticketed: { ticketsSold: 3, minimum: 32, postponed: false },
      },
      {
        key: 'past-event',
        title: 'Old Party',
        status: 'past',
        detailPath: '/ops/rsvps',
        ticketed: { ticketsSold: 0, minimum: 10, postponed: false },
      },
    ]);

    const data = await getTodayData('admin');
    const eventRows = data.triage.filter((t) => t.key.startsWith('event-'));
    expect(eventRows).toHaveLength(1);
    expect(eventRows[0].title).toContain('3/32');
  });
});
