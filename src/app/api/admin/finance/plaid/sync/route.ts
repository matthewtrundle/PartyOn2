/**
 * POST /api/admin/finance/plaid/sync
 *
 * Manually kick a transaction sync across all linked Plaid items — the same
 * `syncAllItems()` the daily cron runs. Used by the connect-bank page right
 * after an extend-history re-auth so the first slice of deeper history lands
 * immediately (the rest arrives via HISTORICAL_UPDATE webhooks over the
 * following hours), and handy as a general "sync now" for the operator.
 */

import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { syncAllItems } from '@/lib/finance/plaid-sync-service';

export const maxDuration = 120;

export async function POST(): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const results = await syncAllItems();
    return NextResponse.json({ success: true, data: { results } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Plaid Sync] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
