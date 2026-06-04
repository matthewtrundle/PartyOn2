/**
 * GET /api/cron/finance-stripe-sync
 *
 * Phase 1A — daily Stripe catch-up at 07:15 UTC (before the Marketing 07:00
 * is wrapping up and well before Operations 07:30). Pulls the last 48 hours
 * of payouts + disputes (in case any webhook deliveries were missed),
 * snapshots the current Stripe balance, and backfills missing per-order fee
 * snapshots for up to 100 recent orders.
 *
 * Bearer auth: requires `Authorization: Bearer ${CRON_SECRET}` header. Match
 * the pattern used by /api/cron/operations-snapshot.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  backfillMissingFeeSnapshots,
  pullDisputesSince,
  pullPayoutsSince,
  snapshotStripeBalance,
} from '@/lib/finance/stripe-extended';

export const maxDuration = 300; // 5 min — backfill can pull many charges

interface SyncReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  payoutsUpserted: number;
  disputesUpserted: number;
  balanceSnapshotted: boolean;
  feeBackfill: { processed: number; failed: number };
  errors: string[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date();
  const report: SyncReport = {
    startedAt: startedAt.toISOString(),
    finishedAt: '',
    durationMs: 0,
    payoutsUpserted: 0,
    disputesUpserted: 0,
    balanceSnapshotted: false,
    feeBackfill: { processed: 0, failed: 0 },
    errors: [],
  };

  const since = Math.floor(Date.now() / 1000) - 60 * 60 * 48; // 48h

  try {
    report.payoutsUpserted = await pullPayoutsSince(since);
  } catch (err) {
    report.errors.push(`payouts: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    report.disputesUpserted = await pullDisputesSince(since);
  } catch (err) {
    report.errors.push(`disputes: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    await snapshotStripeBalance();
    report.balanceSnapshotted = true;
  } catch (err) {
    report.errors.push(`balance: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    report.feeBackfill = await backfillMissingFeeSnapshots(100);
  } catch (err) {
    report.errors.push(`feeBackfill: ${err instanceof Error ? err.message : String(err)}`);
  }

  const finishedAt = new Date();
  report.finishedAt = finishedAt.toISOString();
  report.durationMs = finishedAt.getTime() - startedAt.getTime();

  console.log('[finance-stripe-sync] report:', JSON.stringify(report));
  return NextResponse.json({ success: report.errors.length === 0, data: report });
}
