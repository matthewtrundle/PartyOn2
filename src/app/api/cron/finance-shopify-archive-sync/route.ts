/**
 * GET /api/cron/finance-shopify-archive-sync
 *
 * Phase 5A — daily safety net that re-pulls anything Shopify updated since
 * yesterday (orders, refunds, fulfillment status changes) into
 * shopify_order_archive. Runs at 07:00 UTC, ahead of the daily snapshot at
 * 07:45 UTC so the rollup builder (Phase 5C) reads from a fresh archive.
 *
 * Bearer auth: requires `Authorization: Bearer ${CRON_SECRET}` header.
 *
 * Notes
 *   - The one-shot full backfill lives in scripts/finance/backfill-shopify-archive.ts.
 *     This cron is incremental only.
 *   - The 36-hour lookback window is intentional overlap so we don't lose
 *     orders updated near the previous run's tail.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  syncOrdersSince,
  getSyncState,
} from '@/lib/finance/shopify-archive-service';

export const maxDuration = 300; // 5 min — incremental sync is fast but allow room

const LOOKBACK_HOURS = 36;

interface SyncReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  ordersUpserted: number;
  pagesFetched: number;
  lastProcessedAt: string | null;
  cursorWindowStartIso: string;
  errors: string[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date();
  const state = await getSyncState();
  const cursor =
    state?.lastIncrementalAt ??
    state?.lastFullBackfillAt ??
    new Date(startedAt.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);
  // Always overlap by LOOKBACK_HOURS so refunds + status changes near the
  // boundary still get picked up.
  const windowStart = new Date(
    Math.min(
      cursor.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000,
      startedAt.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000
    )
  );

  const report: SyncReport = {
    startedAt: startedAt.toISOString(),
    finishedAt: '',
    durationMs: 0,
    ordersUpserted: 0,
    pagesFetched: 0,
    lastProcessedAt: null,
    cursorWindowStartIso: windowStart.toISOString(),
    errors: [],
  };

  try {
    const result = await syncOrdersSince(windowStart);
    report.ordersUpserted = result.ordersUpserted;
    report.pagesFetched = result.pagesFetched;
    report.lastProcessedAt = result.lastProcessedAt;
    report.errors.push(...result.errors);
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : String(err));
  }

  const finishedAt = new Date();
  report.finishedAt = finishedAt.toISOString();
  report.durationMs = finishedAt.getTime() - startedAt.getTime();

  console.log('[finance-shopify-archive-sync] report:', JSON.stringify(report));
  return NextResponse.json({ success: report.errors.length === 0, data: report });
}
