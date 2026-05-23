/**
 * GET /api/cron/finance-plaid-sync
 *
 * Phase 2C — daily 08:05 UTC safety net. Webhooks normally drive Plaid sync,
 * but if any deliveries were missed this cron sweeps every active item.
 * Then it re-runs reconciliation against any unmatched transactions.
 *
 * Bearer auth: `Authorization: Bearer ${CRON_SECRET}`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllItems } from '@/lib/finance/plaid-sync-service';

export const maxDuration = 300;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const startedAt = Date.now();
  try {
    const results = await syncAllItems();
    const totals = results.reduce(
      (acc, r) => {
        acc.added += r.added;
        acc.modified += r.modified;
        acc.removed += r.removed;
        acc.inflowsMatched += r.inflowsMatched;
        acc.outflowsMatched += r.outflowsMatched;
        acc.unmatched += r.unmatched;
        return acc;
      },
      {
        added: 0,
        modified: 0,
        removed: 0,
        inflowsMatched: 0,
        outflowsMatched: 0,
        unmatched: 0,
      }
    );
    const report = {
      durationMs: Date.now() - startedAt,
      items: results.length,
      totals,
      results,
    };
    console.log('[finance-plaid-sync] report:', JSON.stringify(report));
    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[finance-plaid-sync] failed:', message);
    return NextResponse.json(
      { success: false, error: message, durationMs: Date.now() - startedAt },
      { status: 500 }
    );
  }
}
