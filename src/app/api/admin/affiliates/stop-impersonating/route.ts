/**
 * POST /api/admin/affiliates/stop-impersonating
 * Clears the affiliate session and impersonation cookies, returning admin to their context.
 */

import { NextResponse } from 'next/server';
import { clearAffiliateSessionCookie } from '@/lib/affiliates/affiliate-session';
import { cookies } from 'next/headers';
import { requireOpsAuth } from '@/lib/auth/ops-session';

export async function POST(): Promise<NextResponse> {
  // Only a logged-in operator can stop impersonating. The ops_session cookie
  // is set at login and persists through impersonation (the impersonate route
  // only ADDS affiliate_session + admin_impersonating), so requireOpsAuth
  // still passes for the un-impersonate round trip — and never locks the
  // operator out of the exit hatch.
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  await clearAffiliateSessionCookie();

  const cookieStore = await cookies();
  cookieStore.delete('admin_impersonating');

  return NextResponse.json({ success: true });
}
