/**
 * POST /api/v1/admin/premiere-credits/[id]/approve
 *
 * Approve a HELD_FOR_APPROVAL grant and send its code to the customer
 * (mints the discount first if the hold was a possible-duplicate that never
 * minted). Ops-gated; sends real customer email/SMS.
 */

import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { approveAndSend } from '@/lib/premiere-credits/admin';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const result = await approveAndSend(id, auth.role);
    const ok = result.status === 'SENT';
    return NextResponse.json({ success: ok, data: result }, { status: ok ? 200 : 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'approve failed';
    console.error('[premiere-credits admin] approve failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
