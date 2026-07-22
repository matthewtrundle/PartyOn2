/**
 * POST /api/v1/admin/premiere-credits/[id]/resend
 *
 * Resend a grant's code (valid from SENT or SEND_FAILED). Ops-gated.
 */

import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { resend } from '@/lib/premiere-credits/admin';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const result = await resend(id);
    const ok = result.status === 'SENT';
    return NextResponse.json({ success: ok, data: result }, { status: ok ? 200 : 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'resend failed';
    console.error('[premiere-credits admin] resend failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
