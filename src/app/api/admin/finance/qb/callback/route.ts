/**
 * GET /api/admin/finance/qb/callback
 *
 * Intuit redirects here after the operator approves the OAuth consent screen.
 * Validates the CSRF state cookie, exchanges the auth code for tokens,
 * persists them, then redirects back to the connect page with a status flag.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { exchangeAuthCode } from '@/lib/finance/qb-client';

const STATE_COOKIE = 'intuit_oauth_state';

function redirectTo(request: NextRequest, status: string): NextResponse {
  const url = new URL('/admin/finance/connect-quickbooks', request.url);
  url.searchParams.set('status', status);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const params = request.nextUrl.searchParams;
    const incomingState = params.get('state');
    const code = params.get('code');
    const realmId = params.get('realmId');
    const oauthError = params.get('error');

    if (oauthError) {
      console.error('[QB Callback] Intuit returned error:', oauthError);
      return redirectTo(request, `error:${oauthError}`);
    }
    if (!code || !realmId || !incomingState) {
      return redirectTo(request, 'error:missing_params');
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get(STATE_COOKIE)?.value;
    if (!storedState || storedState !== incomingState) {
      return redirectTo(request, 'error:state_mismatch');
    }
    cookieStore.delete(STATE_COOKIE);

    await exchangeAuthCode(request.url);
    return redirectTo(request, 'connected');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[QB Callback] Error:', message);
    return redirectTo(request, `error:exception`);
  }
}
