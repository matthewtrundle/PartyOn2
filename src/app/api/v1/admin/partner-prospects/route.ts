/**
 * GET /api/v1/admin/partner-prospects
 *
 * Prospect list for the workbench, with optional filters:
 *   ?vertical=str|bartender|venue   ?city=Austin
 *
 * Rows come straight from the prospect store (partner_prospects) — status
 * chips are derived client-side from these columns plus the campaign map
 * served by GET /partner-prospects/sync.
 *
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { listProspects } from '@/lib/partners/prospect-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    const params = request.nextUrl.searchParams;
    const vertical = params.get('vertical') ?? undefined;
    const city = params.get('city') ?? undefined;
    const prospects = await listProspects({ vertical, city });
    return NextResponse.json({ success: true, data: { prospects } });
  } catch (error) {
    console.error('[Partner Prospects] list error:', error);
    return NextResponse.json({ success: false, error: 'list-failed' }, { status: 500 });
  }
}
