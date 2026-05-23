/**
 * POST /api/admin/recommendations/[id]/snooze
 * Body: { days: number, reason?: string }
 *
 * Sets status to `snoozed` and `snoozeUntil = now + days`. Default 7 days.
 * Marketing recs don't have a native snoozeUntil column — for those we set
 * status to `snoozed` and persist any reason into `notes` so the audit trail
 * survives.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { findRecommendationLocation } from '@/lib/recommendations/unified-list';
import { applyStatusUpdate, logAction } from '@/lib/recommendations/mutation-helpers';

export const dynamic = 'force-dynamic';

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const days = typeof body?.days === 'number' && body.days > 0
    ? Math.min(MAX_DAYS, Math.floor(body.days))
    : DEFAULT_DAYS;
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

  const location = await findRecommendationLocation(id);
  if (!location) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const snoozeUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  try {
    await applyStatusUpdate(id, location.domain, location.status, {
      status: 'snoozed',
      snoozeUntil,
      notes: reason || undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_transition', message: err instanceof Error ? err.message : 'unknown' },
      { status: 409 }
    );
  }

  await logAction(id, location.domain, {
    actionKind: 'snooze',
    actionLabel: `Snoozed ${days}d${reason ? ` — ${reason}` : ''}`,
    result: 'success',
  });

  return NextResponse.json({ ok: true, snoozeUntil: snoozeUntil.toISOString(), days });
}
