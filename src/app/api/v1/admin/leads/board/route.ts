/**
 * GET /api/v1/admin/leads/board — the Lead Flow Kanban payload.
 *
 * Under /api/v1/admin/** for the middleware session gate; requireAdminRole
 * in-route because leads are PII (the employee redirect is client-side only).
 * Runs the enroll sweep first so a freshly-submitted lead appears on open.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { getBoardData } from '@/lib/leads/board-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const filtersSchema = z.object({
  temp: z.enum(['hot', 'warm', 'cold']).optional(),
  occasion: z.string().max(60).optional(),
  source: z.string().max(60).optional(),
  q: z.string().max(120).optional(),
  showSnoozed: z.coerce.boolean().optional(),
  includePartial: z.coerce.boolean().optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;

  const parsed = filtersSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'invalid_filters' }, { status: 400 });
  }

  try {
    const data = await getBoardData(parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[admin/leads/board] failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to build board' },
      { status: 500 },
    );
  }
}
