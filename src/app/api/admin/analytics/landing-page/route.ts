import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { getLandingPagePayload } from '@/lib/analytics/landing-page-metrics';
import { LANDING_PAGE_KEYS } from '@/lib/analytics/landing-pages';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  page: z.enum(LANDING_PAGE_KEYS as [string, ...string[]]),
  period: z.enum(['7d', '30d', '90d']).default('30d'),
  granularity: z.enum(['day', 'week', 'month']).default('day'),
});

/**
 * GET /api/admin/analytics/landing-page?page=<key>&period=7d|30d|90d&granularity=day|week|month
 *
 * Returns the combined per-landing-page payload (traffic, CTA clicks,
 * engagement, conversion) for the hub. Ops-auth gated.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const sp = request.nextUrl.searchParams;
  const parsed = QuerySchema.safeParse({
    page: sp.get('page') ?? undefined,
    period: sp.get('period') ?? undefined,
    granularity: sp.get('granularity') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid query', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { page, period, granularity } = parsed.data;

  try {
    const data = await getLandingPagePayload(
      page as Parameters<typeof getLandingPagePayload>[0],
      period,
      granularity
    );
    return NextResponse.json({ data });
  } catch (err) {
    // Log the detail server-side; return a generic message so DB/internal error
    // text never reaches the client.
    console.error('[admin/analytics/landing-page]', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
