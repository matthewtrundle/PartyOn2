/**
 * POST /api/admin/finance/plaid/purge-non-prod
 *
 * Deletes every NON-production PlaidItem and its dependent rows (accounts,
 * transactions, sync cursor). Used once on the Wells Fargo cutover to clear the
 * Plaid sandbox "Platypus" data after real production is connected. Keyed on
 * `environment != 'production'` so it can never touch the live bank connection.
 *
 * Mirrors the QuickBooks realm purge. Operator-only (requireOpsAuth).
 */

import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { purgeNonProdPlaidData } from '@/lib/finance/plaid-sync-service';

export async function POST(): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const result = await purgeNonProdPlaidData();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Plaid Purge Non-Prod] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
