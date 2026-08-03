/**
 * POST /api/v2/group-orders/[code]/host-claim-token - Generate host claim token
 *
 * OPS ONLY. This mints a reusable credential that turns whoever holds the link
 * into the host of the order, and its only input used to be a participant id
 * that the public GET hands to anybody with the share code — so any guest
 * could mint themselves a host credential. No client calls this route; the
 * real claim links are minted server-side at dashboard creation (affiliate
 * create-dashboard and the Premier booking webhook).
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateHostClaimToken } from '@/lib/group-orders-v2/service';
import { requireOpsAuth } from '@/lib/auth/ops-session';

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const { code } = await params;
    const { hostParticipantId } = await request.json();

    if (!hostParticipantId) {
      return NextResponse.json(
        { success: false, error: 'hostParticipantId is required' },
        { status: 400 }
      );
    }

    const token = await generateHostClaimToken(code, hostParticipantId);
    return NextResponse.json({ success: true, data: { token } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to generate claim token';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
