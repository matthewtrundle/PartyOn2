/**
 * Lead Flow board read-side: needs-response + suggest-lost derivations on
 * the card projection, duplicate-email flags, KPI math, and the Won/Lost
 * 30-day column window vs the all-time closed counts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Lead } from '@prisma/client';

interface MockLead {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  status: string;
  sourceWidget: string | null;
  metadata: unknown;
  resumeCart: unknown;
  pipelineStage: string | null;
  stageChangedAt: Date | null;
  boardSortOrder: number;
  leadScore: number | null;
  scoreBreakdown: unknown;
  lastContactedAt: Date | null;
  lastActivityAt: Date | null;
  reopenedAt: Date | null;
  owner: string | null;
  snoozedUntil: Date | null;
  lostReason: string | null;
  wonAt: Date | null;
  lostAt: Date | null;
  orderId: string | null;
  draftOrderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const db: {
  leads: MockLead[];
  followUps: Array<{ leadId: string; status: string }>;
} = { leads: [], followUps: [] };

/* eslint-disable @typescript-eslint/no-explicit-any */
function matchesWhere(lead: MockLead, where: Record<string, any>): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR') {
      const ors = cond as Array<Record<string, any>>;
      if (!ors.some((o) => matchesWhere(lead, o))) return false;
      continue;
    }
    const value = (lead as unknown as Record<string, unknown>)[key];
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      if ('in' in cond && !cond.in.includes(value)) return false;
      if ('not' in cond && value === cond.not) return false;
      if ('gte' in cond && !((value as Date) >= cond.gte)) return false;
    } else if (value !== cond) {
      return false;
    }
  }
  return true;
}

vi.mock('@/lib/database/client', () => ({
  prisma: {
    lead: {
      findMany: vi.fn(async ({ where, take }: any) =>
        db.leads.filter((l) => matchesWhere(l, where ?? {})).slice(0, take ?? 500)
      ),
      groupBy: vi.fn(async ({ where }: any) => {
        const byStage = new Map<string | null, number>();
        for (const l of db.leads.filter((x) => matchesWhere(x, where ?? {}))) {
          byStage.set(l.pipelineStage, (byStage.get(l.pipelineStage) ?? 0) + 1);
        }
        return [...byStage.entries()].map(([pipelineStage, n]) => ({
          pipelineStage,
          _count: { _all: n },
        }));
      }),
    },
    followUpJob: {
      groupBy: vi.fn(async ({ where }: any) => {
        const byLead = new Map<string, number>();
        for (const f of db.followUps) {
          if (!where.leadId.in.includes(f.leadId)) continue;
          if (!where.status.in.includes(f.status)) continue;
          byLead.set(f.leadId, (byLead.get(f.leadId) ?? 0) + 1);
        }
        return [...byLead.entries()].map(([leadId, n]) => ({ leadId, _count: { _all: n } }));
      }),
    },
  },
}));
/* eslint-enable @typescript-eslint/no-explicit-any */

// The enroll sweep is pipeline behavior with its own tests — stub it so the
// board read stays a read. isNewsletterOnly stays real (tray filtering).
vi.mock('../pipeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../pipeline')>();
  return { ...actual, sweepEnrollSubmitted: vi.fn(async () => 0) };
});

import { getBoardData, refineSource, toBoardLead } from '../board-data';

const DAY_MS = 86_400_000;
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS);
}

let seq = 0;
function makeLead(overrides: Partial<MockLead> = {}): MockLead {
  const lead: MockLead = {
    id: `lead-${++seq}`,
    email: `guest${seq}@example.com`,
    phone: null,
    firstName: 'Guest',
    lastName: `${seq}`,
    status: 'SUBMITTED',
    sourceWidget: 'CONTACT_FORM',
    metadata: { contactForm: { eventType: 'party' } },
    resumeCart: null,
    pipelineStage: 'NEW',
    stageChangedAt: daysAgo(1),
    boardSortOrder: seq,
    leadScore: 50,
    scoreBreakdown: null,
    lastContactedAt: null,
    lastActivityAt: null,
    reopenedAt: null,
    owner: null,
    snoozedUntil: null,
    lostReason: null,
    wonAt: null,
    lostAt: null,
    orderId: null,
    draftOrderId: null,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
    ...overrides,
  };
  db.leads.push(lead);
  return lead;
}

