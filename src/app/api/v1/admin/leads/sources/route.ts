/**
 * GET /api/v1/admin/leads/sources — true per-form and per-channel totals.
 *
 * Deliberately NOT built on getBoardData: that runs the enrol sweep (a write)
 * on every GET and only reads the top 500 leads by score, so anything derived
 * from it is a slice rather than a total. This route is strictly read-only and
 * reads the whole table.
 *
 * Same auth as the rest of /api/v1/admin/leads/**: the middleware session gate
 * plus requireAdminRole in-route, because leads are PII.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import {
  buildSourcesReport,
  type BuyerRow,
  type SourceReportLead,
} from '@/lib/leads/sources-report';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Ceiling on rows read in one report — see the `take` below. */
const MAX_REPORT_LEADS = 20_000;

const querySchema = z.object({
  /** Absent = all time. Capped at two years. */
  days: z.coerce.number().int().min(1).max(730).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;

  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'invalid_query' }, { status: 400 });
  }
  const days = parsed.data.days ?? null;
  const since = days ? new Date(Date.now() - days * 86_400_000) : null;

  try {
    const [leads, buyerRows] = await Promise.all([
      prisma.lead.findMany({
        where: since ? { createdAt: { gte: since } } : undefined,
        // Unbounded in principle, and the collapse is quadratic in distinct
        // addresses, so keep a ceiling well above the real table (~700 rows)
        // rather than none at all. Newest first so a truncated report is the
        // recent picture, not an arbitrary slice.
        take: MAX_REPORT_LEADS,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          status: true,
          sourceWidget: true,
          utmMedium: true,
          metadata: true,
          affiliateId: true,
          pipelineStage: true,
          createdAt: true,
        },
      }),
      // The buyer identity set, once. A correlated per-lead join would be a
      // query per lead; this is one pass over a much smaller table.
      prisma.$queryRaw<Array<{ email: string; first_paid_at: Date }>>`
        SELECT LOWER(customer_email) AS email, MIN(created_at) AS first_paid_at
        FROM orders
        WHERE customer_email IS NOT NULL
          AND financial_status IN ('PAID', 'PARTIALLY_REFUNDED')
        GROUP BY LOWER(customer_email)
      `,
    ]);

    const buyers: BuyerRow[] = buyerRows.map((b) => ({
      email: b.email,
      firstPaidAt: new Date(b.first_paid_at),
    }));

    // No `as unknown as` — a plain widening assignment still type-checks the
    // selected shape against the DTO, so a schema change that drops a field
    // this report depends on fails the build instead of failing at runtime.
    const rows: SourceReportLead[] = leads;
    const report = buildSourcesReport(rows, buyers, days);
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('[admin/leads/sources] failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to build sources report' },
      { status: 500 },
    );
  }
}
