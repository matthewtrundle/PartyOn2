import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  operationsSnapshot: { findMany: vi.fn() },
  operationsRecommendation: { findMany: vi.fn() },
}));

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));

import { loadDashboardData } from '../dashboard-data';

function mkSnapshot(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 's1',
    capturedAt: new Date('2026-05-18T07:30:00Z'),
    inventoryAccuracyPct: 92,
    driftEventsTotal: 12,
    driftEventsBySignal: { 'receiving-lag': 3 },
    urgentShortagesCount: 1,
    costCoveragePct: 14,
    receivingLagP50Hours: 6.5,
    receivingLagP90Hours: 28,
    cycleCountsCompletedLast7d: 8,
    paidOrders14dShortageCount: 4,
    ...over,
  };
}

function mkRec(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'r1',
    signalKind: 'receiving-lag',
    severity: 'urgent',
    title: 'A',
    createdAt: new Date('2026-05-17T07:30:00Z'),
    ...over,
  };
}

beforeEach(() => {
  prismaMock.operationsSnapshot.findMany.mockReset();
  prismaMock.operationsRecommendation.findMany.mockReset();
});

describe('loadDashboardData', () => {
  it('returns null latestSnapshot when there are no snapshots yet', async () => {
    prismaMock.operationsSnapshot.findMany.mockResolvedValue([]);
    prismaMock.operationsRecommendation.findMany.mockResolvedValue([]);
    const data = await loadDashboardData();
    expect(data.latestSnapshot).toBeNull();
    expect(data.history).toEqual([]);
    expect(data.activeRecCounts.total).toBe(0);
  });

  it('chronologically orders the history (oldest → newest)', async () => {
    prismaMock.operationsSnapshot.findMany.mockResolvedValue([
      mkSnapshot({ capturedAt: new Date('2026-05-18T07:30:00Z'), driftEventsTotal: 3 }),
      mkSnapshot({ capturedAt: new Date('2026-05-17T07:30:00Z'), driftEventsTotal: 2 }),
      mkSnapshot({ capturedAt: new Date('2026-05-16T07:30:00Z'), driftEventsTotal: 1 }),
    ]);
    prismaMock.operationsRecommendation.findMany.mockResolvedValue([]);
    const data = await loadDashboardData();
    expect(data.history.map((h) => h.driftEventsTotal)).toEqual([1, 2, 3]);
  });

  it('counts active recs by severity and by signal', async () => {
    prismaMock.operationsSnapshot.findMany.mockResolvedValue([mkSnapshot()]);
    prismaMock.operationsRecommendation.findMany.mockResolvedValue([
      mkRec({ id: 'a', severity: 'urgent', signalKind: 'receiving-lag' }),
      mkRec({ id: 'b', severity: 'urgent', signalKind: 'receiving-lag' }),
      mkRec({ id: 'c', severity: 'high', signalKind: 'repeated-shorts' }),
      mkRec({ id: 'd', severity: 'normal', signalKind: 'cycle-count-overdue' }),
    ]);
    const data = await loadDashboardData();
    expect(data.activeRecCounts.bySeverity).toEqual({ urgent: 2, high: 1, normal: 1 });
    const recvLag = data.activeRecCounts.bySignal.find((r) => r.signalKind === 'receiving-lag');
    expect(recvLag?.count).toBe(2);
    // Sorted by count desc — receiving-lag should be first.
    expect(data.activeRecCounts.bySignal[0].signalKind).toBe('receiving-lag');
  });

  it('sorts topUrgent so urgents lead, then by recency', async () => {
    prismaMock.operationsSnapshot.findMany.mockResolvedValue([mkSnapshot()]);
    prismaMock.operationsRecommendation.findMany.mockResolvedValue([
      mkRec({ id: 'old-urgent', severity: 'urgent', createdAt: new Date('2026-05-15T00:00:00Z') }),
      mkRec({ id: 'new-high', severity: 'high', createdAt: new Date('2026-05-17T00:00:00Z') }),
      mkRec({ id: 'new-urgent', severity: 'urgent', createdAt: new Date('2026-05-17T01:00:00Z') }),
    ]);
    const data = await loadDashboardData();
    expect(data.topUrgent.map((r) => r.id)).toEqual(['new-urgent', 'old-urgent', 'new-high']);
  });
});
