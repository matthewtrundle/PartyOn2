/**
 * PATCH /api/v1/admin/premiere-credits/[id]/contact
 *
 * Fill in email/phone for a NEEDS_CONTACT grant, then mint its code. Sending
 * follows the normal gated path (cron send phase, or Approve if held).
 * Ops-gated; Zod-validated body.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { setContact } from '@/lib/premiere-credits/admin';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(32).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ success: false, error: 'invalid body — email required' }, { status: 400 });
  }

  try {
    const result = await setContact(id, parsed.email, parsed.phone ?? null);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'set contact failed';
    console.error('[premiere-credits admin] contact failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
