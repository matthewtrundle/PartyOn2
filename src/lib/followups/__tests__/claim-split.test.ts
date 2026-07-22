/**
 * claimDueJobs cap-split: uncapped journeys claim in one batch query;
 * a capped journey claims via its own query LIMITed to min(remaining, 50);
 * remaining 0 issues NO query for that key (jobs untouched — free deferral,
 * attempts not bumped).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { rawCalls, findMany } = vi.hoisted(() => ({
  rawCalls: [] as Array<{ sql: string; values: unknown[] }>,
  findMany: vi.fn(async () => []),
}));

vi.mock('@/lib/database/client', () => ({
  prisma: {
    $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      rawCalls.push({ sql: strings.join('?'), values });
      return [{ id: `claimed-${rawCalls.length}` }];
    }),
    followUpJob: { findMany },
  },
}));

// Prisma.join is used inside the query template — keep the real module for
// everything except the client.
import { claimDueJobs } from '../engine';

beforeEach(() => {
  rawCalls.length = 0;
  findMany.mockClear();
});

describe('claimDueJobs cap-split', () => {
  it('claims uncapped journeys exactly as before (single batch query)', async () => {
    await claimDueJobs(['abandoned-quote', 'contact-form']);
    expect(rawCalls).toHaveLength(1);
    expect(rawCalls[0].sql).toContain('journey_key IN');
    expect(rawCalls[0].sql).toContain('LIMIT');
  });

  it('splits capped keys into their own LIMITed query', async () => {
    await claimDueJobs(['abandoned-quote', 'partner-outreach'], { 'partner-outreach': 3 });
    expect(rawCalls).toHaveLength(2);
    // Batch query for the uncapped key only.
    expect(rawCalls[0].values).toContainEqual(expect.anything());
    expect(rawCalls[0].sql).toContain('journey_key IN');
    // Capped query: journey_key = $ with LIMIT min(remaining, 50) = 3.
    expect(rawCalls[1].sql).toContain('journey_key =');
    expect(rawCalls[1].values).toContain('partner-outreach');
    expect(rawCalls[1].values).toContain(3);
  });

  it('remaining 0 → no query for the capped key at all (attempts untouched)', async () => {
    await claimDueJobs(['abandoned-quote', 'partner-outreach'], { 'partner-outreach': 0 });
    expect(rawCalls).toHaveLength(1);
    expect(rawCalls[0].sql).toContain('journey_key IN');
    expect(rawCalls[0].values).not.toContain('partner-outreach');
  });

  it('caps the per-key limit at the batch size (50)', async () => {
    await claimDueJobs(['partner-outreach'], { 'partner-outreach': 999 });
    expect(rawCalls).toHaveLength(1);
    expect(rawCalls[0].values).toContain(50);
  });

  it('only capped key enabled with 0 remaining → nothing claimed, no queries', async () => {
    const jobs = await claimDueJobs(['partner-outreach'], { 'partner-outreach': 0 });
    expect(rawCalls).toHaveLength(0);
    expect(jobs).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
