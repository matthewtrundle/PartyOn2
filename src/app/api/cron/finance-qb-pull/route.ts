/**
 * GET /api/cron/finance-qb-pull
 *
 * Phase 2A — weekly QuickBooks expense pull. Refreshes the Chart of Accounts
 * cache then pulls Purchase + Bill transactions in the trailing 30 days.
 * Re-runnable: upserts by QB transaction ID so re-firing only updates.
 *
 * Schedule: Mondays at 07:50 UTC (after the daily snapshot at 07:45).
 * Bearer auth: `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Optional query param `?days=N` overrides the trailing window (default 30,
 * max 365). Useful for one-shot backfills.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  pullQbExpenses,
  syncQbAccounts,
} from '@/lib/finance/qb-pull-service';
import { getStoredTokens } from '@/lib/finance/qb-client';

export const maxDuration = 300; // 5 min — QB pagination can take a while

interface SyncReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  qbConnected: boolean;
  accountsUpserted: number;
  purchasesUpserted: number;
  billsUpserted: number;
  windowDays: number;
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
    qbConnected: false,
    accountsUpserted: 0,
    purchasesUpserted: 0,
    billsUpserted: 0,
    windowDays: 30,
    errors: [],
  };

  // Skip cleanly if QB isn't connected yet — don't crash the cron.
  const tokens = await getStoredTokens();
  if (!tokens) {
    report.errors.push('QuickBooks not connected — skipping pull');
    report.finishedAt = new Date().toISOString();
    report.durationMs = Date.now() - startedAt.getTime();
    return NextResponse.json({ success: false, data: report });
  }
  report.qbConnected = true;

  const daysParam = request.nextUrl.searchParams.get('days');
  let days = daysParam ? Number.parseInt(daysParam, 10) : 30;
  if (!Number.isFinite(days) || days < 1) days = 30;
  if (days > 365) days = 365;
  report.windowDays = days;

  const since = new Date(Date.now() - days * 86_400_000);
  const sinceIso = since.toISOString().slice(0, 10);

  try {
    const { upserted } = await syncQbAccounts();
    report.accountsUpserted = upserted;
  } catch (err) {
    report.errors.push(`accounts: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const { purchases, bills } = await pullQbExpenses(sinceIso);
    report.purchasesUpserted = purchases;
    report.billsUpserted = bills;
  } catch (err) {
    report.errors.push(`expenses: ${err instanceof Error ? err.message : String(err)}`);
  }

  const finishedAt = new Date();
  report.finishedAt = finishedAt.toISOString();
  report.durationMs = finishedAt.getTime() - startedAt.getTime();
  console.log('[finance-qb-pull] report:', JSON.stringify(report));
  return NextResponse.json({ success: report.errors.length === 0, data: report });
}
