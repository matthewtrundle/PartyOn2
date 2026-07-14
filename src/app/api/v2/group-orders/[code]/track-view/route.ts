/**
 * POST /api/v2/group-orders/[code]/track-view
 * Public endpoint -- tracks unique dashboard visitors. Rejects unknown
 * share codes so arbitrary strings can't create garbage rows.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  trackDashboardView,
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

    // Awaited on purpose: un-awaited writes get killed by the serverless
    // freeze when the response returns (same bug as the lead mirrors).
    await trackDashboardView(code, clientIpFrom(request)).catch((err) => {
      console.error('[Track View] Error:', err);
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // Never fail -- tracking is best-effort
  }
}
