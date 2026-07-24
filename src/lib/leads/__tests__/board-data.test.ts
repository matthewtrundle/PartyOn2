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
  affiliateId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const db: {
  leads: MockLead[];
  followUps: Array<{ leadId: string; status: string }>;
  groups: Array<{
    id: string;
    shareCode: string;
    affiliateId: string | null;
    tabs: Array<{ draftItems: Array<{ price: number; quantity: number }> }>;
  }>;
  affiliates: Array<{ id: string; businessName: string; code: string }>;
  touchEvents: Array<{ leadId: string }>;
} = { leads: [], followUps: [], groups: [], affiliates: [], touchEvents: [] };

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
    groupOrderV2: {
      findMany: vi.fn(async ({ where }: any) =>
        db.groups.filter((g) => where.id.in.includes(g.id)),
      ),
    },
    affiliate: {
      findMany: vi.fn(async ({ where }: any) =>
        db.affiliates.filter((a) => where.id.in.includes(a.id)),
      ),
    },
    // Touch-count raw query — groups db.touchEvents by lead (the real SQL's
    // JSON-path filter is exercised in prod; here we mock the shape).
    $queryRaw: vi.fn(async () => {
      const byLead = new Map<string, number>();
      for (const e of db.touchEvents) byLead.set(e.leadId, (byLead.get(e.leadId) ?? 0) + 1);
      return [...byLead.entries()].map(([lead_id, n]) => ({ lead_id, n }));
    }),
  },
}));
/* eslint-enable @typescript-eslint/no-explicit-any */

// The enroll sweep is pipeline behavior with its own tests — stub it so the
// board read stays a read. isNewsletterOnly stays real (tray filtering).
vi.mock('../pipeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../pipeline')>();
  return { ...actual, sweepEnrollSubmitted: vi.fn(async () => 0) };
});

import {
  compareBoardCards,
  getBoardData,
  isAdsLead,
  isPremierLead,
  needsReply,
  refineSource,
  toBoardLead,
} from '../board-data';

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
    affiliateId: null,
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
  db.groups = [];
  db.affiliates = [];
  db.touchEvents = [];
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

  // Freshness window (operator decision 2026-07-23): stale signals stop
  // flagging so red always means "act now", not "never contacted, ever".
  it('stops flagging an uncontacted lead once its signal is older than 7 days', () => {
    const stale = makeLead({ createdAt: daysAgo(10) });
    expect(toBoardLead(asLead(stale), ctx()).needsResponse).toBe(false);
  });

  it('stops flagging when the unanswered activity itself is older than 7 days', () => {
    const lead = makeLead({
      createdAt: daysAgo(30),
      lastActivityAt: daysAgo(8),
      lastContactedAt: daysAgo(20),
    });
    expect(toBoardLead(asLead(lead), ctx()).needsResponse).toBe(false);
  });

  it('keeps flagging fresh unanswered activity on an old lead', () => {
    const lead = makeLead({
      createdAt: daysAgo(60),
      lastActivityAt: daysAgo(2),
      lastContactedAt: daysAgo(20),
    });
    expect(toBoardLead(asLead(lead), ctx()).needsResponse).toBe(true);
  });
});

describe('needsReply — window boundary', () => {
  const now = new Date('2026-07-23T12:00:00Z');
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

  it('flags just inside the 7-day window, not just outside', () => {
    const base = { lastContactedAt: null, lastActivityAt: null };
    expect(needsReply({ ...base, createdAt: hoursAgo(7 * 24 - 1) }, now)).toBe(true);
    expect(needsReply({ ...base, createdAt: hoursAgo(7 * 24 + 1) }, now)).toBe(false);
  });

  it('never flags a lead contacted after its latest signal, regardless of freshness', () => {
    expect(
      needsReply(
        { createdAt: hoursAgo(48), lastActivityAt: hoursAgo(24), lastContactedAt: hoursAgo(1) },
        now,
      ),
    ).toBe(false);
  });
});

