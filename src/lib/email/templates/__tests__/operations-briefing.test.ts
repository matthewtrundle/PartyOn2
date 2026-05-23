import { describe, it, expect } from 'vitest';
import {
  renderOperationsBriefingEmail,
  renderOperationsBriefingText,
} from '../operations-briefing';
import type { OpsBriefingPayload } from '@/lib/operations/briefing-payload';

function basePayload(over: Partial<OpsBriefingPayload> = {}): OpsBriefingPayload {
  return {
    weekLabel: '2026-W21',
    issueNumber: 21,
    year: 2026,
    generatedDate: 'Monday, May 18',
    generatedAtIso: '2026-05-18T14:00:00.000Z',
    stats: [
      { label: 'Inventory Accuracy', value: '92%', tone: 'good' },
      { label: 'Urgent Shortages', value: '1', tone: 'caution' },
      { label: 'Cost Coverage', value: '14%', tone: 'urgent', spark: [12, 13, 14] },
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
    whatsLacking: ['Cost coverage at 14% — Phase 1 goal is 30%.'],
    links: {
      queueUrl: 'https://example.com/admin/recommendations?domain=operations',
      dashboardUrl: 'https://example.com/admin/operations',
    },
    ...over,
  };
}

describe('renderOperationsBriefingEmail', () => {
  it('renders an HTML document with the week label in the title', () => {
    const html = renderOperationsBriefingEmail(basePayload());
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Operations Weekly Briefing — 2026-W21');
  });

  it('includes the masthead title text', () => {
    const html = renderOperationsBriefingEmail(basePayload());
    expect(html).toContain('Operations');
    expect(html).toContain('Weekly Briefing');
  });

  it('omits the urgent callout when topUrgentRec is null', () => {
    const html = renderOperationsBriefingEmail(basePayload({ topUrgentRec: null }));
    expect(html).not.toContain('Urgent — Act Now');
  });

  it('renders the urgent callout with title + href when topUrgentRec present', () => {
    const html = renderOperationsBriefingEmail(basePayload({
      topUrgentRec: {
        title: 'Receiving invoice INV-1 stuck',
        signalKind: 'receiving-lag',
        href: 'https://example.com/admin/recommendations?domain=operations#rec-r1',
      },
    }));
    expect(html).toContain('Urgent — Act Now');
    expect(html).toContain('Receiving invoice INV-1 stuck');
    expect(html).toContain('rec-r1');
  });

  it('escapes HTML in titles to prevent injection', () => {
    const html = renderOperationsBriefingEmail(basePayload({
      driftEvents: [{
        id: 'd1',
        title: '<script>alert(1)</script>',
        severity: 'urgent',
        signalKind: 'receiving-lag',
        ageHours: 30,
      }],
    }));
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders fallback text when sections are empty', () => {
    const html = renderOperationsBriefingEmail(basePayload());
    expect(html).toContain('No active drift events');
    expect(html).toContain('No overdue cycle counts');
    expect(html).toContain('No dangling invoices');
  });

  it('always renders the cost-coverage progress block', () => {
    const html = renderOperationsBriefingEmail(basePayload());
    expect(html).toContain('Cost Coverage — Progress to Goal');
    expect(html).toContain('14%');
    expect(html).toContain('/ 30% goal');
  });

  it('renders triage queue + dashboard CTA buttons', () => {
    const html = renderOperationsBriefingEmail(basePayload());
    expect(html).toContain('Triage Queue');
    expect(html).toContain('Ops Dashboard');
    expect(html).toContain('href="https://example.com/admin/recommendations?domain=operations"');
    expect(html).toContain('href="https://example.com/admin/operations"');
  });
});

describe('renderOperationsBriefingText', () => {
  it('produces a plain-text fallback with key sections', () => {
    const text = renderOperationsBriefingText(basePayload({
      topUrgentRec: { title: 'URG A', signalKind: 'receiving-lag', href: 'http://x' },
      driftEvents: [{ id: 'd1', title: 'Drift A', severity: 'high', signalKind: 'repeated-shorts', ageHours: 12 }],
    }));
    expect(text).toContain('Operations weekly briefing — 2026-W21');
    expect(text).toContain('URGENT — URG A');
    expect(text).toContain('[HIGH] Drift A');
    expect(text).toContain('Cost coverage: 14% / 30% goal');
  });
});
