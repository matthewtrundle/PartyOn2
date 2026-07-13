/**
 * Relink-cutover coverage guard: the keeper Item must fully cover the old
 * Item's history before the old one may be deleted — a keeper still waiting
 * on its HISTORICAL_UPDATE backfill must be refused, or the cutover would
 * throw away bank history.
 */

import { describe, it, expect } from 'vitest';
import { cutoverCoverageOk } from '@/lib/finance/plaid-sync-service';

describe('cutoverCoverageOk', () => {
  const old = { minDate: '2026-04-10', maxDate: '2026-07-13', txnCount: 346 };

  it('accepts a keeper whose history is a superset (backfill landed)', () => {
    const r = cutoverCoverageOk({
      keep: { minDate: '2024-07-14', maxDate: '2026-07-13', txnCount: 2100 },
      old,
    });
    expect(r.ok).toBe(true);
  });

  it('refuses a keeper still on its initial ~90d pull (backfill pending)', () => {
    // Fresh item connected today: initial pull only reaches back ~90 days —
    // 4 days SHORT of the old item's start. Deleting the old item now would
    // lose those days.
    const r = cutoverCoverageOk({
      keep: { minDate: '2026-04-14', maxDate: '2026-07-13', txnCount: 340 },
      old,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('backfill not complete');
  });

  it('allows one day of slack at the recent end (sync timing skew)', () => {
    const r = cutoverCoverageOk({
      keep: { minDate: '2024-07-14', maxDate: '2026-07-12', txnCount: 2100 },
      old, // old synced this morning (07-13); keeper minutes behind
    });
    expect(r.ok).toBe(true);
  });

  it('refuses a keeper more than a day stale at the recent end', () => {
    const r = cutoverCoverageOk({
      keep: { minDate: '2024-07-14', maxDate: '2026-07-10', txnCount: 2100 },
      old,
    });
    expect(r.ok).toBe(false);
  });

  it('refuses a keeper with too few rows to be a superset', () => {
    const r = cutoverCoverageOk({
      keep: { minDate: '2024-07-14', maxDate: '2026-07-13', txnCount: 200 },
      old,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('too few');
  });

  it('refuses when the keeper has no transactions at all (sentinel range)', () => {
    const r = cutoverCoverageOk({
      keep: { minDate: '9999-12-31', maxDate: '0000-01-01', txnCount: 0 },
      old,
    });
    expect(r.ok).toBe(false);
  });
});
