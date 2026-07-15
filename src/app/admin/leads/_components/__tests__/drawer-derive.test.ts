/**
 * Pure drawer-derivation helpers: event-date formatting (CT-safe), the
 * "days away" phrasing, occasion humanizing, score-breakdown/short-date
 * formatting, and the at-a-glance activity summary chips.
 */

import { describe, it, expect } from 'vitest';
import type { LeadDetail } from '../drawer-types';
import {
  deriveActivitySummary,
  describeDaysAway,
  eventIsPast,
  formatEventDate,
  formatScoreBreakdown,
  formatShortDate,
  humanizeOccasion,
} from '../drawer-derive';

/** Fixed clock: 2026-07-13 18:00 UTC = 1pm CT (same as scoring.test.ts). */
const NOW = new Date('2026-07-13T18:00:00Z');

describe('formatEventDate', () => {
  it('formats a YYYY-MM-DD date from its parts (no UTC-midnight off-by-one)', () => {
    // Built from Y/M/D parts, so the day is stable in every viewer timezone —
    // a naive `new Date('2026-08-15')` would render Aug 14 west of UTC.
    expect(formatEventDate('2026-08-15')).toContain('Aug 15, 2026');
    expect(formatEventDate('2026-08-15')).toContain('Sat');
  });

  it('reads the date off a full ISO timestamp too', () => {
    expect(formatEventDate('2026-08-15T00:00:00Z')).toContain('Aug 15, 2026');
  });

  it('trims surrounding whitespace', () => {
    expect(formatEventDate('  2026-12-31  ')).toContain('Dec 31, 2026');
  });

  it('falls back to the raw string when it is not a parseable date', () => {
    expect(formatEventDate('sometime in the fall')).toBe('sometime in the fall');
  });
});

describe('describeDaysAway', () => {
  it('phrases today / tomorrow / future / past / yesterday', () => {
    expect(describeDaysAway('2026-07-13', NOW)).toBe('today');
    expect(describeDaysAway('2026-07-14', NOW)).toBe('tomorrow');
    expect(describeDaysAway('2026-07-20', NOW)).toBe('in 7 days');
    expect(describeDaysAway('2026-07-12', NOW)).toBe('yesterday');
    expect(describeDaysAway('2026-07-08', NOW)).toBe('5 days ago');
  });

  it('returns null for an unparseable date', () => {
    expect(describeDaysAway('nope', NOW)).toBeNull();
  });
});

describe('eventIsPast', () => {
  it('is true only for a date strictly before today (CT)', () => {
    expect(eventIsPast('2026-07-12', NOW)).toBe(true);
    expect(eventIsPast('2026-07-13', NOW)).toBe(false); // today is not past
    expect(eventIsPast('2026-07-20', NOW)).toBe(false);
    expect(eventIsPast('garbage', NOW)).toBe(false);
  });
});

describe('humanizeOccasion', () => {
  it('title-cases kebab/snake occasions', () => {
    expect(humanizeOccasion('bachelor-party')).toBe('Bachelor Party');
    expect(humanizeOccasion('corporate_event')).toBe('Corporate Event');
    expect(humanizeOccasion('wedding')).toBe('Wedding');
    expect(humanizeOccasion('lake-travis-boat')).toBe('Lake Travis Boat');
    expect(humanizeOccasion('  bachelorette  ')).toBe('Bachelorette');
  });
});

describe('formatShortDate', () => {
  it('formats a timestamp as "Mon D, YYYY"', () => {
    const out = formatShortDate('2026-07-14T12:00:00Z');
    expect(out).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    expect(out).toContain('Jul');
    expect(out).toContain('2026');
  });
});

describe('formatScoreBreakdown', () => {
  it('renders a de-camel-cased factor list', () => {
    expect(formatScoreBreakdown({ eventProximity: 30, dealSize: 25 })).toBe(
      'event proximity 30 · deal size 25',
    );
  });

  it('renders an em dash when there is no breakdown', () => {
    expect(formatScoreBreakdown(null)).toBe('—');
    expect(formatScoreBreakdown({})).toBe('—');
  });
});

// --- deriveActivitySummary -------------------------------------------------

let seq = 0;
const isoDaysAgo = (n: number): string => new Date(NOW.getTime() - n * 86_400_000).toISOString();

function ev(type: string): LeadDetail['events'][number] {
  return {
    id: `ev-${seq++}`,
    type,
    page: null,
    widget: null,
    fieldName: null,
    metadata: null,
    occurredAt: NOW.toISOString(),
  };
}

function emailLog(status: string, createdAt: string): LeadDetail['emailLogs'][number] {
  return { id: `em-${seq++}`, subject: 'Your inquiry', type: 'reply', status, createdAt };
}

function draft(status = 'SENT'): LeadDetail['drafts'][number] {
  return { id: `dr-${seq++}`, status, total: 500, createdAt: NOW.toISOString(), token: 't' };
}

function inbound(receivedAt: string): LeadDetail['inboundEmails'][number] {
  return {
    id: `in-${seq++}`,
    fromEmail: 'jane@example.com',
    fromName: 'Jane',
    subject: 'Boat party?',
    snippet: 'Hi, wondering about a boat...',
    bodyText: 'Hi, wondering about a boat party for 20 on Aug 15.',
    receivedAt,
  };
}

