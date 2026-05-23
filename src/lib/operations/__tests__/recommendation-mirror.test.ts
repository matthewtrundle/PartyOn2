import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderOperationsRecommendationMarkdown } from '../recommendation-mirror';
import type { OperationsRecommendation } from '@prisma/client';

function mkRec(over: Partial<Record<string, unknown>> = {}): OperationsRecommendation {
  return {
    id: 'cuid_1',
    signalKind: 'receiving-lag',
    severity: 'urgent',
    title: 'Receiving invoice INV-1 stuck',
    evidence: [
      { metricName: 'hours_pending', metricValue: 30 },
      { note: 'Distributor: RNDC', sourceLinks: [{ label: 'Open', href: '/ops/inventory/receiving/inv_1' }] },
    ],
    targetEntityType: 'receivingInvoice',
    targetEntityId: 'inv_1',
    actionPayload: { kind: 'navigate', label: 'Open receiving', params: { href: '/ops/inventory/receiving/inv_1' } } as never,
    status: 'open',
    snoozeUntil: null,
    dismissReason: null,
    actionLog: [],
    source: 'auto-snapshot',
    shippedAt: null,
    measuredAt: null,
    measurementResult: null,
    dedupeKey: 'receiving-lag:inv_1',
    createdAt: new Date('2026-05-18T07:30:00Z'),
    updatedAt: new Date('2026-05-18T07:30:00Z'),
    ...over,
  } as OperationsRecommendation;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('renderOperationsRecommendationMarkdown', () => {
  it('emits an Obsidian-shaped frontmatter block with the required keys', () => {
    const md = renderOperationsRecommendationMarkdown(mkRec());
    expect(md.startsWith('---\n')).toBe(true);
    expect(md).toContain('title: "Receiving invoice INV-1 stuck"');
    expect(md).toContain('period_proposed: 2026-W21');
    expect(md).toContain('date_proposed: 2026-05-18');
    expect(md).toContain('status: proposed');
    expect(md).toContain('severity: urgent');
    expect(md).toContain('signal_kind: receiving-lag');
    expect(md).toContain('target_entity_type: receivingInvoice');
    expect(md).toContain('target_entity_id: inv_1');
    expect(md).toContain('dedupe_key: receiving-lag:inv_1');
  });

  it('maps DB status → Obsidian status correctly', () => {
    const cases: Array<[string, string]> = [
      ['open', 'proposed'],
      ['approved', 'accepted'],
      ['shipped', 'executed'],
      ['rejected', 'dismissed'],
      ['invalidated', 'superseded'],
      ['snoozed', 'snoozed'],
    ];
    for (const [db, vault] of cases) {
      const md = renderOperationsRecommendationMarkdown(mkRec({ status: db }));
      expect(md).toContain(`status: ${vault}`);
    }
  });

  it('emits evidence rows with notes + metrics + nested source links', () => {
    const md = renderOperationsRecommendationMarkdown(mkRec());
    expect(md).toContain('## Evidence');
    expect(md).toContain('- **hours_pending**: 30');
    expect(md).toContain('- Distributor: RNDC');
    expect(md).toContain('  - [Open](/ops/inventory/receiving/inv_1)');
  });

  it('renders an Action log block when actionLog has entries', () => {
    const md = renderOperationsRecommendationMarkdown(mkRec({
      actionLog: [
        { timestamp: '2026-05-18T07:31:00Z', actionKind: 'navigate', actionLabel: 'Open receiving', result: 'navigated' },
      ] as never,
    }));
    expect(md).toContain('## Action log');
    expect(md).toContain('navigated · Open receiving');
  });

  it('omits the Action log block when actionLog is empty', () => {
    const md = renderOperationsRecommendationMarkdown(mkRec({ actionLog: [] as never }));
    expect(md).not.toContain('## Action log');
  });

  it('synthesizes a creation entry in Updates', () => {
    const md = renderOperationsRecommendationMarkdown(mkRec());
    expect(md).toContain('## Updates');
    expect(md).toContain('2026-05-18 — Created with status `proposed`');
  });

  it('appends a status-change event when provided', () => {
    const md = renderOperationsRecommendationMarkdown(mkRec({ status: 'rejected', dismissReason: 'intentional buffer' }), {
      date: '2026-05-19',
      fromStatus: 'open',
      toStatus: 'rejected',
      notes: 'intentional buffer',
      actor: 'operator',
    });
    expect(md).toContain('2026-05-19 — Status open → rejected (operator).');
    expect(md).toContain('Notes: intentional buffer');
  });

  it('emits a Dismiss reason block when dismissReason is populated', () => {
    const md = renderOperationsRecommendationMarkdown(mkRec({ status: 'rejected', dismissReason: 'duplicate of O0001' }));
    expect(md).toContain('## Dismiss reason');
    expect(md).toContain('duplicate of O0001');
  });
});