const asLead = (l: MockLead): Lead => l as unknown as Lead;
const ctx = (over: Partial<{ hasFollowUp: boolean; isDuplicate: boolean; now: Date }> = {}) => ({
  hasFollowUp: false,
  isDuplicate: false,
  now: new Date(),
  ...over,
});

beforeEach(() => {
  db.leads = [];
  db.followUps = [];
  seq = 0;
});

describe('toBoardLead — needs-response derivation', () => {
  it('is true when the lead was never contacted', () => {
    const card = toBoardLead(asLead(makeLead()), ctx());
    expect(card.needsResponse).toBe(true);
  });

  it('is true when activity landed after the last contact', () => {
    const lead = makeLead({ lastContactedAt: daysAgo(3), lastActivityAt: daysAgo(1) });
    expect(toBoardLead(asLead(lead), ctx()).needsResponse).toBe(true);
  });

  it('is false once contacted after the latest activity', () => {
    const lead = makeLead({ lastActivityAt: daysAgo(3), lastContactedAt: daysAgo(1) });
    expect(toBoardLead(asLead(lead), ctx()).needsResponse).toBe(false);
  });

  it('falls back to createdAt as the signal when there is no activity', () => {
    const lead = makeLead({ createdAt: daysAgo(1), lastContactedAt: daysAgo(3) });
    expect(toBoardLead(asLead(lead), ctx()).needsResponse).toBe(true);
  });

  it('is always false for closed and off-board cards', () => {
    const won = makeLead({ pipelineStage: 'WON' });
    const trayed = makeLead({ pipelineStage: null });
    expect(toBoardLead(asLead(won), ctx()).needsResponse).toBe(false);
    expect(toBoardLead(asLead(trayed), ctx()).needsResponse).toBe(false);
  });
});

describe('toBoardLead — suggest-lost', () => {
  it('flags open cards whose event date has passed', () => {
    const lead = makeLead({
      metadata: { contactForm: { eventType: 'party', eventDate: '2026-01-01' } },
    });
    expect(toBoardLead(asLead(lead), ctx()).suggestLost).toBe(true);
  });

  it('flags open cards quiet for more than 30 days', () => {
    const lead = makeLead({ createdAt: daysAgo(45), lastActivityAt: daysAgo(40) });
    expect(toBoardLead(asLead(lead), ctx()).suggestLost).toBe(true);
  });

  it('does not flag fresh cards with a future event', () => {
    const lead = makeLead({
      metadata: { contactForm: { eventType: 'party', eventDate: '2099-01-01' } },
      lastActivityAt: daysAgo(1),
    });
    expect(toBoardLead(asLead(lead), ctx()).suggestLost).toBe(false);
  });
});

describe('getBoardData — duplicate flag', () => {
  it('marks every card sharing an email, case-insensitively', async () => {
    makeLead({ email: 'Dupe@Example.com' });
    makeLead({ email: 'dupe@example.com', pipelineStage: 'CONTACTED' });
    makeLead({ email: 'solo@example.com' });

    const data = await getBoardData();
    const cards = Object.values(data.columns).flat();
    const dupes = cards.filter((c) => c.isDuplicate).map((c) => c.email?.toLowerCase());
    expect(dupes.sort()).toEqual(['dupe@example.com', 'dupe@example.com']);
    expect(cards.find((c) => c.email === 'solo@example.com')?.isDuplicate).toBe(false);
  });
});

