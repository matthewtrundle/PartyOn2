/**
 * Suppression list + HMAC unsubscribe tokens: tamper resistance, the
 * never-downgrade rule for bounces, and the public-resubscribe boundary.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

interface MockSuppression {
  id: string;
  email: string;
  reason: string;
  source?: string | null;
  note?: string | null;
}
interface MockJob {
  id: string;
  email: string;
  status: string;
  cancelReason?: string | null;
  [key: string]: unknown;
}

const mockDb: { suppressions: MockSuppression[]; jobs: MockJob[]; seq: number } = {
  suppressions: [],
  jobs: [],
  seq: 0,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('@/lib/database/client', () => ({
  prisma: {
    emailSuppression: {
      findUnique: vi.fn(async ({ where }: any) =>
        mockDb.suppressions.find((s) => s.email === where.email) ?? null
      ),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `sup-${++mockDb.seq}`, ...data };
        mockDb.suppressions.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = mockDb.suppressions.find((s) => s.email === where.email);
        if (row) Object.assign(row, data);
        return row;
      }),
      delete: vi.fn(async ({ where }: any) => {
        const idx = mockDb.suppressions.findIndex((s) => s.email === where.email);
        const [row] = idx >= 0 ? mockDb.suppressions.splice(idx, 1) : [null];
        return row;
      }),
    },
    followUpJob: {
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const job of mockDb.jobs) {
          if (job.email === where.email && job.status === where.status) {
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

import {
  unsubscribeToken,
  verifyUnsubscribeToken,
  isSuppressed,
  suppress,
  unsuppress,
} from '../suppression';

const ORIGINAL_SECRET = process.env.UNSUBSCRIBE_SECRET;

beforeEach(() => {
  process.env.UNSUBSCRIBE_SECRET = 'test-secret-for-suppression-tests';
  mockDb.suppressions = [];
  mockDb.jobs = [];
  mockDb.seq = 0;
});

afterEach(() => {
  process.env.UNSUBSCRIBE_SECRET = ORIGINAL_SECRET;
});

describe('unsubscribe tokens', () => {
  it('verifies a valid token, case-insensitively on the email', () => {
    const token = unsubscribeToken('Guest@Example.com')!;
    expect(verifyUnsubscribeToken('guest@example.com', token)).toBe(true);
    expect(verifyUnsubscribeToken('GUEST@EXAMPLE.COM', token)).toBe(true);
  });

  it('rejects tampered tokens and tokens for other emails', () => {
    const token = unsubscribeToken('guest@example.com')!;
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    expect(verifyUnsubscribeToken('guest@example.com', tampered)).toBe(false);
    expect(verifyUnsubscribeToken('other@example.com', token)).toBe(false);
    expect(verifyUnsubscribeToken('guest@example.com', '')).toBe(false);
    expect(verifyUnsubscribeToken('guest@example.com', 'short')).toBe(false);
  });

  it('returns null / false when the secret is not configured', () => {
    delete process.env.UNSUBSCRIBE_SECRET;
    expect(unsubscribeToken('guest@example.com')).toBeNull();
    expect(verifyUnsubscribeToken('guest@example.com', 'anything')).toBe(false);
  });
});

describe('suppress', () => {
  it('adds a row, lowercases, and cancels scheduled jobs (suppression precedence)', async () => {
    mockDb.jobs.push(
      { id: 'j1', email: 'guest@example.com', status: 'scheduled' },
      { id: 'j2', email: 'guest@example.com', status: 'sent' }
    );
    const result = await suppress('Guest@Example.COM', 'unsubscribe', 'one-click');
    expect(result).toEqual({ suppressed: true, canceledJobs: 1 });
    expect(mockDb.suppressions[0].email).toBe('guest@example.com');
    expect(mockDb.jobs[0].status).toBe('suppressed');
    expect(mockDb.jobs[0].cancelReason).toBe('suppressed-unsubscribe');
    expect(mockDb.jobs[1].status).toBe('sent');
    expect(await isSuppressed('GUEST@example.com')).toBe(true);
  });

  it('upgrades unsubscribe → bounce but never downgrades bounce → unsubscribe', async () => {
    await suppress('a@b.com', 'unsubscribe');
    await suppress('a@b.com', 'bounce', 'resend-webhook');
    expect(mockDb.suppressions[0].reason).toBe('bounce');

    await suppress('a@b.com', 'unsubscribe', 'one-click');
    expect(mockDb.suppressions[0].reason).toBe('bounce');
  });

  it('ignores garbage emails', async () => {
    const result = await suppress('   ', 'manual');
    expect(result.suppressed).toBe(false);
    expect(mockDb.suppressions).toHaveLength(0);
  });
});

describe('unsuppress', () => {
  it('publicly reverses unsubscribe rows but refuses bounces', async () => {
    await suppress('soft@b.com', 'unsubscribe');
    await suppress('hard@b.com', 'bounce');

    expect(await unsuppress('soft@b.com')).toBe(true);
    expect(await isSuppressed('soft@b.com')).toBe(false);

    expect(await unsuppress('hard@b.com')).toBe(false);
    expect(await isSuppressed('hard@b.com')).toBe(true);
  });

  it('allows hard-reason removal only with allowHardReasons (admin path)', async () => {
    await suppress('hard@b.com', 'complaint');
    expect(await unsuppress('hard@b.com', { allowHardReasons: true })).toBe(true);
    expect(await isSuppressed('hard@b.com')).toBe(false);
  });
});
