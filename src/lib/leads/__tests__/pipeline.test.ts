/**
 * Lead Flow pipeline service: transition matrix + side effects, board
 * eligibility, enroll/reopen semantics, and the guarded won matcher.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

interface MockLead {
  id: string;
  email: string | null;
  phone: string | null;
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
  events: Array<Record<string, unknown>>;
  drafts: Array<{ id: string; customerEmail: string; status: string; createdAt: Date }>;
  wonOrderRows: Array<{ id: string }>;
  reopenRows: Array<{ id: string }>;
} = { leads: [], events: [], drafts: [], wonOrderRows: [], reopenRows: [] };

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
      if ('gt' in cond && !((value as Date) > cond.gt)) return false;
    } else if (value !== cond) {
      return false;
    }
  }
  return true;
}

vi.mock('@/lib/database/client', () => ({
  prisma: {
    lead: {
      findUnique: vi.fn(async ({ where }: any) => db.leads.find((l) => l.id === where.id) ?? null),
      findMany: vi.fn(async ({ where, take }: any) =>
        db.leads.filter((l) => matchesWhere(l, where ?? {})).slice(0, take ?? 100)
      ),
      update: vi.fn(async ({ where, data }: any) => {
        const lead = db.leads.find((l) => l.id === where.id);
        if (lead) Object.assign(lead, data);
        return lead;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const lead of db.leads) {
          if (!matchesWhere(lead, where)) continue;
          Object.assign(lead, data);
          count++;
        }
        return { count };
      }),
    },
    leadEvent: {
      create: vi.fn(async ({ data }: any) => {
        db.events.push(data);
        return data;
      }),
      count: vi.fn(async () => 0),
      findFirst: vi.fn(async ({ where }: any) => {
        const hit = db.events.find((e) => {
          if (e.leadId !== where.leadId) return false;
          if (where.type?.in && !where.type.in.includes(e.type)) return false;
          if (where.occurredAt?.gt && !((e.occurredAt as Date) > where.occurredAt.gt)) return false;
          if (where.metadata?.path) {
            const meta = (e.metadata ?? {}) as Record<string, unknown>;
            if (meta[where.metadata.path[0]] !== where.metadata.equals) return false;
          }
          return true;
        });
        return hit ?? null;
      }),
    },
    draftOrder: {
      findFirst: vi.fn(async ({ where }: any) => {
        const email = String(where.customerEmail.equals).toLowerCase();
        const hit = db.drafts.find(
          (d) =>
            d.customerEmail.toLowerCase() === email &&
            where.status.in.includes(d.status) &&
            d.createdAt >= where.createdAt.gte
        );
        return hit ? { id: hit.id } : null;
      }),
    },
    $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
      const sql = Array.isArray(strings) ? strings.join('?') : String(strings);
      // sweepReopens' candidate query vs findWonOrder's order match.
      if (sql.includes('last_activity_at')) return db.reopenRows;
      return db.wonOrderRows;
    }),
  },
}));
/* eslint-enable @typescript-eslint/no-explicit-any */

import {
  enrollLeadIfEligible,
  handleSubmitSignal,
  isBoardEligible,
  isNewsletterOnly,
  matchFloor,
  sweepQuoteSent,
  sweepReopens,
  sweepWonMatches,
  syncStageFromConversion,
  transitionStage,
} from '../pipeline';
import { validateTransition } from '../pipeline-types';

let seq = 0;
function makeLead(overrides: Partial<MockLead> = {}): MockLead {
  const lead: MockLead = {
    id: `lead-${++seq}`,
    email: 'guest@example.com',
    phone: null,
    status: 'SUBMITTED',
    sourceWidget: 'CONTACT_FORM',
    metadata: { contactForm: { eventType: 'party' } },
    resumeCart: null,
    pipelineStage: null,
    stageChangedAt: null,
    boardSortOrder: 0,
    leadScore: null,
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
    createdAt: new Date('2026-07-01T12:00:00Z'),
    updatedAt: new Date('2026-07-01T12:00:00Z'),
    ...overrides,
  };
  db.leads.push(lead);
  return lead;
}