describe('getBoardData — KPI math', () => {
  it('computes newThisWeek / hot / needsResponse over open columns only', async () => {
    makeLead({ leadScore: 85 }); // hot, new this week, unanswered
    makeLead({ createdAt: daysAgo(10), lastContactedAt: daysAgo(1) }); // old, answered
    makeLead({ pipelineStage: 'WON', stageChangedAt: daysAgo(1), leadScore: 90 }); // closed — excluded

    const { kpis } = await getBoardData();
    expect(kpis.newThisWeek).toBe(1);
    expect(kpis.hot).toBe(1);
    expect(kpis.needsResponse).toBe(1);
  });

  it('computes won/lost 30d and a rounded conversion rate', async () => {
    makeLead({ pipelineStage: 'WON', stageChangedAt: daysAgo(3) });
    makeLead({ pipelineStage: 'WON', stageChangedAt: daysAgo(5) });
    makeLead({ pipelineStage: 'LOST', stageChangedAt: daysAgo(7) });

    const { kpis } = await getBoardData();
    expect(kpis.won30d).toBe(2);
    expect(kpis.lost30d).toBe(1);
    expect(kpis.conversionPct).toBe(67); // 2/3 rounded
  });

  it('reports null conversion when nothing closed in the window', async () => {
    makeLead();
    const { kpis } = await getBoardData();
    expect(kpis.conversionPct).toBeNull();
  });
});

describe('refineSource — CONTACT_FORM split', () => {
  it('splits by metadata surface, with intent precedence', () => {
    expect(refineSource('CONTACT_FORM', { unifiedQuote: {} })).toEqual({
      key: 'CONTACT_FORM:quote',
      label: 'Quote Request',
    });
    expect(refineSource('CONTACT_FORM', { chatQuiz: {} }).label).toBe('Chat');
    expect(refineSource('CONTACT_FORM', { eventQuiz: {} }).label).toBe('Event Quiz');
    expect(refineSource('CONTACT_FORM', { contactForm: {} }).label).toBe('Contact Form');
    // A real quote outranks a bare contact-form submit when both surfaces exist.
    expect(refineSource('CONTACT_FORM', { contactForm: {}, unifiedQuote: {} }).key).toBe(
      'CONTACT_FORM:quote',
    );
  });

  it('falls back to the generic label for a surface-less CONTACT_FORM', () => {
    expect(refineSource('CONTACT_FORM', null)).toEqual({
      key: 'CONTACT_FORM',
      label: 'Contact / Quote',
    });
    expect(refineSource('CONTACT_FORM', { unrelated: 1 }).label).toBe('Contact / Quote');
  });

  it('passes non-CONTACT_FORM widgets through to their own label', () => {
    expect(refineSource('INBOUND_EMAIL', null)).toEqual({
      key: 'INBOUND_EMAIL',
      label: 'Inbound Email',
    });
    // The surface split only applies to CONTACT_FORM, never to other widgets.
    expect(refineSource('QUICK_BUY', { contactForm: {} }).label).toBe('Quick Buy');
    expect(refineSource(null, null)).toEqual({ key: 'OTHER', label: 'Site' });
  });

  it('carries the split label + key onto the board card', () => {
    const card = toBoardLead(asLead(makeLead({ metadata: { unifiedQuote: {} } })), ctx());
    expect(card.sourceLabel).toBe('Quote Request');
    expect(card.sourceKey).toBe('CONTACT_FORM:quote');
  });
});

describe('getBoardData — Won/Lost 30-day window vs all-time closed counts', () => {
  it('drops stale closed cards from columns but keeps them in closedCounts', async () => {
    makeLead({ pipelineStage: 'WON', stageChangedAt: daysAgo(40) }); // outside window
    makeLead({ pipelineStage: 'WON', stageChangedAt: daysAgo(5) });
    makeLead({ pipelineStage: 'LOST', stageChangedAt: daysAgo(45) }); // outside window

    const data = await getBoardData();
    expect(data.columns.WON).toHaveLength(1);
    expect(data.columns.LOST).toHaveLength(0);
    expect(data.kpis.won30d).toBe(1);
    expect(data.kpis.lost30d).toBe(0);
    // Column headers show the true totals.
    expect(data.closedCounts).toEqual({ won: 2, lost: 1 });
  });
});
