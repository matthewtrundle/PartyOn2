/**
 * Rule-based temperature scoring: per-surface fixtures, threshold boundaries,
 * CT-safe date math, past-event zeroing, missing-metadata leniency, clamping.
 */

import { describe, it, expect } from 'vitest';
import {
  computeLeadScore,
  daysUntilCT,
  dateStrCT,
  temperatureFor,
  SCORE_THRESHOLDS,
} from '../scoring';

/** Fixed clock: 2026-07-13 18:00 UTC = 1pm CT. */
const NOW = new Date('2026-07-13T18:00:00Z');

function isoDaysFromNow(days: number): string {
  const d = new Date(NOW.getTime() + days * 86_400_000);
  return dateStrCT(d);
}

describe('temperatureFor', () => {
  it('maps thresholds exactly (fork-compatible: hot ≥70, warm ≥40)', () => {
    expect(temperatureFor(100)).toBe('hot');
    expect(temperatureFor(SCORE_THRESHOLDS.hot)).toBe('hot');
    expect(temperatureFor(SCORE_THRESHOLDS.hot - 1)).toBe('warm');
    expect(temperatureFor(SCORE_THRESHOLDS.warm)).toBe('warm');
    expect(temperatureFor(SCORE_THRESHOLDS.warm - 1)).toBe('cold');
    expect(temperatureFor(0)).toBe('cold');
    expect(temperatureFor(null)).toBeNull();
    expect(temperatureFor(undefined)).toBeNull();
  });
});

describe('daysUntilCT', () => {
  it('is CT-safe: an evening in CT does not shift the day', () => {
    // 2026-07-14 03:00 UTC is still 2026-07-13 10pm in CT.
    const lateEvening = new Date('2026-07-14T03:00:00Z');
    expect(daysUntilCT('2026-07-14', lateEvening)).toBe(1);
    expect(daysUntilCT('2026-07-13', lateEvening)).toBe(0);
  });

  it('handles same-day, future, past, and garbage', () => {
    expect(daysUntilCT('2026-07-13', NOW)).toBe(0);
    expect(daysUntilCT('2026-07-20', NOW)).toBe(7);
    expect(daysUntilCT('2026-07-01', NOW)).toBe(-12);
    expect(daysUntilCT('not a date', NOW)).toBeNull();
    expect(daysUntilCT('', NOW)).toBeNull();
  });
});

