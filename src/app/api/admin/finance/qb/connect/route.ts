/**
 * GET /api/admin/finance/qb/connect
 *
 * Returns `{ authUrl }` — the Intuit authorization URL the admin page should
 * redirect the browser to. CSRF state is a random token stashed in a
 * short-lived httpOnly cookie; the callback compares it.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { getAuthorizationUri } from '@/lib/finance/qb-client';

const STATE_COOKIE = 'intuit_oauth_state';
const STATE_MAX_AGE_SECONDS = 10 * 60; // 10 min

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const state = randomBytes(24).toString('hex');
    const authUrl = getAuthorizationUri(state);

    const cookieStore = await cookies();
    cookieStore.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_MAX_AGE_SECONDS,
      path: '/',
    });

    return NextResponse.json({ success: true, data: { authUrl } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[QB Connect] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