beforeEach(() => {
  db.leads = [];
  db.events = [];
  db.drafts = [];
  db.wonOrderRows = [];
  db.reopenRows = [];
  seq = 0;
});

describe('validateTransition', () => {
  it('rejects unknown stages and same-stage moves, allows the rest', () => {
    expect(validateTransition('NEW', 'BANANA')).toBe('unknown-stage');
    expect(validateTransition('NEW', 'NEW')).toBe('same-stage');
    expect(validateTransition('NEW', 'WON')).toBeNull();
    expect(validateTransition('LOST', 'CONTACTED')).toBeNull();
    expect(validateTransition(null, 'NEW')).toBeNull();
  });
});

describe('board eligibility', () => {
  it('newsletter-only signups are excluded until they submit an inquiry', () => {
    expect(
      isNewsletterOnly({ sourceWidget: 'EMAIL_SIGNUP', metadata: { newsletter: {} } })
    ).toBe(true);
    expect(
      isNewsletterOnly({
        sourceWidget: 'EMAIL_SIGNUP',
        metadata: { newsletter: {}, chatQuiz: { headcount: 5 } },
      })
    ).toBe(false);
    expect(isNewsletterOnly({ sourceWidget: 'CONTACT_FORM', metadata: {} })).toBe(false);
  });

  it('requires contact info and SUBMITTED (or PARTIAL only when allowed)', () => {
    const asLite = (l: MockLead) => l as unknown as Parameters<typeof isBoardEligible>[0];
    const base = makeLead({ email: null, phone: null });
    expect(isBoardEligible(asLite(base))).toBe(false);
    const partial = makeLead({ status: 'PARTIAL' });
    expect(isBoardEligible(asLite(partial))).toBe(false);
    expect(isBoardEligible(asLite(partial), { allowPartial: true })).toBe(true);
    const submitted = makeLead();
    expect(isBoardEligible(asLite(submitted))).toBe(true);
  });
});

describe('transitionStage', () => {
  it('WON stamps wonAt; leaving WON clears it and sets reopenedAt', async () => {
    const lead = makeLead({ pipelineStage: 'QUOTE_SENT', stageChangedAt: new Date() });
    const toWon = await transitionStage(lead.id, 'WON', { via: 'drag' });
    expect(toWon.moved).toBe(true);
    expect(lead.pipelineStage).toBe('WON');
    expect(lead.wonAt).toBeInstanceOf(Date);

    const back = await transitionStage(lead.id, 'QUALIFIED', { via: 'drag' });
    expect(back.moved).toBe(true);
    expect(lead.wonAt).toBeNull();
    expect(lead.reopenedAt).toBeInstanceOf(Date);
  });

  it('LOST stores the reason; reopening clears lost fields', async () => {
    const lead = makeLead({ pipelineStage: 'NEW', stageChangedAt: new Date() });
    await transitionStage(lead.id, 'LOST', { via: 'drag', lostReason: 'ghosted' });
    expect(lead.pipelineStage).toBe('LOST');
    expect(lead.lostReason).toBe('ghosted');

    await transitionStage(lead.id, 'NEW', { via: 'drag' });
    expect(lead.lostReason).toBeNull();
    expect(lead.lostAt).toBeNull();
    expect(lead.reopenedAt).toBeInstanceOf(Date);
  });

  it('same-stage is a no-op; onlyFrom blocks auto-moves from other stages', async () => {
    const lead = makeLead({ pipelineStage: 'QUOTE_SENT', stageChangedAt: new Date() });
    const same = await transitionStage(lead.id, 'QUOTE_SENT', { via: 'drag' });
    expect(same.moved).toBe(false);
    expect(same.reason).toBe('same-stage');

    const blocked = await transitionStage(lead.id, 'CONTACTED', {
      via: 'reply',
      onlyFrom: ['NEW'],
    });
    expect(blocked.moved).toBe(false);
    expect(blocked.reason).toBe('not-in-from-stage');
    expect(lead.pipelineStage).toBe('QUOTE_SENT');
  });

  it('appends a stage.changed audit event', async () => {
    const lead = makeLead({ pipelineStage: 'NEW', stageChangedAt: new Date() });
    await transitionStage(lead.id, 'CONTACTED', { via: 'drag' });
    const evt = db.events.find(
      (e) => (e.metadata as Record<string, unknown>)?.kind === 'stage.changed'
    );
    expect(evt).toBeTruthy();
    expect((evt!.metadata as Record<string, unknown>).from).toBe('NEW');
    expect((evt!.metadata as Record<string, unknown>).to).toBe('CONTACTED');
  });
});

