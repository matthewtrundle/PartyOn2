/**
 * GET /api/admin/finance/snapshot
 *
 * Returns the most recent N FinanceSnapshot rows for the /admin/finance
 * dashboard. Use ?limit=N (default 30, max 365) or ?date=YYYY-MM-DD for
 * a single-day lookup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { getSnapshotByDate, listRecentSnapshots } from '@/lib/finance/snapshot';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const date = request.nextUrl.searchParams.get('date');
    if (date) {
      const snap = await getSnapshotByDate(date);
      return NextResponse.json({ success: true, data: snap });
    }

    const limitParam = request.nextUrl.searchParams.get('limit');
    let limit = limitParam ? Number.parseInt(limitParam, 10) : 30;
    if (!Number.isFinite(limit) || limit < 1) limit = 30;
    if (limit > 365) limit = 365;

    const snapshots = await listRecentSnapshots(limit);
    return NextResponse.json({ success: true, data: snapshots });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Finance Snapshot] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