describe('compareBoardCards — hot→cold ordering', () => {
  const card = (score: number | null, createdAt: string) =>
    ({ score, createdAt }) as Parameters<typeof compareBoardCards>[0];

  it('orders by score desc, unscored last, newest first on ties', () => {
    const cards = [
      card(null, '2026-07-22T00:00:00Z'),
      card(40, '2026-07-01T00:00:00Z'),
      card(85, '2026-07-10T00:00:00Z'),
      card(40, '2026-07-20T00:00:00Z'),
    ];
    const sorted = [...cards].sort(compareBoardCards);
    expect(sorted.map((c) => [c.score, c.createdAt.slice(0, 10)])).toEqual([
      [85, '2026-07-10'],
      [40, '2026-07-20'], // tie broken newest-first
      [40, '2026-07-01'],
      [null, '2026-07-22'], // unscored sinks even when newest
    ]);
  });

  it('sorts each board column hot→cold end-to-end', async () => {
    makeLead({ leadScore: 20 });
    makeLead({ leadScore: 90 });
    makeLead({ leadScore: null });
    makeLead({ leadScore: 55 });

    const data = await getBoardData();
    expect(data.columns.NEW.map((c) => c.score)).toEqual([90, 55, 20, null]);
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

describe('refineSource — sheet-level detail (keys frozen, labels enriched)', () => {
  it('names the quote sub-flow when unifiedQuote.source is present', () => {
    expect(refineSource('CONTACT_FORM', { unifiedQuote: { source: 'package-builder' } })).toEqual({
      key: 'CONTACT_FORM:quote',
      label: 'Quote · Builder',
    });
    expect(refineSource('CONTACT_FORM', { unifiedQuote: { source: 'chat' } }).label).toBe(
      'Quote · Chat',
    );
    // Unknown/missing sub-flow keeps the generic label.
    expect(refineSource('CONTACT_FORM', { unifiedQuote: { source: 'mystery' } }).label).toBe(
      'Quote Request',
    );
  });

  it('names the QuickBuy occasion when the quickBuy surface exists', () => {
    expect(refineSource('QUICK_BUY', { quickBuy: { occasion: 'wedding' } })).toEqual({
      key: 'QUICK_BUY',
      label: 'Quick Buy · Wedding',
    });
    expect(refineSource('QUICK_BUY', {}).label).toBe('Quick Buy');
  });

  it('splits concierge party type from partner-slug leads', () => {
    expect(
      refineSource('PARTNER_LANDING_PAGE', {
        partner: 'premier-concierge',
        conciergeQuiz: { partyType: 'bachelorette' },
      }),
    ).toEqual({ key: 'PARTNER_LANDING_PAGE', label: 'Concierge · Bachelorette' });
    expect(
      refineSource('PARTNER_LANDING_PAGE', { partner: 'premier-party-cruises' }).label,
    ).toBe('Partner · Premier Party Cruises');
    // premier-concierge without a quiz surface falls back to the base label.
    expect(refineSource('PARTNER_LANDING_PAGE', { partner: 'premier-concierge' }).label).toBe(
      'Concierge',
    );
  });

  it('names dashboard provenance from groupDashboard.source', () => {
    expect(
      refineSource('GROUP_DASHBOARD', { groupDashboard: { source: 'WEBHOOK' } }).label,
    ).toBe('Dashboard · Boat Webhook');
    expect(
      refineSource('GROUP_DASHBOARD', { groupDashboard: { source: 'PARTNER_PAGE' } }).label,
    ).toBe('Dashboard · Partner');
    // DIRECT/INTERNAL keep the familiar base label.
    expect(
      refineSource('GROUP_DASHBOARD', { groupDashboard: { source: 'DIRECT' } }).label,
    ).toBe('Party Dashboard');
  });

  it('labels Wayne chat leads instead of "Site"', () => {
    expect(refineSource('WAYNE_CHAT', null)).toEqual({ key: 'WAYNE_CHAT', label: 'Wayne Chat' });
  });
});

describe('isAdsLead — paid-traffic detector', () => {
  const lead = (utmMedium: string | null, attribution?: Record<string, unknown>) => ({
    utmMedium,
    metadata: attribution ? { attribution } : {},
  });

  it('flags ad click ids and paid mediums, case-insensitively', () => {
    expect(isAdsLead(lead(null, { gclid: 'abc' }))).toBe(true);
    expect(isAdsLead(lead(null, { wbraid: 'w1' }))).toBe(true);
    expect(isAdsLead(lead(null, { fbclid: 'f1' }))).toBe(true);
    expect(isAdsLead(lead('CPC'))).toBe(true);
    expect(isAdsLead(lead('paid'))).toBe(true);
  });

  it('ignores organic/direct leads and empty click ids', () => {
    expect(isAdsLead(lead(null))).toBe(false);
    expect(isAdsLead(lead('organic'))).toBe(false);
    expect(isAdsLead(lead(null, { gclid: '' }))).toBe(false);
    expect(isAdsLead({ utmMedium: null, metadata: null })).toBe(false);
  });
});

describe('toBoardLead — next action, aging, touches', () => {
  it('computes days-in-stage and the stalled flag on open cards', () => {
    const fresh = toBoardLead(asLead(makeLead({ stageChangedAt: daysAgo(2) })), ctx());
    expect(fresh.daysInStage).toBe(2);
    expect(fresh.stalled).toBe(false);
    const old = toBoardLead(asLead(makeLead({ stageChangedAt: daysAgo(10) })), ctx());
    expect(old.daysInStage).toBe(10);
    expect(old.stalled).toBe(true);
  });

  it('never ages closed cards', () => {
    const won = toBoardLead(asLead(makeLead({ pipelineStage: 'WON', stageChangedAt: daysAgo(40) })), ctx());
    expect(won.daysInStage).toBeNull();
    expect(won.stalled).toBe(false);
  });

  it('suggests the channel: hot phone lead with a near event → CALL', () => {
    const soon = new Date(Date.now() + 5 * DAY_MS).toISOString().slice(0, 10);
    const card = toBoardLead(
      asLead(
        makeLead({
          leadScore: 85,
          phone: '5125551234',
          lastContactedAt: daysAgo(1), // silence the reply flag so it isn't REPLY
          lastActivityAt: daysAgo(2),
          metadata: { contactForm: { eventType: 'boat', eventDate: soon } },
        }),
      ),
      ctx(),
    );
    expect(card.nextAction?.kind).toBe('CALL');
  });

  it('passes the touch count from ctx through to the card', () => {
    const card = toBoardLead(asLead(makeLead()), { ...ctx(), touchCount: 3 });
    expect(card.touchCount).toBe(3);
  });
});

describe('getBoardData — touch counts from lead_events', () => {
  it('attaches each lead its reply + logged-outreach count', async () => {
    const a = makeLead();
    makeLead(); // no touches
    db.touchEvents.push({ leadId: a.id }, { leadId: a.id });

    const data = await getBoardData();
    const cardA = data.columns.NEW.find((c) => c.id === a.id);
    const other = data.columns.NEW.find((c) => c.id !== a.id);
    expect(cardA?.touchCount).toBe(2);
    expect(other?.touchCount).toBe(0);
  });
});

describe('isPremierLead — NEW column split', () => {
  it('flags the PREMIER affiliate, premier funnels, and boat-webhook dashboards', () => {
    expect(isPremierLead({ name: 'Premier Party Cruises', code: 'PREMIER' }, null)).toBe(true);
    expect(isPremierLead(null, { partner: 'premier-concierge' })).toBe(true);
    expect(isPremierLead(null, { partner: 'premier-party-cruises' })).toBe(true);
    expect(isPremierLead(null, { groupDashboard: { source: 'WEBHOOK' } })).toBe(true);
  });

  it('leaves ad/organic/direct leads out of the Premier group', () => {
    expect(isPremierLead(null, null)).toBe(false);
    expect(isPremierLead({ name: 'Lake Travis Yachts', code: 'LTYACHT' }, null)).toBe(false);
    expect(isPremierLead(null, { partner: 'some-other-partner' })).toBe(false);
    expect(isPremierLead(null, { groupDashboard: { source: 'DIRECT' } })).toBe(false);
    expect(isPremierLead(null, { unifiedQuote: { source: 'chat' } })).toBe(false);
  });

  it('carries onto the board card', () => {
    const card = toBoardLead(
      asLead(makeLead({ metadata: { partner: 'premier-concierge', conciergeQuiz: {} } })),
      ctx(),
    );
    expect(card.isPremier).toBe(true);
  });
});

describe('getBoardData — cart + affiliate joins', () => {
  it('attaches the dashboard cart and resolves the affiliate through the group', async () => {
    db.groups.push({
      id: 'g1',
      shareCode: 'T4Q9S8',
      affiliateId: 'aff-premier',
      tabs: [{ draftItems: [{ price: 25, quantity: 2 }, { price: 10, quantity: 1 }] }],
    });
    db.affiliates.push({ id: 'aff-premier', businessName: 'Premier Party Cruises', code: 'PREMIER' });
    makeLead({
      sourceWidget: 'GROUP_DASHBOARD',
      metadata: { groupDashboard: { groupOrderId: 'g1', shareCode: 'T4Q9S8' } },
    });
    makeLead(); // no dashboard

    const data = await getBoardData();
    const [withCart, without] = data.columns.NEW.sort((a, b) => (a.cart ? -1 : 1) - (b.cart ? -1 : 1));
    expect(withCart.cart).toEqual({ shareCode: 'T4Q9S8', total: 60, itemCount: 3 });
    expect(withCart.affiliate).toEqual({ name: 'Premier Party Cruises', code: 'PREMIER' });
    expect(without.cart).toBeNull();
    expect(without.affiliate).toBeNull();
  });

  it("prefers the lead's own stamped affiliateId over the dashboard's", async () => {
    db.groups.push({ id: 'g1', shareCode: 'AAA111', affiliateId: 'aff-other', tabs: [] });
    db.affiliates.push(
      { id: 'aff-own', businessName: 'Lake Travis Yachts', code: 'LTYACHT' },
      { id: 'aff-other', businessName: 'Premier Party Cruises', code: 'PREMIER' },
    );
    makeLead({
      affiliateId: 'aff-own',
      metadata: { groupDashboard: { groupOrderId: 'g1' } },
    });

    const data = await getBoardData();
    expect(data.columns.NEW[0].affiliate?.code).toBe('LTYACHT');
    // Cart ref still present (even with zero items) so the link renders.
    expect(data.columns.NEW[0].cart).toEqual({ shareCode: 'AAA111', total: 0, itemCount: 0 });
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
