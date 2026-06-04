/**
 * POST /api/admin/finance/plaid/link-token
 *
 * Returns a Plaid link_token the browser-side Plaid Link SDK uses to launch
 * the institution-picker UI. Per Plaid recs, link_tokens are short-lived
 * (30 min) so the connect page fetches a fresh one on mount.
 */

import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { createLinkToken } from '@/lib/finance/plaid-client';

export async function POST(): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const linkToken = await createLinkToken(`ops-${auth.role}`);
    return NextResponse.json({ success: true, data: { linkToken } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Plaid Link Token] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
