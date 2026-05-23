/**
 * GET /api/admin/finance/plaid?days=30
 *
 * Phase 2C — returns reconciliation summary + recent Plaid transactions for
 * the trailing N days (default 30, max 365).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { plaidReconciliationSummary } from '@/lib/finance/plaid-sync-service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const daysParam = request.nextUrl.searchParams.get('days');
    let days = daysParam ? Number.parseInt(daysParam, 10) : 30;
    if (!Number.isFinite(days) || days < 1) days = 30;
    if (days > 365) days = 365;

    const data = await plaidReconciliationSummary(days);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Finance Plaid] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
