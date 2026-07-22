/**
 * outreach-cap: env clamping, CT day-start math across DST, and the
 * sent+processing counting rule (all touches count against the cap).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { counts } = vi.hoisted(() => ({
  counts: { sent: 0, processing: 0 },
}));

vi.mock('@/lib/database/client', () => ({
  prisma: {
    followUpJob: {
      count: vi.fn(async ({ where }: { where: { status: string } }) =>
        where.status === 'sent' ? counts.sent : counts.processing
      ),
    },
  },
}));

import {
  chicagoDayStart,
  countOutreachSendsToday,
  outreachDailyCap,
  outreachRemainingToday,
} from '../outreach-cap';

beforeEach(() => {
  counts.sent = 0;
  counts.processing = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('outreachDailyCap', () => {
  it('defaults to 10 and clamps to [1, 50]', () => {
    vi.stubEnv('OUTREACH_DAILY_CAP', '');
    expect(outreachDailyCap()).toBe(10);
    vi.stubEnv('OUTREACH_DAILY_CAP', '25');
    expect(outreachDailyCap()).toBe(25);
    vi.stubEnv('OUTREACH_DAILY_CAP', '0');
    expect(outreachDailyCap()).toBe(1);
    vi.stubEnv('OUTREACH_DAILY_CAP', '500');
    expect(outreachDailyCap()).toBe(50);
    vi.stubEnv('OUTREACH_DAILY_CAP', 'banana');
    expect(outreachDailyCap()).toBe(10);
  });
});

describe('chicagoDayStart', () => {
  it('is midnight CT expressed in UTC — CDT (−5)', () => {
    // 2026-07-22 18:30 UTC = 13:30 CDT → day start 2026-07-22T05:00:00Z
    const start = chicagoDayStart(new Date('2026-07-22T18:30:00Z'));
    expect(start.toISOString()).toBe('2026-07-22T05:00:00.000Z');
  });

  it('is midnight CT expressed in UTC — CST (−6)', () => {
    // 2026-01-15 18:30 UTC = 12:30 CST → day start 2026-01-15T06:00:00Z
    const start = chicagoDayStart(new Date('2026-01-15T18:30:00Z'));
    expect(start.toISOString()).toBe('2026-01-15T06:00:00.000Z');
  });

  it('early-UTC hours still map to the previous CT day', () => {
    // 2026-07-23 03:00 UTC = 22:00 CDT on the 22nd → day start July 22 05:00Z
    const start = chicagoDayStart(new Date('2026-07-23T03:00:00Z'));
    expect(start.toISOString()).toBe('2026-07-22T05:00:00.000Z');
  });
});

describe('countOutreachSendsToday / outreachRemainingToday', () => {
  it('counts sent + processing (all touches)', async () => {
    counts.sent = 4;
    counts.processing = 2;
    expect(await countOutreachSendsToday()).toBe(6);
  });

  it('remaining never goes negative', async () => {
    vi.stubEnv('OUTREACH_DAILY_CAP', '5');
    counts.sent = 9;
    expect(await outreachRemainingToday()).toBe(0);
    counts.sent = 3;
    expect(await outreachRemainingToday()).toBe(2);
  });
});