describe('computeLeadScore — per-surface fixtures', () => {
  it('concierge lead with near event, big group, high budget is hot', () => {
    const { score, breakdown } = computeLeadScore({
      sourceWidget: 'PARTNER_LANDING_PAGE',
      metadata: {
        conciergeQuiz: {
          arrivalDate: isoDaysFromNow(5),
          headcount: 25,
          budgetPerPerson: '$300+',
          partyType: 'bachelor',
        },
      },
      createdAt: NOW,
      lastActivityAt: NOW,
      now: NOW,
    });
    expect(breakdown.eventProximity).toBe(30);
    expect(breakdown.dealSize).toBe(22); // 12 headcount + 10 budget
    expect(breakdown.sourceQuality).toBe(20);
    expect(breakdown.recency).toBe(15);
    expect(score).toBeGreaterThanOrEqual(SCORE_THRESHOLDS.hot);
    expect(temperatureFor(score)).toBe('hot');
  });

  it('chat lead with a mid-range date scores warm', () => {
    const { score, breakdown } = computeLeadScore({
      sourceWidget: 'CONTACT_FORM',
      metadata: {
        chatQuiz: {
          partyType: 'boat',
          headcount: 8,
          deliveryDate: isoDaysFromNow(45),
        },
      },
      createdAt: new Date(NOW.getTime() - 2 * 86_400_000),
      lastActivityAt: new Date(NOW.getTime() - 2 * 86_400_000),
      now: NOW,
    });
    expect(breakdown.eventProximity).toBe(12); // ≤60d
    expect(breakdown.dealSize).toBe(4); // headcount ≥5
    expect(breakdown.sourceQuality).toBe(14); // chatQuiz
    expect(breakdown.recency).toBe(12); // ≤3d
    expect(temperatureFor(score)).toBe('warm'); // 42 — decays to cold if they go quiet
  });

  it('event-quiz today/tomorrow timing counts as imminent', () => {
    const { breakdown } = computeLeadScore({
      sourceWidget: 'CONTACT_FORM',
      metadata: { eventQuiz: { partyType: 'birthday', timing: 'today' } },
      createdAt: NOW,
      now: NOW,
    });
    expect(breakdown.eventProximity).toBe(30);
    expect(breakdown.sourceQuality).toBe(12);
  });

  it('contact form parses stringified guest counts', () => {
    const { breakdown } = computeLeadScore({
      sourceWidget: 'CONTACT_FORM',
      metadata: {
        contactForm: {
          eventType: 'wedding',
          eventDate: isoDaysFromNow(20),
          guestCount: '120',
        },
      },
      createdAt: NOW,
      now: NOW,
    });
    expect(breakdown.eventProximity).toBe(20); // ≤30d
    expect(breakdown.dealSize).toBe(15); // ≥50 heads
    expect(breakdown.sourceQuality).toBe(10);
  });

  it('a past event zeroes proximity', () => {
    const { breakdown } = computeLeadScore({
      sourceWidget: 'CONTACT_FORM',
      metadata: { unifiedQuote: { deliveryDate: isoDaysFromNow(-3), headcount: 10 } },
      createdAt: NOW,
      now: NOW,
    });
    expect(breakdown.eventProximity).toBe(0);
  });

  it('newsletter-only signup scores cold', () => {
    const { score, breakdown } = computeLeadScore({
      sourceWidget: 'EMAIL_SIGNUP',
      metadata: { newsletter: { status: 'confirmed' } },
      createdAt: new Date(NOW.getTime() - 40 * 86_400_000),
      lastActivityAt: new Date(NOW.getTime() - 40 * 86_400_000),
      now: NOW,
    });
    expect(breakdown.sourceQuality).toBe(2);
    expect(temperatureFor(score)).toBe('cold');
  });

  it('tolerates missing/garbage metadata without throwing', () => {
    for (const metadata of [null, undefined, [], 'junk', { conciergeQuiz: 'oops' }]) {
      const { score } = computeLeadScore({
        sourceWidget: null,
        metadata,
        createdAt: NOW,
        now: NOW,
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('engagement adds checkout/resume/submit points, capped at 10', () => {
    const base = {
      sourceWidget: 'CONTACT_FORM',
      metadata: {},
      createdAt: NOW,
      now: NOW,
    } as const;
    const none = computeLeadScore({ ...base });
    const all = computeLeadScore({
      ...base,
      resumeCart: { items: [] },
      engagement: { hasCheckoutStart: true, formSubmitCount: 3 },
    });
    expect(all.breakdown.engagement).toBe(10);
    expect(none.breakdown.engagement).toBe(0);
  });

  it('never exceeds 100 or drops below 0', () => {
    const maxed = computeLeadScore({
      sourceWidget: 'PARTNER_LANDING_PAGE',
      metadata: {
        conciergeQuiz: {
          arrivalDate: isoDaysFromNow(2),
          headcount: 100,
          budgetPerPerson: '$500',
        },
      },
      resumeCart: {},
      engagement: { hasCheckoutStart: true, formSubmitCount: 5 },
      createdAt: NOW,
      lastActivityAt: NOW,
      now: NOW,
    });
    expect(maxed.score).toBe(100);
  });
});

describe('computeLeadScore — gap-closure sources (2026-07-14)', () => {
  const base = { createdAt: NOW, lastActivityAt: NOW, now: NOW } as const;

  it('groupDashboard metadata scores like a real quote and feeds facts', () => {
    const { breakdown } = computeLeadScore({
      ...base,
      sourceWidget: 'GROUP_DASHBOARD',
      metadata: {
        groupDashboard: { deliveryDate: isoDaysFromNow(6), partyType: 'bachelorette' },
      },
    });
    expect(breakdown.sourceQuality).toBe(16);
    expect(breakdown.eventProximity).toBe(30); // deliveryDate drives proximity
  });

  it('new widget tiers: OPS_INVOICE 16, PARTNER_INQUIRY 14, LEAD_MAGNET 6', () => {
    const q = (w: string) =>
      computeLeadScore({ ...base, sourceWidget: w, metadata: {} }).breakdown.sourceQuality;
    expect(q('OPS_INVOICE')).toBe(16);
    expect(q('PARTNER_INQUIRY')).toBe(14);
    expect(q('INBOUND_EMAIL')).toBe(14);
    expect(q('LEAD_MAGNET')).toBe(6);
    expect(q('EMAIL_SIGNUP')).toBe(2); // unchanged
  });

  it('opsInvoice deliveryDate reaches event proximity', () => {
    const { breakdown } = computeLeadScore({
      ...base,
      sourceWidget: 'OPS_INVOICE',
      metadata: { opsInvoice: { deliveryDate: isoDaysFromNow(10) } },
    });
    expect(breakdown.eventProximity).toBe(26); // ≤14 days
  });
});
