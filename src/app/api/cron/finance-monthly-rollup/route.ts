/**
 * GET /api/cron/finance-monthly-rollup
 *
 * Phase 5C — nightly recompute of the current + prior month's trajectory
 * rollup so the monthly close email + admin trajectory view stay fresh as new
 * orders / QB expenses land. The full-history backfill is the one-shot script
 * (scripts/finance/backfill-monthly-rollups.ts); this cron only touches the
 * trailing two months.
 *
 * Schedule: nightly at 08:10 UTC (after the daily snapshot 07:45 + QB/Plaid).
 * Bearer auth: `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Optional `?months=N` recomputes the trailing N months (default 2, max 24) —
 * handy after a QB re-categorization.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  computeMonthlyRollup,
  persistMonthlyRollup,
  enumerateMonths,
} from '@/lib/finance/monthly-rollup';

export const maxDuration = 300;

interface Report {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  monthsRecomputed: number;
  months: string[];
  errors: string[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date();
  const monthsParam = request.nextUrl.searchParams.get('months');
  let trailing = monthsParam ? Number.parseInt(monthsParam, 10) : 2;
  if (!Number.isFinite(trailing) || trailing < 1) trailing = 2;
  if (trailing > 24) trailing = 24;

  // Trailing N months ending this month.
  const now = startedAt;
  const endYm = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  const startDate = new Date(Date.UTC(endYm.year, endYm.month - 1 - (trailing - 1), 1));
  const startYm = { year: startDate.getUTCFullYear(), month: startDate.getUTCMonth() + 1 };
  const months = enumerateMonths(startYm, endYm);

  const report: Report = {
    startedAt: startedAt.toISOString(),
    finishedAt: '',
    durationMs: 0,
    monthsRecomputed: 0,
    months: [],
    errors: [],
  };

  for (const { year, month } of months) {
    const label = `${year}-${String(month).padStart(2, '0')}`;
    try {
      const result = await computeMonthlyRollup(year, month);
      await persistMonthlyRollup(result);
      report.monthsRecomputed += 1;
      report.months.push(label);
    } catch (err) {
      report.errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const finishedAt = new Date();
  report.finishedAt = finishedAt.toISOString();
  report.durationMs = finishedAt.getTime() - startedAt.getTime();
  console.log('[finance-monthly-rollup] report:', JSON.stringify(report));
  return NextResponse.json({ success: report.errors.length === 0, data: report });
}