function makeDetail(over: Partial<LeadDetail>): LeadDetail {
  return {
    lead: {
      id: 'l1',
      email: 'a@b.com',
      phone: null,
      firstName: null,
      lastName: null,
      status: 'ACTIVE',
      pipelineStage: 'NEW',
      leadScore: 50,
      scoreBreakdown: null,
      sourcePage: null,
      sourceWidget: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      owner: null,
      snoozedUntil: null,
      notes: null,
      metadata: null,
      createdAt: NOW.toISOString(),
    },
    events: [],
    followUps: [],
    emailLogs: [],
    orders: [],
    drafts: [],
    inboundEmails: [],
    ...over,
  };
}

describe('deriveActivitySummary', () => {
  it('returns no chips when there is no activity', () => {
    expect(deriveActivitySummary(makeDetail({}), NOW)).toEqual([]);
  });

  it('leads with "Emailed us" when a customer emailed in', () => {
    const chips = deriveActivitySummary(makeDetail({ inboundEmails: [inbound(isoDaysAgo(1))] }), NOW);
    expect(chips[0]).toEqual({ key: 'emailed-us', label: 'Emailed us 1d ago', variant: 'green' });
  });

  it('flags a quote only when an invoice actually went out', () => {
    const sent = deriveActivitySummary(makeDetail({ drafts: [draft('SENT')] }), NOW);
    expect(sent).toContainEqual({ key: 'quote', label: 'Quote sent', variant: 'blue' });

    // PENDING (never sent), CANCELLED and EXPIRED must NOT claim "Quote sent" —
    // that would contradict the invoice-status line the facts panel shows.
    for (const dead of ['PENDING', 'CANCELLED', 'EXPIRED']) {
      const chips = deriveActivitySummary(makeDetail({ drafts: [draft(dead)] }), NOW);
      expect(chips.some((c) => c.key === 'quote')).toBe(false);
    }
  });

  it('shows outbound-email recency from the most recent log', () => {
    const detail = makeDetail({
      emailLogs: [emailLog('sent', isoDaysAgo(5)), emailLog('delivered', isoDaysAgo(2))],
    });
    const emailed = deriveActivitySummary(detail, NOW).find((c) => c.key === 'emailed');
    expect(emailed?.label).toBe('Emailed 2d ago');
  });

  it('says "today" and "1d ago" at the boundaries', () => {
    expect(
      deriveActivitySummary(makeDetail({ emailLogs: [emailLog('sent', isoDaysAgo(0))] }), NOW).find(
        (c) => c.key === 'emailed',
      )?.label,
    ).toBe('Emailed today');
    expect(
      deriveActivitySummary(makeDetail({ emailLogs: [emailLog('sent', isoDaysAgo(1))] }), NOW).find(
        (c) => c.key === 'emailed',
      )?.label,
    ).toBe('Emailed 1d ago');
  });

  it('surfaces an opened email (the strongest engagement signal available)', () => {
    const opened = deriveActivitySummary(
      makeDetail({ emailLogs: [emailLog('opened', isoDaysAgo(1))] }),
      NOW,
    );
    expect(opened).toContainEqual({ key: 'opened', label: 'Opened email', variant: 'green' });

    // A merely sent/delivered email is not "opened".
    const delivered = deriveActivitySummary(
      makeDetail({ emailLogs: [emailLog('delivered', isoDaysAgo(1))] }),
      NOW,
    );
    expect(delivered.some((c) => c.key === 'opened')).toBe(false);
  });

  it('flags checkout, a form submit, and counts site visits', () => {
    const detail = makeDetail({
      events: [ev('CHECKOUT_START'), ev('FORM_SUBMIT'), ev('PAGE_VIEW'), ev('PAGE_VIEW'), ev('PAGE_VIEW')],
    });
    const chips = deriveActivitySummary(detail, NOW);
    expect(chips).toContainEqual({ key: 'checkout', label: 'Started checkout', variant: 'amber' });
    expect(chips).toContainEqual({ key: 'submitted', label: 'Submitted a form', variant: 'gray' });
    expect(chips).toContainEqual({ key: 'visits', label: '3 site visits', variant: 'gray' });
  });

  it('singularizes a lone site visit and treats STEP_COMPLETE as a submit', () => {
    const chips = deriveActivitySummary(
      makeDetail({ events: [ev('STEP_COMPLETE'), ev('PAGE_VIEW')] }),
      NOW,
    );
    expect(chips).toContainEqual({ key: 'submitted', label: 'Submitted a form', variant: 'gray' });
    expect(chips).toContainEqual({ key: 'visits', label: '1 site visit', variant: 'gray' });
  });

  it('orders chips: emailed-us → quote → emailed → engagement → checkout → submit → visits', () => {
    const detail = makeDetail({
      inboundEmails: [inbound(isoDaysAgo(1))],
      drafts: [draft()],
      emailLogs: [emailLog('opened', isoDaysAgo(2))],
      events: [ev('CHECKOUT_START'), ev('FORM_SUBMIT'), ev('PAGE_VIEW')],
    });
    expect(deriveActivitySummary(detail, NOW).map((c) => c.key)).toEqual([
      'emailed-us',
      'quote',
      'emailed',
      'opened',
      'checkout',
      'submitted',
      'visits',
    ]);
  });
});
