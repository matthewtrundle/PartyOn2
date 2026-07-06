/**
 * GET /api/ops/followups/stats — per-journey sends/opens/conversions/revenue
 * (30-day post-send attribution window; each order counts once, against the
 * most recent send before it).
 *
 * Ops-auth only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { getFollowUpStats } from '@/lib/followups/attribution';

export async function GET(request: NextRequest) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const raw = Number(request.nextUrl.searchParams.get('windowDays') ?? 30);
    const windowDays = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 365) : 30;
    const stats = await getFollowUpStats(windowDays);
    return NextResponse.json({ success: true, windowDays, stats });
  } catch (error) {
    console.error('[ops/followups/stats GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load stats' }, { status: 500 });
  }
}
