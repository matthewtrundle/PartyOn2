/**
 * Engine pipeline: kill switches, suppression precedence, fresh-read cancels,
 * the global paid-order guard, retry recovery via EmailLog jobId, and
 * step-N+1 enqueueing only after step N sends.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FollowUpJob } from '@prisma/client';
import type { JourneyDef } from '../types';

interface MockJob {
  id: string;
  status: string;
  dedupeKey: string;
  email: string;
  attempts?: number;
  cancelReason?: string | null;
  emailLogId?: string | null;
  lastError?: string | null;
  [key: string]: unknown;
}

const mockDb: {
  jobs: MockJob[];
  suppressions: Array<{ email: string }>;
  paidOrders: Array<{ customerEmail: string; createdAt: Date }>;
  emailLogs: Array<{ id: string; metadata: Record<string, unknown>; status: string }>;
  leads: Array<{ id: string; pipelineStage: string | null }>;
  seq: number;
} = { jobs: [], suppressions: [], paidOrders: [], emailLogs: [], leads: [], seq: 0 };

const flagState: Record<string, boolean> = {};

/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('@/lib/database/client', () => ({
  prisma: {
    followUpJob: {
      create: vi.fn(async ({ data }: any) => {
        if (mockDb.jobs.some((j) => j.dedupeKey === data.dedupeKey)) {
          const { Prisma } = await import('@prisma/client');
          throw new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' });
        }
        const job = { id: `job-${++mockDb.seq}`, status: 'scheduled', ...data };
        mockDb.jobs.push(job);
        return job;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const job = mockDb.jobs.find((j) => j.id === where.id);
        if (job) Object.assign(job, data);
        return job;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const job of mockDb.jobs) {
          if (where.status && job.status !== where.status) continue;
          if (where.email && job.email !== where.email) continue;
          if (where.claimedAt?.lt && !(job.claimedAt instanceof Date && job.claimedAt < where.claimedAt.lt)) continue;
          if (where.attempts?.gte !== undefined && !((job.attempts ?? 0) >= where.attempts.gte)) continue;
          Object.assign(job, data);
          count++;
        }
        return { count };
      }),
      findMany: vi.fn(async ({ where }: any) =>
        mockDb.jobs.filter((j) => (where?.id?.in ? where.id.in.includes(j.id) : true))
      ),
      findFirst: vi.fn(async () => null),
    },
    emailSuppression: {
      findUnique: vi.fn(async ({ where }: any) =>
        mockDb.suppressions.find((s) => s.email === where.email) ?? null
      ),
    },
    lead: {
      findUnique: vi.fn(async ({ where }: any) =>
        mockDb.leads.find((l) => l.id === where.id) ?? null
      ),
    },
    order: {
      findFirst: vi.fn(async ({ where }: any) => {
        const match = mockDb.paidOrders.find(
          (o) =>
            o.customerEmail.toLowerCase() === String(where.customerEmail.equals).toLowerCase() &&
            o.createdAt >= where.createdAt.gte
        );
        return match ? { id: 'order-x' } : null;
      }),
    },
    emailLog: {
      findFirst: vi.fn(async ({ where }: any) => {
        const jobId = where?.metadata?.path?.[0] === 'jobId' ? where.metadata.equals : undefined;
        const row = mockDb.emailLogs.find(
          (l) => l.metadata.jobId === jobId && l.status !== 'FAILED'
        );
        return row ?? null;
      }),
    },
    $queryRaw: vi.fn(async () => []),
  },
}));

const sendEmailDetailed = vi.fn();
vi.mock('@/lib/email/resend-client', () => ({
  sendEmailDetailed: (...args: unknown[]) => sendEmailDetailed(...args),
}));

vi.mock('@/lib/features/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/features/feature-flags')>();
  return {
    ...actual,
    isFeatureEnabled: vi.fn(async (key: string) => flagState[key] ?? false),
  };
});
/* eslint-enable @typescript-eslint/no-explicit-any */

