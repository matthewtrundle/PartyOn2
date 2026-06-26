/**
 * Game Plan strategy API — list + create.
 *   GET  /api/admin/strategy  — all active initiatives + linked director-rec summary
 *   POST /api/admin/strategy  — create an initiative
 *
 * /api/admin/** is NOT middleware-guarded, so each handler guards itself with
 * requireOpsAuth() (see saved memory `api_admin_not_middleware_guarded`).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { listInitiatives, createInitiative } from '@/lib/strategy/strategy-service';
import { createInitiativeSchema, type LinkedRecsSummary } from '@/lib/strategy/types';
import { listUnifiedRecommendations } from '@/lib/recommendations/unified-list';

const EMPTY_RECS: LinkedRecsSummary = {
  counts: { finance: 0, operations: 0, marketing: 0, seo: 0 },
  titles: { finance: [], operations: [], marketing: [], seo: [] },
};

/**
 * Read-only roll-up of open/approved director recommendations, grouped to the
 * domains an initiative can link to. Best-effort: if the rec subsystem errors,
 * the Game Plan page still loads with empty counts.
 */
async function loadLinkedRecs(): Promise<LinkedRecsSummary> {
  try {
    const res = await listUnifiedRecommendations({ status: ['open', 'approved'], limit: 250 });
    const pick = (domain: 'finance' | 'ops' | 'marketing' | 'seo'): string[] =>
      res.data
        .filter((r) => r.domain === domain)
        .slice(0, 3)
        .map((r) => r.title);
    return {
      counts: {
        finance: res.counts.finance,
        operations: res.counts.operations,
        marketing: res.counts.marketing,
        seo: res.counts.seo,
      },
      titles: {
        finance: pick('finance'),
        operations: pick('ops'), // card domain for operations recs is 'ops'
        marketing: pick('marketing'),
        seo: pick('seo'),
      },
    };
  } catch (error) {
    console.error('[strategy] failed to load linked recs:', error);
    return EMPTY_RECS;
  }
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    const [initiatives, recs] = await Promise.all([listInitiatives(), loadLinkedRecs()]);
    return NextResponse.json({ initiatives, recs });
  } catch (error) {
    console.error('[strategy] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load initiatives' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const data = createInitiativeSchema.parse(body);
    const created = await createInitiative(data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[strategy] POST failed:', error);
    return NextResponse.json({ error: 'Failed to create initiative' }, { status: 500 });
  }
}
