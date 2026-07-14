/**
 * POST /api/v2/group-orders/[code]/track-view
 * Public endpoint -- tracks unique dashboard visitors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackDashboardView } from '@/lib/group-orders-v2/view-tracking';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const { code } = await params;

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';

    // Awaited on purpose: un-awaited writes get killed by the serverless
    // freeze when the response returns (same bug as the lead mirrors).
    await trackDashboardView(code, ip).catch((err) => {
      console.error('[Track View] Error:', err);
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // Never fail -- tracking is best-effort
  }
}