describe('enroll + reopen', () => {
  it('enrolls an eligible SUBMITTED lead as NEW exactly once', async () => {
    const lead = makeLead();
    expect(await enrollLeadIfEligible(lead.id)).toBe(true);
    expect(lead.pipelineStage).toBe('NEW');
    expect(await enrollLeadIfEligible(lead.id)).toBe(false); // already boarded
  });

  it('does not enroll PARTIAL leads unless allowPartial (follow-up hook path)', async () => {
    const lead = makeLead({ status: 'PARTIAL' });
    expect(await enrollLeadIfEligible(lead.id)).toBe(false);
    expect(await enrollLeadIfEligible(lead.id, { allowPartial: true })).toBe(true);
  });

  it('does not enroll newsletter-only signups', async () => {
    const lead = makeLead({
      sourceWidget: 'EMAIL_SIGNUP',
      metadata: { newsletter: { status: 'confirmed' } },
    });
    expect(await enrollLeadIfEligible(lead.id)).toBe(false);
  });

  it('handleSubmitSignal re-opens WON/LOST leads as NEW', async () => {
    const lead = makeLead({
      pipelineStage: 'LOST',
      stageChangedAt: new Date(),
      lostAt: new Date(),
      lostReason: 'stale',
    });
    await handleSubmitSignal(lead.id);
    expect(lead.pipelineStage).toBe('NEW');
    expect(lead.lostReason).toBeNull();
    expect(lead.reopenedAt).toBeInstanceOf(Date);
  });

  it('handleSubmitSignal enrolls off-board leads', async () => {
    const lead = makeLead();
    await handleSubmitSignal(lead.id);
    expect(lead.pipelineStage).toBe('NEW');
  });

  it('handleSubmitSignal leaves working-stage leads alone', async () => {
    const lead = makeLead({ pipelineStage: 'QUALIFIED', stageChangedAt: new Date() });
    await handleSubmitSignal(lead.id);
    expect(lead.pipelineStage).toBe('QUALIFIED');
  });
});

