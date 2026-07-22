/**
 * POST /api/v1/admin/premiere-credits/[id]/cancel
 *
 * Void a grant and deactivate its (unredeemed) discount. Refuses to cancel a
 * grant whose code has already been redeemed. Ops-gated.
 */

import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { cancel } from '@/lib/premiere-credits/admin';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const result = await cancel(id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'cancel failed';
    console.error('[premiere-credits admin] cancel failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
