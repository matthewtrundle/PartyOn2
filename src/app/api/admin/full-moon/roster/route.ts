/**
 * GET /api/admin/full-moon/roster
 *
 * Ops-only sales roster for the Lake Travis Full Moon Party: every PAID ticket
 * order (buyer name/email/phone, amount, quantity, Stripe payment-intent id,
 * date) plus totals ($ collected, tickets sold, N of the minimum, advertised
 * cap, hard cap). Exposes buyer PII, so it is gated by requireOpsAuth.
 *
 * NOTE: /api/admin/** is NOT covered by the middleware auth matcher (only
 * /api/v1/admin/** is), so this handler MUST guard itself.
 */
import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { getFullMoonRoster } from '@/lib/full-moon/roster';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const roster = await getFullMoonRoster();
    return NextResponse.json({ success: true, ...roster });
  } catch (error) {
    console.error('[FullMoon Roster] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Failed to load roster' }, { status: 500 });
  }
}
