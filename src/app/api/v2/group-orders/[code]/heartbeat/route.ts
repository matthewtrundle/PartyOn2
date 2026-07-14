/**
 * POST /api/v2/group-orders/[code]/heartbeat
 * Public endpoint — accumulates time-on-dashboard for engagement
 * analytics. The dashboard pings this every 30s while visible; each
 * ping bumps lastSeenAt and adds `seconds` (server-capped) to the
 * visitor's activeSeconds. Writes are rejected for unknown share codes
 * and throttled server-side (min 20s between credited heartbeats per
 * visitor), so replay/forgery cannot inflate the metrics or grow the
 * table unbounded.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  recordDashboardHeartbeat,
  shareCodeExists,
} from '@/lib/group-orders-v2/view-tracking';
import { clientIpFrom } from '@/lib/group-orders-v2/client-ip';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const { code } = await params;

    if (!(await shareCodeExists(code))) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    let seconds = 30;
    try {
      const body = await request.json();
      if (typeof body?.seconds === 'number') seconds = body.seconds;
    } catch {
      // sendBeacon may post an empty body — use the default interval
    }

    // Awaited on purpose: un-awaited writes get killed by the serverless
    // freeze when the response returns.
    await recordDashboardHeartbeat(code, clientIpFrom(request), seconds);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Heartbeat] Error:', err);
    return NextResponse.json({ success: true }); // tracking is best-effort
  }
}
