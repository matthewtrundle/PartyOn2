/**
 * POST /api/v2/group-orders/[code]/heartbeat
 * Public endpoint — accumulates time-on-dashboard for engagement
 * analytics. The dashboard pings this every 30s while visible; each
 * ping bumps lastSeenAt and adds `seconds` (server-capped) to the
 * visitor's activeSeconds.
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordDashboardHeartbeat } from '@/lib/group-orders-v2/view-tracking';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const { code } = await params;

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';

    let seconds = 30;
    try {
      const body = await request.json();
      if (typeof body?.seconds === 'number') seconds = body.seconds;
    } catch {
      // sendBeacon may post an empty body — use the default interval
    }

    // Awaited on purpose: un-awaited writes get killed by the serverless
    // freeze when the response returns.
    await recordDashboardHeartbeat(code, ip, seconds);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Heartbeat] Error:', err);
    return NextResponse.json({ success: true }); // tracking is best-effort
  }
}
