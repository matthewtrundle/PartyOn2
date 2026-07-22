/**
 * GET /api/v1/admin/premiere-credits
 *
 * List Premiere credit grants with live redemption info + invoice totals.
 * Query params: status, redeemed ('true'|'false'), from, to (ISO dates that
 * filter on the redemption date — the invoice view). Middleware gates
 * /api/v1/admin/*; this read also requires an admin-role session inline
 * (matches the admin-only nav placement — the list contains customer PII).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { listGrants } from '@/lib/premiere-credits/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;

  const sp = request.nextUrl.searchParams;
  try {
    const result = await listGrants({
      status: sp.get('status'),
      redeemed: sp.get('redeemed'),
      from: sp.get('from'),
      to: sp.get('to'),
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[premiere-credits admin] list failed:', error);
    return NextResponse.json({ success: false, error: 'failed to list grants' }, { status: 500 });
  }
}
