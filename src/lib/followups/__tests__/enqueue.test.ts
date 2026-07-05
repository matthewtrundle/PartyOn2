/**
 * Queueing semantics: dedupe_key absorbs double-enqueues, emails are
 * lowercased, cancels only touch scheduled jobs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

interface MockJob {
  id: string;
  journeyKey: string;
  step: number;
  email: string;
  status: string;
  dedupeKey: string;
  scheduledFor: Date;
  draftOrderId?: string | null;
  cancelReason?: string | null;
  [key: string]: unknown;
}

const mockDb: { jobs: MockJob[]; seq: number } = { jobs: [], seq: 0 };

/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('@/lib/database/client', () => ({
  prisma: {
    followUpJob: {
      create: vi.fn(async ({ data }: any) => {
        if (mockDb.jobs.some((j) => j.dedupeKey === data.dedupeKey)) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
          });
        }
        const job: MockJob = { id: `job-${++mockDb.seq}`, status: 'scheduled', ...data };
        mockDb.jobs.push(job);
        return job;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const job of mockDb.jobs) {
          const emailMatch = where.email === undefined || job.email === where.email;
          const statusMatch = where.status === undefined || job.status === where.status;
          const journeyMatch = where.journeyKey === undefined || job.journeyKey === where.journeyKey;
          const draftMatch = where.draftOrderId === undefined || job.draftOrderId === where.draftOrderId;
          if (emailMatch && statusMatch && journeyMatch && draftMatch) {
            Object.assign(job, data);
            count++;
          }
        }
        return { count };
      }),
    },
  },
}));
/* eslint-enable @typescript-eslint/no-explicit-any */

import { enqueueJourney, cancelJobsForEmail, cancelJobsForDraft } from '../enqueue';
import { entityIdFromDedupeKey } from '../types';

beforeEach(() => {
  mockDb.jobs = [];
  mockDb.seq = 0;
});

describe('enqueueJourney dedupe', () => {
  it('double-enqueue of the same journey/step/entity leaves exactly one row', async () => {
    const first = await enqueueJourney('unpaid-invoice', {
      email: 'guest@example.com',
      entityId: 'draft-1',
      draftOrderId: 'draft-1',
    });
    const second = await enqueueJourney('unpaid-invoice', {
      email: 'guest@example.com',
      entityId: 'draft-1',
      draftOrderId: 'draft-1',
    });

    expect(first.enqueued).toBe(true);
    expect(second).toEqual({ enqueued: false, reason: 'duplicate' });
    expect(mockDb.jobs).toHaveLength(1);
    expect(mockDb.jobs[0].dedupeKey).toBe('unpaid-invoice:1:draft-1');
  });

  it('a canceled job still blocks re-enqueue of that step (final answer)', async () => {
    await enqueueJourney('unpaid-invoice', { email: 'a@b.com', entityId: 'draft-2', draftOrderId: 'draft-2' });
    mockDb.jobs[0].status = 'canceled';
    const again = await enqueueJourney('unpaid-invoice', { email: 'a@b.com', entityId: 'draft-2', draftOrderId: 'draft-2' });
    expect(again.reason).toBe('duplicate');
    expect(mockDb.jobs).toHaveLength(1);
  });

  it('lowercases the email and rejects garbage', async () => {
    const ok = await enqueueJourney('contact-form', {
      email: '  Guest@Example.COM ',
      entityId: 'lead-1',
    });
    expect(ok.enqueued).toBe(true);
    expect(mockDb.jobs[0].email).toBe('guest@example.com');

    const bad = await enqueueJourney('contact-form', { email: 'not-an-email', entityId: 'lead-2' });
    expect(bad).toEqual({ enqueued: false, reason: 'invalid-email' });
  });

  it('rejects unknown journeys and missing steps', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unknown = await enqueueJourney('nope' as any, { email: 'a@b.com', entityId: 'x' });
    expect(unknown.reason).toBe('unknown-journey');

    const noStep = await enqueueJourney('newsletter-welcome', {
      email: 'a@b.com',
      entityId: 'lead-9',
      startAtStep: 2, // single-step journey
    });
    expect(noStep.reason).toBe('no-such-step');
  });

  it('anchors the delay on baseTime (e.g. DraftOrder.sentAt)', async () => {
    const sentAt = new Date('2026-07-01T12:00:00Z');
    await enqueueJourney('unpaid-invoice', {
      email: 'a@b.com',
      entityId: 'draft-3',
      draftOrderId: 'draft-3',
      baseTime: sentAt,
    });
    const scheduled = mockDb.jobs[0].scheduledFor.getTime();
    const noJitter = sentAt.getTime() + 24 * 3_600_000;
    expect(scheduled).toBeGreaterThanOrEqual(noJitter);
    expect(scheduled).toBeLessThanOrEqual(noJitter + 45 * 60 * 1000);
  });
});

describe('cancel helpers', () => {
  it('cancelJobsForEmail lowercases, only touches scheduled rows, honors journey filter', async () => {
    await enqueueJourney('abandoned-quote', { email: 'x@y.com', entityId: 'lead-1', leadId: 'lead-1' });
    await enqueueJourney('unpaid-invoice', { email: 'x@y.com', entityId: 'draft-1', draftOrderId: 'draft-1' });
    mockDb.jobs[1].status = 'sent';

    const count = await cancelJobsForEmail('X@Y.com', 'converted-order');
    expect(count).toBe(1);
    expect(mockDb.jobs[0].status).toBe('canceled');
    expect(mockDb.jobs[0].cancelReason).toBe('converted-order');
    expect(mockDb.jobs[1].status).toBe('sent');
  });

  it('cancelJobsForDraft cancels by draft id', async () => {
    await enqueueJourney('unpaid-invoice', { email: 'x@y.com', entityId: 'draft-7', draftOrderId: 'draft-7' });
    const count = await cancelJobsForDraft('draft-7', 'invoice-paid');
    expect(count).toBe(1);
    expect(mockDb.jobs[0].cancelReason).toBe('invoice-paid');
  });
});

describe('entityIdFromDedupeKey', () => {
  it('round-trips the entity id', () => {
    expect(entityIdFromDedupeKey('abandoned-quote:1:lead-abc')).toBe('lead-abc');
    expect(entityIdFromDedupeKey('unpaid-invoice:2:draft:with:colons')).toBe('draft:with:colons');
  });
});
