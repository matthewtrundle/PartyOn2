/**
 * POST /api/admin/affiliates/stop-impersonating
 * Clears the affiliate session and impersonation cookies, returning admin to their context.
 */

import { NextResponse } from 'next/server';
import { clearAffiliateSessionCookie } from '@/lib/affiliates/affiliate-session';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { cookies } from 'next/headers';

export async function POST(): Promise<NextResponse> {
  // Only a logged-in operator can stop impersonating. The ops_session cookie
  // is set when the admin starts impersonating and persists through it (the
  // impersonate route only ADDS affiliate_session + admin_impersonating), so
  // this check passes for the un-impersonate round trip.
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  await clearAffiliateSessionCookie();

  const cookieStore = await cookies();
  cookieStore.delete('admin_impersonating');

  return NextResponse.json({ success: true });
}
