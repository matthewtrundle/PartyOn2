/**
 * POST /api/admin/recommendations/[id]/dismiss
 * Body: { reason: string }   (required, free-text, min 1 char)
 *
 * Sets status to `rejected` and persists `reason` so the heuristic suppression
 * loop (§5d, future PR) can read it back. Marketing recs reuse `notes`.
 *
 * TODO(phase 1B feedback loop): repeated dismissals with the same reason on
 * the same target should suppress the rec for N detection passes. See
 * docs/OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md §5d. Persist now, suppress later.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { findRecommendationLocation } from '@/lib/recommendations/unified-list';
import { applyStatusUpdate, logAction } from '@/lib/recommendations/mutation-helpers';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (!reason) {
    return NextResponse.json(
      { error: 'reason_required', message: 'Reason is required when dismissing a rec.' },
      { status: 400 }
    );
  }

  const location = await findRecommendationLocation(id);
  if (!location) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    await applyStatusUpdate(id, location.domain, location.status, {
      status: 'rejected',
      dismissReason: reason,
      notes: reason,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_transition', message: err instanceof Error ? err.message : 'unknown' },
      { status: 409 }
    );
  }

  await logAction(id, location.domain, {
    actionKind: 'dismiss',
    actionLabel: `Dismissed — ${reason}`,
    result: 'success',
  });

  return NextResponse.json({ ok: true });
}
