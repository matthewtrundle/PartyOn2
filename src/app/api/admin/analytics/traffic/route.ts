import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { getWebsiteInsights } from '@/lib/analytics/vercel-events';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics/traffic?days=30
 *
 * Site-wide server-side traffic from the Vercel log drain: human page views,
 * unique visitors, bot views and top pages. Unlike the GA4- and beacon-backed
 * numbers elsewhere in the hub, this is measured server-side, so it also counts
 * visitors who block JavaScript — and can separate bots from people.
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

  try {
    return NextResponse.json({ days, data: await getWebsiteInsights(days) });
  } catch (err) {
    console.error('[admin/analytics/traffic]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 });
  }
}
