/**
 * partner-outreach journey: registry shape, personalized step-1 rendering
 * from the partner_prospects store (async DB read at send time), step-2
 * token rendering, Brian signature, and shouldCancel
 * (reply / won / lost / already-active-partner).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FollowUpJob } from '@prisma/client';

const mockDb: {
  lead: { pipelineStage: string | null; tags: string[] } | null;
  inbound: { id: string } | null;
} = { lead: null, inbound: null };

vi.mock('@/lib/database/client', () => ({
  prisma: {
    lead: {
      findUnique: vi.fn(async () => mockDb.lead),
    },
    inboundEmail: {
      findFirst: vi.fn(async () => mockDb.inbound),
    },
  },
}));

vi.mock('@/lib/partners/prospect-store', () => ({
  getSendableDraft: vi.fn(async (website: string) =>
    website === 'https://www.lynnslodgingatx.com/'
      ? {
          subject: 'personalized subject',
          altSubject: null,
          body: 'personalized body for Lynn',
          followUpBody: null,
          touch3Body: null,
        }
      : null
  ),
}));

import { getJourney } from '../journeys';

function fakeJob(overrides: Partial<FollowUpJob> = {}): FollowUpJob {
  return {
    id: 'job-1',
    journeyKey: 'partner-outreach',
    step: 1,
    email: 'hello@lynnslodging.com',
    leadId: 'lead-1',
    payload: {},
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

describe('partner-outreach journey', () => {
  beforeEach(() => {
    mockDb.lead = { pipelineStage: 'NEW', tags: ['partner-prospect', 'str'] };
    mockDb.inbound = null;
  });

  it('is registered with two steps, immediate + 48h, info@ sender, and no paid guard', () => {
    const journey = getJourney('partner-outreach');
    expect(journey).toBeDefined();
    expect(journey!.steps).toHaveLength(2);
    expect(journey!.steps[0].delayHours).toBe(0);
    expect(journey!.steps[1].delayHours).toBe(48);
    expect(journey!.skipGlobalPaidGuard).toBe(true);
    expect(journey!.from?.email).toBe('info@partyondelivery.com');
  });

  it('step 1 renders the draft from the prospect store, signed as Brian', async () => {
    const journey = getJourney('partner-outreach')!;
    const email = await journey.steps[0].buildEmail(
      ctxFor({ website: 'https://www.lynnslodgingatx.com/', company: "Lynn's Lodging" })
    );
    expect(email).not.toBeNull();
    expect(email!.subject).toBe('personalized subject');
    expect(email!.text).toContain('personalized body for Lynn');
    // Drafts are stored signature-free — the renderer signs as Brian.
    expect(email!.text).toContain('Brian Hill\nFounder, Party On Delivery');
    expect(email!.text).not.toContain('Allan\nParty On Delivery');
    // CAN-SPAM footer comes from the shared renderer
    expect(email!.text).toContain('Unsubscribe');
  });

  it('step 1 falls back to the generic template when no sendable draft exists', async () => {
    const journey = getJourney('partner-outreach')!;
    const email = await journey.steps[0].buildEmail(
      ctxFor({ website: 'https://gone.example.com/', company: 'Gone Co', firstName: 'Sam' })
    );
    expect(email).not.toBeNull();
    expect(email!.subject).toContain('Gone Co');
    expect(email!.text).toContain('Brian Hill\nFounder, Party On Delivery');
  });

  it('step 2 renders the abridged follow-up with company + partner URL tokens', async () => {
    const journey = getJourney('partner-outreach')!;
    const email = await journey.steps[1].buildEmail(
      ctxFor({ firstName: 'Lynn', company: "Lynn's Lodging", partnerSlug: 'lynns-lodging' })
    );
    expect(email).not.toBeNull();
    expect(email!.subject).toContain("Lynn's Lodging");
    expect(email!.text).toContain('/partners/lynns-lodging');
    expect(email!.text).toContain('Brian Hill\nFounder, Party On Delivery');
    // The inline template signature is gone — exactly one signature block.
    expect(email!.text.match(/Brian Hill/g)).toHaveLength(1);
  });

  it('shouldCancel: proceeds for an open, un-replied prospect', async () => {
    const journey = getJourney('partner-outreach')!;
    expect(await journey.shouldCancel(fakeJob())).toBeNull();
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
