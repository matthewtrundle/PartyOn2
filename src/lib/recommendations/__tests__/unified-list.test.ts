import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  recommendationItem: { findMany: vi.fn(), findUnique: vi.fn() },
  operationsRecommendation: { findMany: vi.fn(), findUnique: vi.fn() },
  operationsSnapshot: { findFirst: vi.fn() },
  analyticsSnapshot: { findFirst: vi.fn() },
}));

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));

import {
  listUnifiedRecommendations,
  findRecommendationLocation,
  buildActionLogEntry,
  isExecutableStatus,
} from '../unified-list';

function mkMarketingRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'm1',
    domain: 'marketing',
    source: 'director',
    generatedAt: new Date('2026-05-15T00:00:00Z'),
    title: 'Marketing rec',
    body: 'body',
    segment: 'bach',
    metric: null,
    currentValue: null,
    targetValue: null,
    impactDollarsMonthly: 500,
    effortTier: 'm',
    riskTier: 'recommend',
    status: 'open',
    shippedAt: null,
    notes: null,
    resultMetricBefore: null,
    resultMetricAfter: null,
    ...over,
  };
}

function mkOpsRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'o1',
    signalKind: 'receiving-lag',
    severity: 'urgent',
    title: 'Receiving invoice stuck',
    evidence: [{ metricName: 'hours_pending', metricValue: 36 }],
    targetEntityType: 'receivingInvoice',
    targetEntityId: 'inv_1',
    actionPayload: { kind: 'navigate', label: 'Open receiving', params: { href: '/ops/inventory/receiving/inv_1' } },
    status: 'open',
    source: 'auto-snapshot',
    dismissReason: null,
    shippedAt: null,
    createdAt: new Date('2026-05-14T00:00:00Z'),
    ...over,
  };
}

beforeEach(() => {
  Object.values(prismaMock).forEach((model) => {
    if (typeof model === 'object') {
      Object.values(model).forEach((fn) => {
        if (typeof fn === 'function' && 'mockReset' in fn) (fn as { mockReset: () => void }).mockReset();
      });
    }
  });
  prismaMock.operationsSnapshot.findFirst.mockResolvedValue({ capturedAt: new Date('2026-05-16T07:30:00Z') });
  prismaMock.analyticsSnapshot.findFirst.mockResolvedValue({ date: new Date('2026-05-16T00:00:00Z') });
});

describe('listUnifiedRecommendations', () => {
  it('merges marketing and ops, sorts urgent ops above lower-severity marketing', async () => {
    prismaMock.recommendationItem.findMany.mockResolvedValue([mkMarketingRow()]);
    prismaMock.operationsRecommendation.findMany.mockResolvedValue([mkOpsRow()]);
    const result = await listUnifiedRecommendations({ domain: 'all' });
    expect(result.data).toHaveLength(2);
    expect(result.data[0].domain).toBe('ops'); // urgent > medium
    expect(result.data[0].severity).toBe('critical');
    expect(result.data[1].domain).toBe('marketing');
  });

  it('returns counts for each domain that has active recs', async () => {
    prismaMock.recommendationItem.findMany.mockResolvedValue([
      mkMarketingRow(),
      mkMarketingRow({ id: 's1', domain: 'seo' }),
    ]);
    prismaMock.operationsRecommendation.findMany.mockResolvedValue([mkOpsRow()]);
    const result = await listUnifiedRecommendations({ domain: 'all' });
    expect(result.counts).toEqual({ marketing: 1, seo: 1, operations: 1 });
  });

  it('only queries ops table when domain=operations', async () => {
    prismaMock.operationsRecommendation.findMany.mockResolvedValue([mkOpsRow()]);
    await listUnifiedRecommendations({ domain: 'operations' });
    expect(prismaMock.recommendationItem.findMany).not.toHaveBeenCalled();
    expect(prismaMock.operationsRecommendation.findMany).toHaveBeenCalledOnce();
  });

  it('only queries marketing table when domain=marketing', async () => {
    prismaMock.recommendationItem.findMany.mockResolvedValue([mkMarketingRow()]);
    await listUnifiedRecommendations({ domain: 'marketing' });
    expect(prismaMock.operationsRecommendation.findMany).not.toHaveBeenCalled();
    expect(prismaMock.recommendationItem.findMany).toHaveBeenCalledOnce();
  });

  it('maps ops evidence into body', async () => {
    prismaMock.recommendationItem.findMany.mockResolvedValue([]);
    prismaMock.operationsRecommendation.findMany.mockResolvedValue([
      mkOpsRow({
        evidence: [
          { note: 'Hello there' },
          { metricName: 'hours_pending', metricValue: 36 },
        ],
      }),
    ]);
    const result = await listUnifiedRecommendations({ domain: 'operations' });
    expect(result.data[0].body).toContain('Hello there');
    expect(result.data[0].body).toContain('hours_pending: 36');
  });

  it('preserves actionPayload on ops rec', async () => {
    prismaMock.recommendationItem.findMany.mockResolvedValue([]);
    prismaMock.operationsRecommendation.findMany.mockResolvedValue([mkOpsRow()]);
    const result = await listUnifiedRecommendations({ domain: 'operations' });
    expect(result.data[0].actionPayload?.kind).toBe('navigate');
  });

  it('returns null actionPayload for marketing recs', async () => {
    prismaMock.recommendationItem.findMany.mockResolvedValue([mkMarketingRow()]);
    prismaMock.operationsRecommendation.findMany.mockResolvedValue([]);
    const result = await listUnifiedRecommendations({ domain: 'marketing' });
    expect(result.data[0].actionPayload).toBeNull();
  });
});

describe('findRecommendationLocation', () => {
  it('returns ops when only the ops row exists', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue({ status: 'open' });
    prismaMock.recommendationItem.findUnique.mockResolvedValue(null);
    const result = await findRecommendationLocation('id1');
    expect(result?.domain).toBe('ops');
  });

  it('returns marketing-seo when only the marketing row exists', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue(null);
    prismaMock.recommendationItem.findUnique.mockResolvedValue({ status: 'approved' });
    const result = await findRecommendationLocation('id1');
    expect(result?.domain).toBe('marketing-seo');
    expect(result?.status).toBe('approved');
  });

  it('returns null when neither has the id', async () => {
    prismaMock.operationsRecommendation.findUnique.mockResolvedValue(null);
    prismaMock.recommendationItem.findUnique.mockResolvedValue(null);
    expect(await findRecommendationLocation('id1')).toBeNull();
  });
});

describe('buildActionLogEntry', () => {
  it('preserves the original 4-tier result vocabulary', () => {
    const e = buildActionLogEntry({
      actionKind: 'navigate',
      actionLabel: 'Open receiving',
      result: 'navigated',
    });
    expect(e.result).toBe('navigated');
    expect(e.actionKind).toBe('navigate');
    expect(e.actionLabel).toBe('Open receiving');
  });

  it('adds an errorMessage explaining apiCall scaffolding for not_implemented', () => {
    const e = buildActionLogEntry({
      actionKind: 'apiCall',
      actionLabel: 'Reconcile pack',
      result: 'not_implemented',
    });
    expect(e.errorMessage).toContain('Phase 1C-b');
  });
});

describe('isExecutableStatus', () => {
  it('treats open and approved as executable; everything else not', () => {
    expect(isExecutableStatus('open')).toBe(true);
    expect(isExecutableStatus('approved')).toBe(true);
    expect(isExecutableStatus('rejected')).toBe(false);
    expect(isExecutableStatus('snoozed')).toBe(false);
    expect(isExecutableStatus('shipped')).toBe(false);
  });
});
