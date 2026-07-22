/**
 * claimDueJobs cap-split: uncapped journeys claim in one batch query; a
 * capped journey counts + claims inside ONE advisory-locked transaction
 * (TOCTOU-safe) with LIMIT min(cap − used, 50); cap exhausted → no claim
 * query at all (jobs untouched — free deferral, attempts not bumped).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { state, rawCalls, txCalls, findMany } = vi.hoisted(() => ({
  state: { usedSent: 0, usedProcessing: 0 },
  rawCalls: [] as Array<{ sql: string; values: unknown[] }>,
  txCalls: [] as Array<{ kind: string; sql?: string; values?: unknown[] }>,
  findMany: vi.fn(async () => []),
}));

vi.mock('@/lib/database/client', () => {
  const tx = {
    $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      txCalls.push({ kind: 'lock', sql: strings.join('?'), values });
      return 0;
    }),
    $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      txCalls.push({ kind: 'claim', sql: strings.join('?'), values });
      return [{ id: `claimed-${txCalls.length}` }];
    }),
    followUpJob: {
      count: vi.fn(async ({ where }: { where: { status: string } }) =>
        where.status === 'sent' ? state.usedSent : state.usedProcessing
      ),
    },
  };
  return {
    prisma: {
      $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        rawCalls.push({ sql: strings.join('?'), values });
        return [{ id: `claimed-uncapped-${rawCalls.length}` }];
      }),
      $transaction: vi.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
      followUpJob: { findMany },
    },
  };
});

import { claimDueJobs } from '../engine';

beforeEach(() => {
  state.usedSent = 0;
  state.usedProcessing = 0;
  rawCalls.length = 0;
  txCalls.length = 0;
  findMany.mockClear();
});

describe('claimDueJobs cap-split', () => {
  it('claims uncapped journeys exactly as before (single batch query, no transaction)', async () => {
    await claimDueJobs(['abandoned-quote', 'contact-form']);
    expect(rawCalls).toHaveLength(1);
    expect(rawCalls[0].sql).toContain('journey_key IN');
    expect(txCalls).toHaveLength(0);
  });

  it('capped key counts + claims inside the advisory-locked transaction', async () => {
    state.usedSent = 5;
    state.usedProcessing = 2;
    await claimDueJobs(['abandoned-quote', 'partner-outreach'], { 'partner-outreach': 10 });
    // Batch query only covers the uncapped key.
    expect(rawCalls).toHaveLength(1);
    expect(rawCalls[0].values).not.toContain('partner-outreach');
    // Transaction: lock first, then claim with LIMIT cap − used = 3.
    expect(txCalls[0].kind).toBe('lock');
    expect(txCalls[0].sql).toContain('pg_advisory_xact_lock');
    expect(txCalls[1].kind).toBe('claim');
    expect(txCalls[1].sql).toContain('journey_key =');
    expect(txCalls[1].values).toContain('partner-outreach');
    expect(txCalls[1].values).toContain(3);
  });

  it('cap already used up → lock taken but NO claim query (attempts untouched)', async () => {
    state.usedSent = 10;
    await claimDueJobs(['partner-outreach'], { 'partner-outreach': 10 });
    expect(txCalls.filter((c) => c.kind === 'lock')).toHaveLength(1);
    expect(txCalls.filter((c) => c.kind === 'claim')).toHaveLength(0);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('clamps the per-tick claim at the batch size (50)', async () => {
    await claimDueJobs(['partner-outreach'], { 'partner-outreach': 999 });
    const claim = txCalls.find((c) => c.kind === 'claim');
    expect(claim!.values).toContain(50);
  });

  it('cap of 0 skips the transaction entirely', async () => {
    const jobs = await claimDueJobs(['partner-outreach'], { 'partner-outreach': 0 });
    expect(txCalls).toHaveLength(0);
    expect(rawCalls).toHaveLength(0);
    expect(jobs).toEqual([]);
  });
});