describe('conversion sync + sweeps', () => {
  it('syncStageFromConversion moves CONVERTED leads to WON, forward-only', async () => {
    const lead = makeLead({
      status: 'CONVERTED',
      pipelineStage: 'QUOTE_SENT',
      stageChangedAt: new Date(),
    });
    await syncStageFromConversion(lead.id);
    expect(lead.pipelineStage).toBe('WON');

    // Already WON → no second event.
    const eventsBefore = db.events.length;
    await syncStageFromConversion(lead.id);
    expect(db.events.length).toBe(eventsBefore);
  });

  it('syncStageFromConversion ignores non-converted leads', async () => {
    const lead = makeLead({ pipelineStage: 'NEW', stageChangedAt: new Date() });
    await syncStageFromConversion(lead.id);
    expect(lead.pipelineStage).toBe('NEW');
  });

  it('sweepQuoteSent moves working leads with an outstanding draft', async () => {
    const lead = makeLead({ pipelineStage: 'CONTACTED', stageChangedAt: new Date() });
    db.drafts.push({
      id: 'draft-1',
      customerEmail: 'GUEST@example.com',
      status: 'SENT',
      createdAt: new Date('2026-07-05T12:00:00Z'),
    });
    const moved = await sweepQuoteSent();
    expect(moved).toBe(1);
    expect(lead.pipelineStage).toBe('QUOTE_SENT');
    expect(lead.draftOrderId).toBe('draft-1');
  });

  it('sweepQuoteSent ignores drafts older than the lead (or its reopen)', async () => {
    makeLead({
      pipelineStage: 'NEW',
      stageChangedAt: new Date(),
      createdAt: new Date('2026-07-10T12:00:00Z'),
    });
    db.drafts.push({
      id: 'draft-old',
      customerEmail: 'guest@example.com',
      status: 'SENT',
      createdAt: new Date('2026-06-01T12:00:00Z'),
    });
    expect(await sweepQuoteSent()).toBe(0);
  });

  it('sweepWonMatches sets WON + orderId + CONVERTED on a verified match', async () => {
    const lead = makeLead({ pipelineStage: 'QUOTE_SENT', stageChangedAt: new Date() });
    db.wonOrderRows = [{ id: 'order-9' }];
    const won = await sweepWonMatches();
    expect(won).toBe(1);
    expect(lead.pipelineStage).toBe('WON');
    expect(lead.orderId).toBe('order-9');
    expect(lead.status).toBe('CONVERTED');
  });

  it('sweepWonMatches skips leads with no identity and no match', async () => {
    makeLead({ pipelineStage: 'NEW', stageChangedAt: new Date(), email: null, phone: null });
    db.wonOrderRows = [];
    expect(await sweepWonMatches()).toBe(0);
  });

  it('sweepReopens reopens only on trusted (server-originated) submits', async () => {
    const staleStage = new Date('2026-07-01T12:00:00Z');
    const untrusted = makeLead({
      pipelineStage: 'WON',
      stageChangedAt: staleStage,
      wonAt: staleStage,
      lastActivityAt: new Date('2026-07-10T12:00:00Z'),
    });
    const trusted = makeLead({
      pipelineStage: 'LOST',
      stageChangedAt: staleStage,
      lostAt: staleStage,
      lastActivityAt: new Date('2026-07-10T12:00:00Z'),
    });
    db.reopenRows = [{ id: untrusted.id }, { id: trusted.id }];
    // Untrusted lead has only a client-claimed pixel FORM_SUBMIT.
    db.events.push({
      leadId: untrusted.id,
      type: 'FORM_SUBMIT',
      occurredAt: new Date('2026-07-10T12:00:00Z'),
      metadata: {},
    });
    // Trusted lead has a server-validated submit (trustedSubmit stamp).
    db.events.push({
      leadId: trusted.id,
      type: 'FORM_SUBMIT',
      occurredAt: new Date('2026-07-10T12:00:00Z'),
      metadata: { trustedSubmit: true },
    });

    const reopened = await sweepReopens();
    expect(reopened).toBe(1);
    expect(untrusted.pipelineStage).toBe('WON');
    expect(trusted.pipelineStage).toBe('NEW');
    expect(trusted.lostAt).toBeNull();
  });
});

describe('matchFloor', () => {
  it('uses the reopen date when newer than creation (old orders cannot re-win)', () => {
    const createdAt = new Date('2026-06-01T00:00:00Z');
    const reopenedAt = new Date('2026-07-01T00:00:00Z');
    expect(matchFloor({ createdAt, reopenedAt })).toEqual(reopenedAt);
    expect(matchFloor({ createdAt, reopenedAt: null })).toEqual(createdAt);
    expect(
      matchFloor({ createdAt: reopenedAt, reopenedAt: createdAt })
    ).toEqual(reopenedAt); // stale reopen older than creation is ignored
  });
});
