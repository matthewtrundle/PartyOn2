import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { getWebsiteInsights, getDailyTraffic } from '@/lib/analytics/vercel-events';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics/traffic?days=30[&include=daily]
 *
 * Site-wide server-side traffic from the Vercel log drain: human page views,
 * unique visitors, bot views and top pages. Unlike the GA4- and beacon-backed
 * numbers elsewhere in the hub, this is measured server-side, so it also counts
 * visitors who block JavaScript — and can separate bots from people.
 *
 * `include=daily` adds a `daily` field: per-day human/bot counts (Central-time
 * buckets, zero-filled) for trend charts. Off by default so callers that only
 * want the headline figures don't pay for the extra query.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Admin-only, not merely ops: /admin/analytics is an admin surface in
  // nav-config, but that gate is a client-side redirect — an employee session
  // could otherwise call this route directly.
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;

  // Math.max/min propagate NaN, so a non-numeric ?days= would otherwise reach
  // getWebsiteInsights as NaN and build an Invalid Date, failing the query.
  const requested = parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10);
  const days = Number.isFinite(requested) ? Math.max(1, Math.min(90, requested)) : 30;
  const wantDaily = request.nextUrl.searchParams.get('include') === 'daily';

  try {
    const [data, daily] = await Promise.all([
      getWebsiteInsights(days),
      wantDaily ? getDailyTraffic(days) : Promise.resolve(undefined),
    ]);
    return NextResponse.json(daily ? { days, data, daily } : { days, data });
  } catch (err) {
    console.error('[admin/analytics/traffic]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 });
  }
}
