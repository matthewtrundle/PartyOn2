/**
 * POST /api/admin/recommendations/[id]/execute
 *
 * Run the inline action attached to a rec card.
 *
 *   navigate payloads — log the click, bump status open→approved, return 200.
 *                       The client handles the actual router.push.
 *
 *   apiCall payloads  — dispatch to a registered in-process mutation. The
 *                       dispatcher is open for new kinds; today only the
 *                       `reconcile-pack` path is wired. Other apiCall paths
 *                       still return 501 with a clear message.
 *
 * See docs/OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md §7 Phase 1C and 1C-b.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import {
  findRecommendationLocation,
  isExecutableStatus,
} from '@/lib/recommendations/unified-list';
import { applyStatusUpdate, logAction } from '@/lib/recommendations/mutation-helpers';
import type { ActionPayload } from '@/lib/recommendations/card-types';
import { reconcilePackForOrder } from '@/lib/operations/reconcile-pack';

export const dynamic = 'force-dynamic';

interface DispatchResult {
  status: number;
  body: Record<string, unknown>;
  result: 'success' | 'error' | 'not_implemented';
  errorMessage?: string;
}

/**
 * Direct-action dispatcher for apiCall payloads. Each path lives as one
 * branch so adding a new ops mutation is one case + one helper, nothing
 * else. The detector's `params.path` is the dispatch key — keeps the rec
 * payload self-describing.
 */
async function dispatchApiCall(payload: ActionPayload): Promise<DispatchResult> {
  const path = typeof payload.params.path === 'string' ? payload.params.path : '';
  const body = (payload.params.body && typeof payload.params.body === 'object'
    ? payload.params.body
    : {}) as Record<string, unknown>;

  if (path === '/api/admin/operations/recommendations/reconcile-pack') {
    const orderId = typeof body.orderId === 'string' ? body.orderId : null;
    if (!orderId) {
      return {
        status: 400,
        body: { error: 'bad_request', message: 'orderId required' },
        result: 'error',
        errorMessage: 'orderId required',
      };
    }
    try {
      const result = await reconcilePackForOrder(orderId);
      return {
        status: 200,
        body: { ok: true, result },
        result: 'success',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        status: 500,
        body: { error: 'reconcile_failed', message },
        result: 'error',
        errorMessage: message,
      };
    }
  }

  // TODO(phase 1C-c+): the remaining ops mutation paths require operator
  // input (counted N, parsed line confirmations) so they stay navigate-only:
  //   - /api/v1/inventory  (operation=adjust)              needs counted N
  //   - /api/v1/inventory/notes/[id]/apply                 needs parsed-row review
  //   - /api/v1/inventory/receiving/[id]/apply             needs parsed-row review
  // Surface them with a clear message rather than a silent 501.
  const message =
    `Direct-action button for "${path}" not implemented — this rec deep-links you to the page where you can act.`;
  return {
    status: 501,
    body: { error: 'not_implemented', path, message },
    result: 'not_implemented',
    errorMessage: message,
  };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const location = await findRecommendationLocation(id);
  if (!location) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!isExecutableStatus(location.status)) {
    return NextResponse.json(
      { error: 'invalid_status', message: `Rec is ${location.status} — cannot execute.` },
      { status: 409 }
    );
  }

  const payload = await loadActionPayload(id, location.domain);
  if (!payload) {
    return NextResponse.json(
      { error: 'no_action', message: 'This rec has no inline action attached.' },
      { status: 400 }
    );
  }

  const label = payload.label ?? payload.kind;

  if (payload.kind === 'navigate') {
    if (location.status === 'open') {
      await applyStatusUpdate(id, location.domain, location.status, { status: 'approved' });
    }
    await logAction(id, location.domain, {
      actionKind: payload.kind,
      actionLabel: label,
      result: 'navigated',
    });
    const href = typeof payload.params.href === 'string' ? payload.params.href : null;
    return NextResponse.json({ ok: true, result: 'navigated', href });
  }

  if (payload.kind === 'apiCall') {
    const dispatch = await dispatchApiCall(payload);
    await logAction(id, location.domain, {
      actionKind: payload.kind,
      actionLabel: label,
      result: dispatch.result,
      errorMessage: dispatch.errorMessage,
    });
    // On success bump status to shipped so the rec leaves the active queue.
    // The lifecycle requires open → approved → shipped, so step through
    // approved when starting from open. Best-effort — the mutation already
    // landed in the DB; a status hiccup shouldn't fail the response.
    if (dispatch.result === 'success') {
      try {
        if (location.status === 'open') {
          await applyStatusUpdate(id, location.domain, 'open', { status: 'approved' });
          await applyStatusUpdate(id, location.domain, 'approved', { status: 'shipped' });
        } else if (location.status === 'approved') {
          await applyStatusUpdate(id, location.domain, 'approved', { status: 'shipped' });
        }
      } catch (err) {
        console.warn('[execute] status transition after success failed:', err);
      }
    }
    return NextResponse.json(dispatch.body, { status: dispatch.status });
  }

  return NextResponse.json(
    { error: 'unknown_action_kind', kind: payload.kind },
    { status: 400 }
  );
}

async function loadActionPayload(
  id: string,
  domain: 'ops' | 'marketing-seo'
): Promise<ActionPayload | null> {
  if (domain === 'ops') {
    const row = await prisma.operationsRecommendation.findUnique({
      where: { id },
      select: { actionPayload: true },
    });
    const raw = row?.actionPayload;
    if (!raw || typeof raw !== 'object') return null;
    return raw as unknown as ActionPayload;
  }
  // Marketing recs are advisory — no inline action in Phase 1C.
  return null;
}
