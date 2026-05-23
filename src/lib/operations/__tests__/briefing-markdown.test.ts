import { describe, it, expect } from 'vitest';
import { renderBriefingMarkdown } from '../briefing-markdown';
import type { OpsBriefingPayload } from '../briefing-payload';

function payload(over: Partial<OpsBriefingPayload> = {}): OpsBriefingPayload {
  return {
    weekLabel: '2026-W21',
    issueNumber: 21,
    year: 2026,
    generatedDate: 'Monday, May 18',
    generatedAtIso: '2026-05-18T14:00:00.000Z',
    stats: [
      { label: 'Inventory Accuracy', value: '92%', tone: 'good' },
      { label: 'Urgent Shortages', value: '1', tone: 'caution' },
      { label: 'Cost Coverage', value: '14%', tone: 'urgent' },
      { label: 'Drift Events', value: '12', tone: 'caution' },
    ],
    topUrgentRec: null,
    driftEvents: [],
    cycleCounts: [],
    danglingDrafts: [],
    costCoveragePct: 14,
    costCoverageSpark: [12, 13, 14],
    costCoverageGoalPct: 30,
    receivingLagP50Hours: 6.5,
    receivingLagP90Hours: 28,
    whatsLacking: [],
    links: {
      queueUrl: 'https://example.com/admin/recommendations?domain=operations',
      dashboardUrl: 'https://example.com/admin/operations',
    },
    ...over,
  };
}

describe('renderBriefingMarkdown', () => {
  it('emits an Obsidian-shaped frontmatter block', () => {
    const md = renderBriefingMarkdown(payload());
    expect(md.startsWith('---\n')).toBe(true);
    expect(md).toContain('title: "Operations weekly briefing — 2026-W21"');
    expect(md).toContain('period: 2026-W21');
    expect(md).toContain('cost_coverage_pct: 14');
    expect(md).toContain('cost_coverage_goal_pct: 30');
  });

  it('renders fallback prose for each empty list section', () => {
    const md = renderBriefingMarkdown(payload());
    expect(md).toContain('No active drift events this week');
    expect(md).toContain('No overdue cycle counts');
    expect(md).toContain('No dangling invoices');
  });

  it('renders the Urgent block only when topUrgentRec is present', () => {
    expect(renderBriefingMarkdown(payload())).not.toContain('## Urgent — act first');
    const withUrgent = renderBriefingMarkdown(payload({
      topUrgentRec: { title: 'INV-1 stuck', signalKind: 'receiving-lag', href: 'https://example.com/x' },
    }));
    expect(withUrgent).toContain('## Urgent — act first');
    expect(withUrgent).toContain('INV-1 stuck');
  });

  it('emits drift-event tables with severity icons + signal kinds', () => {
    const md = renderBriefingMarkdown(payload({
      driftEvents: [
        { id: 'a', title: 'Negative available — Tito', severity: 'urgent', signalKind: 'negative-available', ageHours: 3 },
        { id: 'b', title: 'High lag', severity: 'high', signalKind: 'receiving-lag', ageHours: 28 },
      ],
    }));
    expect(md).toContain('## Drift events');
    expect(md).toContain('🔴 urgent');
    expect(md).toContain('🟠 high');
    expect(md).toContain('Negative available — Tito');
    expect(md).toContain('`negative-available`');
  });

  it('renders receiving lag percentiles in the stats table', () => {
    const md = renderBriefingMarkdown(payload());
    expect(md).toContain('| Receiving lag p50 | 6.5h |');
    expect(md).toContain('| Receiving lag p90 | 28.0h |');
  });

  it('emits the whats-lacking section when items are present', () => {
    const md = renderBriefingMarkdown(payload({ whatsLacking: ['cost coverage low'] }));
    expect(md).toContain('## What this brief lacks');
    expect(md).toContain('- cost coverage low');
  });
});
