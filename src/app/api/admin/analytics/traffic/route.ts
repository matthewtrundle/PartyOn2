import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
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
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const days = Math.max(1, Math.min(90, parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10)));

  try {
    return NextResponse.json({ days, data: await getWebsiteInsights(days) });
  } catch (err) {
    console.error('[admin/analytics/traffic]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 });
  }
}
