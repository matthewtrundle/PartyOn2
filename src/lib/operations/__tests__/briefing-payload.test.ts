import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  operationsSnapshot: { findMany: vi.fn() },
  operationsRecommendation: { findMany: vi.fn() },
  draftOrder: { findMany: vi.fn() },
}));

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));

import { buildOperationsBriefingPayload } from '../briefing-payload';

function mkSnapshot(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 's1',
    capturedAt: new Date('2026-05-18T07:30:00Z'),
    inventoryAccuracyPct: 92,
    driftEventsTotal: 12,
    driftEventsBySignal: { 'receiving-lag': 3, 'repeated-shorts': 2 },
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
    title: 'Receiving invoice INV-1 stuck',
    evidence: [{ metricName: 'hours_pending', metricValue: 30 }],
    targetEntityType: 'receivingInvoice',
    targetEntityId: 'inv_1',
    actionPayload: { kind: 'navigate', params: {} },
    status: 'open',
    snoozeUntil: null,
    dismissReason: null,
    actionLog: [],
    source: 'auto-snapshot',
    shippedAt: null,
    measuredAt: null,
    measurementResult: null,
    dedupeKey: 'receiving-lag:inv_1',
    createdAt: new Date('2026-05-17T07:30:00Z'),
    updatedAt: new Date('2026-05-17T07:30:00Z'),
    ...over,
  };
}

beforeEach(() => {
  prismaMock.operationsSnapshot.findMany.mockReset();
  prismaMock.operationsRecommendation.findMany.mockReset();
  prismaMock.draftOrder.findMany.mockReset();
  prismaMock.operationsSnapshot.findMany.mockResolvedValue([mkSnapshot()]);
  prismaMock.operationsRecommendation.findMany.mockResolvedValue([]);
  prismaMock.draftOrder.findMany.mockResolvedValue([]);
});

const baseInput = () => ({
  snapshot: mkSnapshot() as never,
  weekLabel: '2026-W21',
  issueNumber: 21,
  year: 2026,
  generatedAt: new Date('2026-05-18T14:00:00Z'),
  queueUrl: 'https://example.com/admin/recommendations?domain=operations',
  dashboardUrl: 'https://example.com/admin/operations',
});

describe('buildOperationsBriefingPayload', () => {
  it('produces stats with the four required cards', async () => {
    const out = await buildOperationsBriefingPayload(baseInput());
    expect(out.stats.map((s) => s.label)).toEqual([
      'Inventory Accuracy',
      'Urgent Shortages',
      'Cost Coverage',
      'Drift Events',
    ]);
  });

  it('tones cost coverage as urgent when below 15%', async () => {
    const snap = mkSnapshot({ costCoveragePct: 4 });
    const out = await buildOperationsBriefingPayload({ ...baseInput(), snapshot: snap as never });
    const coverage = out.stats.find((s) => s.label === 'Cost Coverage');
    expect(coverage?.tone).toBe('urgent');
  });

  it('promotes the highest-severity rec to topUrgentRec', async () => {
    prismaMock.operationsRecommendation.findMany.mockResolvedValue([
      mkRec({ id: 'r-normal', severity: 'normal' }),
      mkRec({ id: 'r-urgent', severity: 'urgent', title: 'Urgent A' }),
    ]);
    const out = await buildOperationsBriefingPayload(baseInput());
    expect(out.topUrgentRec?.title).toBe('Urgent A');
  });

  it('returns null topUrgentRec when no urgent recs exist', async () => {
    prismaMock.operationsRecommendation.findMany.mockResolvedValue([mkRec({ severity: 'high' })]);
    const out = await buildOperationsBriefingPayload(baseInput());
    expect(out.topUrgentRec).toBeNull();
  });

  it('caps driftEvents at 6 high+ recs and skips normal severity', async () => {
    const recs = [
      ...Array.from({ length: 4 }, (_, i) => mkRec({ id: `u${i}`, severity: 'urgent', title: `Urgent ${i}` })),
      ...Array.from({ length: 4 }, (_, i) => mkRec({ id: `h${i}`, severity: 'high', title: `High ${i}` })),
      mkRec({ id: 'n1', severity: 'normal', title: 'Normal noise' }),
    ];
    prismaMock.operationsRecommendation.findMany.mockResolvedValue(recs);
    const out = await buildOperationsBriefingPayload(baseInput());
    expect(out.driftEvents).toHaveLength(6);
    expect(out.driftEvents.every((d) => d.severity !== 'normal')).toBe(true);
    expect(out.driftEvents[0].severity).toBe('urgent');
  });

  it('extracts cycle-count overdue recs with their units_14d metric', async () => {
    prismaMock.operationsRecommendation.findMany.mockResolvedValue([
      mkRec({
        id: 'cc1',
        signalKind: 'cycle-count-overdue',
        severity: 'normal',
        title: 'Tito Vodka: top mover, not counted in 10d',
        evidence: [{ metricName: 'units_14d', metricValue: 47 }],
      }),
    ]);
    const out = await buildOperationsBriefingPayload(baseInput());
    expect(out.cycleCounts).toHaveLength(1);
    expect(out.cycleCounts[0].unitsLast14d).toBe(47);
  });

  it('surfaces dangling drafts older than the threshold', async () => {
    prismaMock.draftOrder.findMany.mockResolvedValue([
      {
        id: 'd1',
        customerName: 'Bach Party',
        total: 425.5,
        sentAt: new Date('2026-05-13T07:30:00Z'), // 5 days before generatedAt
        status: 'SENT',
      },
    ]);
    const out = await buildOperationsBriefingPayload(baseInput());
    expect(out.danglingDrafts).toHaveLength(1);
    expect(out.danglingDrafts[0].total).toBe('$426');
    expect(out.danglingDrafts[0].ageDays).toBe(5);
  });

  it('adds whatsLacking entries for missing data + coverage gap', async () => {
    const snap = mkSnapshot({ inventoryAccuracyPct: null, receivingLagP50Hours: null, costCoveragePct: 4 });
    const out = await buildOperationsBriefingPayload({ ...baseInput(), snapshot: snap as never });
    expect(out.whatsLacking.length).toBeGreaterThanOrEqual(3);
    expect(out.whatsLacking.some((s) => s.includes('accuracy'))).toBe(true);
    expect(out.whatsLacking.some((s) => s.includes('Receiving lag'))).toBe(true);
    expect(out.whatsLacking.some((s) => s.includes('Cost coverage'))).toBe(true);
  });

  it('exposes spark series only when the snapshot history has ≥2 rows', async () => {
    prismaMock.operationsSnapshot.findMany.mockResolvedValue([mkSnapshot()]);
    const oneRowOut = await buildOperationsBriefingPayload(baseInput());
    expect(oneRowOut.stats.find((s) => s.label === 'Cost Coverage')?.spark).toBeUndefined();

    prismaMock.operationsSnapshot.findMany.mockResolvedValue([mkSnapshot(), mkSnapshot({ costCoveragePct: 10 })]);
    const out = await buildOperationsBriefingPayload(baseInput());
    expect(out.costCoverageSpark.length).toBe(2);
  });
});
