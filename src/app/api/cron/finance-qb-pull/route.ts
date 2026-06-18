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
 * Query params (all optional):
 *   ?days=N            trailing window in days (default 30, max 365)
 *   ?since=YYYY-MM-DD  explicit floor date (overrides days). Lets a big
 *                      all-time backfill be chunked year-by-year if it's slow.
 *   ?all=true          Phase 5B all-time floor (2010-01-01) — overrides days/since
 *   ?purgeSandbox=true before pulling, delete cached rows from any OTHER QB
 *                      realm (clears the old Intuit sandbox data on the first
 *                      production run). Use ONCE on the sandbox→prod cutover.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  pullQbExpenses,
  pullQbJournalEntries,
  purgeOtherRealmData,
  syncQbAccounts,
} from '@/lib/finance/qb-pull-service';
import { getStoredTokens, getValidAccessToken } from '@/lib/finance/qb-client';

export const maxDuration = 300; // 5 min — QB pagination can take a while

/** Phase 5B all-time floor — far enough back to cover the whole company. */
const ALL_TIME_FLOOR_ISO = '2010-01-01';

interface SyncReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  qbConnected: boolean;
  realmId: string | null;
  sinceIso: string;
  purgedExpenses: number;
  purgedAccounts: number;
  accountsUpserted: number;
  purchasesUpserted: number;
  billsUpserted: number;
  journalEntriesScanned: number;
  journalExpenseLinesUpserted: number;
  journalSkippedOwn: number;
  errors: string[];
}

/** Resolve the floor date from query params. Precedence: all > since > days. */
function resolveSinceIso(request: NextRequest): string {
  const params = request.nextUrl.searchParams;
  if (params.get('all') === 'true') return ALL_TIME_FLOOR_ISO;

  const sinceParam = params.get('since');
  if (sinceParam && /^\d{4}-\d{2}-\d{2}$/.test(sinceParam)) return sinceParam;

  const daysParam = params.get('days');
  let days = daysParam ? Number.parseInt(daysParam, 10) : 30;
  if (!Number.isFinite(days) || days < 1) days = 30;
  if (days > 365) days = 365;
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
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
    realmId: null,
    sinceIso: '',
    purgedExpenses: 0,
    purgedAccounts: 0,
    accountsUpserted: 0,
    purchasesUpserted: 0,
    billsUpserted: 0,
    journalEntriesScanned: 0,
    journalExpenseLinesUpserted: 0,
    journalSkippedOwn: 0,
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
  report.sinceIso = resolveSinceIso(request);

  // Purge stale (sandbox / other-realm) rows BEFORE the pull so we never
  // serve a mix. Keyed on the currently connected realm.
  if (request.nextUrl.searchParams.get('purgeSandbox') === 'true') {
    try {
      const { realmId } = await getValidAccessToken();
      report.realmId = realmId;
      const purged = await purgeOtherRealmData(realmId);
      report.purgedExpenses = purged.expensesDeleted;
      report.purgedAccounts = purged.accountsDeleted;
    } catch (err) {
      report.errors.push(`purge: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  try {
    const { upserted, perTypeErrors } = await syncQbAccounts();
    report.accountsUpserted = upserted;
    for (const e of perTypeErrors) {
      report.errors.push(`accounts: ${e}`);
    }
  } catch (err) {
    report.errors.push(`accounts: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const { purchases, bills } = await pullQbExpenses(report.sinceIso);
    report.purchasesUpserted = purchases;
    report.billsUpserted = bills;
  } catch (err) {
    report.errors.push(`expenses: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const je = await pullQbJournalEntries(report.sinceIso);
    report.journalEntriesScanned = je.entriesScanned;
    report.journalExpenseLinesUpserted = je.expenseLinesUpserted;
    report.journalSkippedOwn = je.skippedOwn;
  } catch (err) {
    report.errors.push(`journalEntries: ${err instanceof Error ? err.message : String(err)}`);
  }

  const finishedAt = new Date();
  report.finishedAt = finishedAt.toISOString();
  report.durationMs = finishedAt.getTime() - startedAt.getTime();
  console.log('[finance-qb-pull] report:', JSON.stringify(report));
  return NextResponse.json({ success: report.errors.length === 0, data: report });
}
