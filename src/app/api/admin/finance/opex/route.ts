/**
 * GET /api/admin/finance/opex?days=30
 *
 * Returns OpEx-by-category for the trailing N days (default 30, max 365).
 * Powered by QbExpense rows cached by the weekly finance-qb-pull cron.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { opExSummary } from '@/lib/finance/qb-pull-service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const daysParam = request.nextUrl.searchParams.get('days');
    let days = daysParam ? Number.parseInt(daysParam, 10) : 30;
    if (!Number.isFinite(days) || days < 1) days = 30;
    if (days > 365) days = 365;

    const to = new Date();
    to.setUTCHours(0, 0, 0, 0);
    const from = new Date(to.getTime() - days * 86_400_000);

    const summary = await opExSummary(
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10)
    );
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Finance OpEx] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