import { processJob, runFollowUpEngine, hasPaidOrderSince } from '../engine';

const ENV_BACKUP = {
  UNSUBSCRIBE_SECRET: process.env.UNSUBSCRIBE_SECRET,
  FOLLOWUP_FROM_EMAIL: process.env.FOLLOWUP_FROM_EMAIL,
};

function makeJob(overrides: Partial<MockJob> = {}): FollowUpJob {
  const job: MockJob = {
    id: `job-${++mockDb.seq}`,
    journeyKey: 'contact-form',
    step: 1,
    email: 'guest@example.com',
    phone: null,
    smsConsent: false,
    leadId: 'lead-1',
    draftOrderId: null,
    partnerInquiryId: null,
    orderId: null,
    payload: null,
    dedupeKey: 'contact-form:1:lead-1',
    scheduledFor: new Date('2026-07-06T15:00:00Z'),
    status: 'processing',
    claimedAt: new Date(),
    attempts: 1,
    sentAt: null,
    canceledAt: null,
    cancelReason: null,
    lastError: null,
    emailLogId: null,
    createdAt: new Date('2026-07-05T15:00:00Z'),
    updatedAt: new Date(),
    ...overrides,
  };
  mockDb.jobs.push(job);
  return job as unknown as FollowUpJob;
}

function makeJourney(overrides: Partial<JourneyDef> = {}): JourneyDef {
  return {
    key: 'contact-form',
    label: 'Test journey',
    description: '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    featureFlag: 'followups_contact_form' as any,
    phase: 2,
    steps: [
      { delayHours: 0, buildEmail: () => ({ subject: 's1', html: '<p>1</p>', text: '1' }) },
      { delayHours: 72, buildEmail: () => ({ subject: 's2', html: '<p>2</p>', text: '2' }) },
    ],
    shouldCancel: async () => null,
    ...overrides,
  };
}

beforeEach(() => {
  mockDb.jobs = [];
  mockDb.suppressions = [];
  mockDb.paidOrders = [];
  mockDb.emailLogs = [];
  mockDb.leads = [];
  mockDb.seq = 0;
  for (const key of Object.keys(flagState)) delete flagState[key];
  process.env.UNSUBSCRIBE_SECRET = 'engine-test-secret';
  process.env.FOLLOWUP_FROM_EMAIL = 'info@partyondelivery.com';
  sendEmailDetailed.mockReset();
  sendEmailDetailed.mockResolvedValue({ sent: true, emailLogId: 'log-1', resendId: 're-1' });
});

afterEach(() => {
  process.env.UNSUBSCRIBE_SECRET = ENV_BACKUP.UNSUBSCRIBE_SECRET;
  process.env.FOLLOWUP_FROM_EMAIL = ENV_BACKUP.FOLLOWUP_FROM_EMAIL;
});

describe('runFollowUpEngine gates', () => {
  it('refuses to run without the required env', async () => {
    delete process.env.UNSUBSCRIBE_SECRET;
    const result = await runFollowUpEngine();
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('UNSUBSCRIBE_SECRET');
  });

  it('early-outs when the master kill switch is off', async () => {
    const result = await runFollowUpEngine();
    expect(result).toMatchObject({ ok: true, paused: true, claimed: 0, sent: 0 });
  });

  it('keeps jobs queued outside the 9a–7p CT send window', async () => {
    flagState.followups_master = true;
    const threeAmCt = new Date('2026-07-06T08:00:00Z'); // 3am CDT
    const result = await runFollowUpEngine({ now: threeAmCt });
    expect(result.inWindow).toBe(false);
    expect(result.claimed).toBe(0);
  });

  it('claims nothing when no journey flags are enabled', async () => {
    flagState.followups_master = true;
    const noonCt = new Date('2026-07-06T17:00:00Z'); // 12pm CDT
    const result = await runFollowUpEngine({ now: noonCt });
    expect(result.inWindow).toBe(true);
    expect(result.claimed).toBe(0);
    expect(sendEmailDetailed).not.toHaveBeenCalled();
  });
});

