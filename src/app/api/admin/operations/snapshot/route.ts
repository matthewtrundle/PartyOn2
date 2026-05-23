/**
 * GET /api/admin/operations/snapshot
 *
 * One-stop JSON for the Operations Director dashboard + the agent.
 * Returns the latest OperationsSnapshot, the last 30 snapshots for trend
 * sparklines, active-rec counts (by severity + by signal), and the top-N
 * urgent recs. Shared with /admin/operations RSC via dashboard-data.
 */

import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { loadDashboardData } from '@/lib/operations/dashboard-data';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const data = await loadDashboardData();
  return NextResponse.json(data);
}
