/**
 * Unified recommendation queue API.
 *
 * Phase 1C of the Operations Director (see docs/OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md §7).
 * Reads Marketing/SEO (RecommendationItem) + Operations (OperationsRecommendation)
 * and returns them in a single normalized shape for the shared queue UI at
 * /admin/recommendations.
 *
 * Per-domain create/transition endpoints remain at their old paths
 * (/api/admin/analytics/recommendations etc.). This endpoint is read-only
 * — the unified mutation entry points are [id]/execute, [id]/snooze,
 * [id]/dismiss in this same route group.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import {
  listUnifiedRecommendations,
  type DomainFilter,
} from '@/lib/recommendations/unified-list';
import type { RecommendationStatus } from '@/lib/recommendations/lifecycle';

export const dynamic = 'force-dynamic';

const DOMAINS: DomainFilter[] = ['all', 'marketing', 'seo', 'operations'];
const STATUSES: RecommendationStatus[] = [
  'open', 'approved', 'shipped', 'rejected', 'invalidated', 'snoozed',
];

function parseDomain(value: string | null): DomainFilter {
  if (!value) return 'all';
  return DOMAINS.includes(value as DomainFilter) ? (value as DomainFilter) : 'all';
}

function parseStatuses(value: string | null): RecommendationStatus[] | undefined {
  if (!value) return undefined;
  const requested = value.split(',').map((s) => s.trim());
  const valid = requested.filter((s): s is RecommendationStatus =>
    STATUSES.includes(s as RecommendationStatus)
  );
  return valid.length ? valid : undefined;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const sp = request.nextUrl.searchParams;
  const domain = parseDomain(sp.get('domain'));
  const status = parseStatuses(sp.get('status'));
  const limit = Math.min(500, Math.max(1, parseInt(sp.get('limit') ?? '250', 10)));

  const result = await listUnifiedRecommendations({ domain, status, limit });
  return NextResponse.json(result);
}
