/**
 * GET /api/cron/finance-snapshot
 *
 * Phase 1C — daily P&L snapshot at 07:45 UTC (after Marketing 07:00,
 * Ops 07:30, Finance Stripe sync 07:15). Computes yesterday's revenue
 * minus known costs, plus cumulative sales-tax + affiliate-commission
 * accruals, and persists a FinanceSnapshot row.
 *
 * Re-runnable: writes by snapshot_date so a backfill of Stripe fees
 * earlier in the day can be reflected by re-firing the cron.
 *
 * Bearer auth: `Authorization: Bearer ${CRON_SECRET}`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeDailyPL, yesterdayWindow } from '@/lib/finance/pl-calculation';
import { writeFinanceSnapshot } from '@/lib/finance/snapshot';

export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date();

  // Allow operator/admin to backfill a specific date via ?date=YYYY-MM-DD.
  const dateParam = request.nextUrl.searchParams.get('date');
  let payload;
  if (dateParam) {
    const from = new Date(`${dateParam}T00:00:00Z`);
    if (Number.isNaN(from.getTime())) {
      return NextResponse.json(
        { success: false, error: 'date must be YYYY-MM-DD' },
        { status: 400 }
      );
    }
    const to = new Date(from.getTime() + 86_400_000);
    payload = await computeDailyPL({ from, to });
  } else {
    payload = await computeDailyPL(yesterdayWindow(startedAt));
  }

  const snapshot = await writeFinanceSnapshot(payload);
  const durationMs = Date.now() - startedAt.getTime();

  console.log('[finance-snapshot] wrote snapshot for', snapshot.snapshotDate, 'in', durationMs, 'ms');
  return NextResponse.json({
    success: true,
    data: { snapshot, durationMs },
  });
}
