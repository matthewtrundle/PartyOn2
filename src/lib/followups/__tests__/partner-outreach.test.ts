/**
 * partner-outreach journey: 3-touch registry shape (0h / +120h / +168h),
 * APPROVED-draft rendering signed as Brian, the touch-2 open-branch
 * (no open → alt-subject resend; opened → "Re:" bump; no EmailLog →
 * resend), the touch-3 standalone close, and shouldCancel — including the
 * draft-not-approved kill switch.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FollowUpJob } from '@prisma/client';

const mockDb: {
  lead: { pipelineStage: string | null; tags: string[] } | null;
  inbound: { id: string } | null;
  step1Job: { emailLogId: string | null } | null;
  emailLog: { openedAt: Date | null } | null;
} = { lead: null, inbound: null, step1Job: null, emailLog: null };

vi.mock('@/lib/database/client', () => ({
  prisma: {
    lead: {
      findUnique: vi.fn(async () => mockDb.lead),
    },
    inboundEmail: {
      findFirst: vi.fn(async () => mockDb.inbound),
    },
    followUpJob: {
      findFirst: vi.fn(async () => mockDb.step1Job),
    },
    emailLog: {
      findUnique: vi.fn(async () => mockDb.emailLog),
    },
  },
}));

const mockDraft: { value: Record<string, unknown> | null } = { value: null };

vi.mock('@/lib/partners/prospect-store', () => ({
  getSendableDraft: vi.fn(async (website: string) =>
    website === 'https://www.lynnslodgingatx.com/' ? mockDraft.value : null
  ),
}));

import { getJourney } from '../journeys';

const APPROVED_DRAFT = {
  subject: 'guest perk',
  altSubject: 'stocked fridges',
  body: 'personalized body for Lynn',
  followUpBody: 'the substantive bump with the page link',
  touch3Body: 'the standalone close',
};

function fakeJob(overrides: Partial<FollowUpJob> = {}): FollowUpJob {
  return {
    id: 'job-1',
    journeyKey: 'partner-outreach',
    step: 1,
    email: 'hello@lynnslodging.com',
    leadId: 'lead-1',
    payload: { website: 'https://www.lynnslodgingatx.com/' },
    dedupeKey: 'partner-outreach:1:lead-1',
    createdAt: new Date(),
    ...overrides,
  } as unknown as FollowUpJob;
}

function ctxFor(payload: Record<string, unknown>) {
  return {
    job: fakeJob(),
    payload,
    link: (path: string) => `https://partyondelivery.com${path}`,
    unsubscribeUrl: 'https://partyondelivery.com/email/preferences',
  };
}

const LYNN = { website: 'https://www.lynnslodgingatx.com/', company: "Lynn's Lodging" };

describe('partner-outreach journey', () => {
  beforeEach(() => {
    mockDb.lead = { pipelineStage: 'NEW', tags: ['partner-prospect', 'str'] };
    mockDb.inbound = null;
    mockDb.step1Job = { emailLogId: 'log-1' };
    mockDb.emailLog = { openedAt: null };
    mockDraft.value = { ...APPROVED_DRAFT };
  });

  it('is registered with three steps at 0h / +120h / +168h, info@ sender, no paid guard', () => {
    const journey = getJourney('partner-outreach');
    expect(journey).toBeDefined();
    expect(journey!.steps).toHaveLength(3);
    expect(journey!.steps.map((s) => s.delayHours)).toEqual([0, 120, 168]);
    expect(journey!.skipGlobalPaidGuard).toBe(true);
    expect(journey!.from?.email).toBe('info@partyondelivery.com');
  });

  it('step 1 renders the approved draft, signed as Brian', async () => {
    const journey = getJourney('partner-outreach')!;
    const email = await journey.steps[0].buildEmail(ctxFor(LYNN));
    expect(email!.subject).toBe('guest perk');
    expect(email!.text).toContain('personalized body for Lynn');
    expect(email!.text).toContain('Brian Hill\nFounder, Party On Delivery');
    expect(email!.text).not.toContain('Allan\nParty On Delivery');
    expect(email!.text).toContain('Unsubscribe');
  });

  it('step 1 falls back to the generic template only without a website payload', async () => {
    const journey = getJourney('partner-outreach')!;
    const email = await journey.steps[0].buildEmail(
      ctxFor({ company: 'Gone Co', firstName: 'Sam' })
    );
    expect(email).not.toBeNull();
    expect(email!.subject).toContain('Gone Co');
  });

  it('step 2 with NO open recorded resends the body under the alternate subject', async () => {
    mockDb.emailLog = { openedAt: null };
    const journey = getJourney('partner-outreach')!;
    const email = await journey.steps[1].buildEmail(ctxFor(LYNN));
    expect(email!.subject).toBe('stocked fridges');
    expect(email!.text).toContain('personalized body for Lynn');
  });

  it('step 2 with no EmailLog at all also takes the resend branch', async () => {
    mockDb.step1Job = null;
    const journey = getJourney('partner-outreach')!;
    const email = await journey.steps[1].buildEmail(ctxFor(LYNN));
    expect(email!.subject).toBe('stocked fridges');
  });

  it('step 2 with an open recorded sends the substantive bump as a reply', async () => {
    mockDb.emailLog = { openedAt: new Date() };
    const journey = getJourney('partner-outreach')!;
    const email = await journey.steps[1].buildEmail(ctxFor(LYNN));
    expect(email!.subject).toBe('Re: guest perk');
    expect(email!.text).toContain('the substantive bump');
  });

  it('step 2 resend falls back to the subject when altSubject is missing; opened without a bump sends nothing', async () => {
    const journey = getJourney('partner-outreach')!;
    mockDraft.value = { ...APPROVED_DRAFT, altSubject: null };
    let email = await journey.steps[1].buildEmail(ctxFor(LYNN));
    expect(email!.subject).toBe('guest perk');

    mockDb.emailLog = { openedAt: new Date() };
    mockDraft.value = { ...APPROVED_DRAFT, followUpBody: null };
    email = await journey.steps[1].buildEmail(ctxFor(LYNN));
    expect(email).toBeNull();
  });

  it('step 3 sends the standalone close, or nothing without touch3Body', async () => {
    const journey = getJourney('partner-outreach')!;
    let email = await journey.steps[2].buildEmail(ctxFor(LYNN));
    expect(email!.subject).toBe('guest perk');
    expect(email!.text).toContain('the standalone close');

    mockDraft.value = { ...APPROVED_DRAFT, touch3Body: null };
    email = await journey.steps[2].buildEmail(ctxFor(LYNN));
    expect(email).toBeNull();
  });

  it('shouldCancel: proceeds for an open, un-replied, approved prospect', async () => {
    const journey = getJourney('partner-outreach')!;
    expect(await journey.shouldCancel(fakeJob())).toBeNull();
  });

  it('shouldCancel: kills every touch when the draft is no longer approved', async () => {
    mockDraft.value = null;
    const journey = getJourney('partner-outreach')!;
    expect(await journey.shouldCancel(fakeJob())).toBe('draft-not-approved');
  });

  it('shouldCancel: cancels on reply, won, lost, active-partner, missing lead', async () => {
    const journey = getJourney('partner-outreach')!;

    mockDb.inbound = { id: 'in-1' };
    expect(await journey.shouldCancel(fakeJob())).toBe('replied');
    mockDb.inbound = null;

    mockDb.lead = { pipelineStage: 'WON', tags: [] };
    expect(await journey.shouldCancel(fakeJob())).toBe('lead-won');

    mockDb.lead = { pipelineStage: 'LOST', tags: [] };
    expect(await journey.shouldCancel(fakeJob())).toBe('lead-lost');

    mockDb.lead = { pipelineStage: 'NEW', tags: ['partner-active'] };
    expect(await journey.shouldCancel(fakeJob())).toBe('already-active-partner');

    mockDb.lead = null;
    expect(await journey.shouldCancel(fakeJob())).toBe('lead-missing');

    expect(await journey.shouldCancel(fakeJob({ leadId: null }))).toBe('missing-lead-ref');
  });
});