describe('processJob pipeline', () => {
  it('suppression wins over everything — no send, job marked suppressed', async () => {
    mockDb.suppressions.push({ email: 'guest@example.com' });
    const job = makeJob();
    const outcome = await processJob(job, makeJourney());
    expect(outcome).toBe('suppressed');
    expect(mockDb.jobs[0].status).toBe('suppressed');
    expect(sendEmailDetailed).not.toHaveBeenCalled();
  });

  it('a lead moved to LOST on the Lead Flow board cancels the job', async () => {
    mockDb.leads.push({ id: 'lead-1', pipelineStage: 'LOST' });
    const job = makeJob();
    const outcome = await processJob(job, makeJourney());
    expect(outcome).toBe('canceled');
    expect(mockDb.jobs[0].cancelReason).toBe('pipeline-lost');
    expect(sendEmailDetailed).not.toHaveBeenCalled();
  });

  it('a lead moved to WON on the Lead Flow board cancels the job', async () => {
    mockDb.leads.push({ id: 'lead-1', pipelineStage: 'WON' });
    const job = makeJob();
    const outcome = await processJob(job, makeJourney());
    expect(outcome).toBe('canceled');
    expect(mockDb.jobs[0].cancelReason).toBe('pipeline-won');
  });

  it('an active-stage lead does NOT cancel the job', async () => {
    mockDb.leads.push({ id: 'lead-1', pipelineStage: 'CONTACTED' });
    const job = makeJob();
    const outcome = await processJob(job, makeJourney());
    expect(outcome).toBe('sent');
  });

  it('journey shouldCancel cancels with its reason', async () => {
    const job = makeJob();
    const outcome = await processJob(job, makeJourney({ shouldCancel: async () => 'lead-converted' }));
    expect(outcome).toBe('canceled');
    expect(mockDb.jobs[0].status).toBe('canceled');
    expect(mockDb.jobs[0].cancelReason).toBe('lead-converted');
    expect(sendEmailDetailed).not.toHaveBeenCalled();
  });

  it('global paid-order guard cancels converted customers', async () => {
    mockDb.paidOrders.push({ customerEmail: 'Guest@Example.com', createdAt: new Date('2026-07-06T00:00:00Z') });
    const job = makeJob();
    const outcome = await processJob(job, makeJourney());
    expect(outcome).toBe('canceled');
    expect(mockDb.jobs[0].cancelReason).toBe('converted-order');
  });

  it('skipGlobalPaidGuard journeys still send to paying customers', async () => {
    mockDb.paidOrders.push({ customerEmail: 'guest@example.com', createdAt: new Date('2026-07-06T00:00:00Z') });
    const job = makeJob();
    const outcome = await processJob(job, makeJourney({ skipGlobalPaidGuard: true }));
    expect(outcome).toBe('sent');
    expect(sendEmailDetailed).toHaveBeenCalledTimes(1);
  });

  it('paid order BEFORE the job was created does not cancel (guard is "since")', async () => {
    mockDb.paidOrders.push({ customerEmail: 'guest@example.com', createdAt: new Date('2026-07-01T00:00:00Z') });
    const job = makeJob(); // createdAt 2026-07-05
    const outcome = await processJob(job, makeJourney());
    expect(outcome).toBe('sent');
    expect(await hasPaidOrderSince('guest@example.com', new Date('2026-06-30T00:00:00Z'))).toBe(true);
  });

  it('recovers a retried job whose email already went out — no double send', async () => {
    const job = makeJob({ attempts: 2 });
    mockDb.emailLogs.push({ id: 'log-9', metadata: { jobId: job.id }, status: 'SENT' });
    const outcome = await processJob(job, makeJourney());
    expect(outcome).toBe('recovered');
    expect(sendEmailDetailed).not.toHaveBeenCalled();
    expect(mockDb.jobs[0].status).toBe('sent');
    expect(mockDb.jobs[0].emailLogId).toBe('log-9');
    // step 2 still gets queued
    expect(mockDb.jobs.some((j) => j.dedupeKey === 'contact-form:2:lead-1')).toBe(true);
  });

  it('a FAILED prior EmailLog does NOT count as sent — retry proceeds', async () => {
    const job = makeJob({ attempts: 2 });
    mockDb.emailLogs.push({ id: 'log-9', metadata: { jobId: job.id }, status: 'FAILED' });
    const outcome = await processJob(job, makeJourney());
    expect(outcome).toBe('sent');
    expect(sendEmailDetailed).toHaveBeenCalledTimes(1);
  });

  it('successful send stamps the job and enqueues step 2 only after step 1', async () => {
    const job = makeJob();
    const outcome = await processJob(job, makeJourney());
    expect(outcome).toBe('sent');
    expect(mockDb.jobs[0]).toMatchObject({ status: 'sent', emailLogId: 'log-1' });

    const step2 = mockDb.jobs.find((j) => j.dedupeKey === 'contact-form:2:lead-1');
    expect(step2).toBeDefined();
    expect(step2!.status).toBe('scheduled');

    expect(sendEmailDetailed).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'guest@example.com',
        respectSuppression: true,
        from: { email: 'info@partyondelivery.com', name: 'Allan at Party On Delivery' },
        headers: expect.objectContaining({
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }),
        metadata: expect.objectContaining({ jobId: job.id, step: 1 }),
      })
    );
  });

  it('ctx.link refuses absolute and protocol-relative URLs (open-redirect guard)', async () => {
    let captured: string[] = [];
    const journey = makeJourney({
      steps: [
        {
          delayHours: 0,
          buildEmail: (ctx) => {
            captured = [
              ctx.link('https://evil.example.com/phish'),
              ctx.link('//evil.example.com/phish'),
              ctx.link('/order'),
            ];
            return { subject: 's', html: '<p>x</p>', text: 'x' };
          },
        },
      ],
    });
    await processJob(makeJob(), journey);
    expect(captured[0]).not.toContain('evil.example.com');
    expect(captured[1]).not.toContain('evil.example.com');
    expect(captured[2]).toContain('partyondelivery.com/order');
    expect(captured[2]).toContain('utm_campaign=contact-form');
    expect(captured[2]).toContain('utm_content=step-1');
  });

  it('single-step journeys do not enqueue a step 2', async () => {
    const journey = makeJourney({
      steps: [{ delayHours: 1, buildEmail: () => ({ subject: 's', html: '<p>x</p>', text: 'x' }) }],
    });
    await processJob(makeJob(), journey);
    expect(mockDb.jobs).toHaveLength(1);
  });

  it('buildEmail returning null cancels with no-content', async () => {
    const journey = makeJourney({
      steps: [{ delayHours: 0, buildEmail: () => null }],
    });
    const outcome = await processJob(makeJob(), journey);
    expect(outcome).toBe('canceled');
    expect(mockDb.jobs[0].cancelReason).toBe('no-content');
  });

  it('send failure with attempts left goes back to scheduled for retry', async () => {
    sendEmailDetailed.mockResolvedValue({ sent: false, emailLogId: 'log-2', resendId: null, error: 'boom' });
    const outcome = await processJob(makeJob({ attempts: 1 }), makeJourney());
    expect(outcome).toBe('failed');
    expect(mockDb.jobs[0].status).toBe('scheduled');
    expect(mockDb.jobs[0].lastError).toBe('boom');
  });

  it('send failure on the final attempt marks the job failed', async () => {
    sendEmailDetailed.mockResolvedValue({ sent: false, emailLogId: 'log-2', resendId: null, error: 'boom' });
    const outcome = await processJob(makeJob({ attempts: 3 }), makeJourney());
    expect(outcome).toBe('failed');
    expect(mockDb.jobs[0].status).toBe('failed');
  });
});
