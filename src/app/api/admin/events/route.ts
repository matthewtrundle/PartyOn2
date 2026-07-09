/**
 * GET /api/admin/events
 *
 * Ops-only events hub: a live summary of every registered event (RSVP headcount
 * or ticket sales + $ collected, plus date/status). No buyer PII — just rolled-
 * up counts — but still ops-gated since it reports revenue.
 *
 * NOTE: /api/admin/** is NOT covered by the middleware auth matcher, so this
 * handler guards itself.
 */
import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { getOpsEventSummaries } from '@/lib/events/ops-summary';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const events = await getOpsEventSummaries();
    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error('[Ops Events] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Failed to load events' }, { status: 500 });
  }
}
