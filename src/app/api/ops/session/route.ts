import { NextRequest, NextResponse } from 'next/server';
import { getOpsSession, setOpsSessionCookie } from '@/lib/auth/ops-session';
import { SESSION_ABSOLUTE_MAX_S, sessionChainAgeS } from '@/lib/auth/ops-token';

/**
 * GET /api/ops/session
 * Check if the ops_session cookie is still valid. Used by the HQ shell to
 * restore auth on app launch / browser restart.
 *
 * Sliding renewal (security-reviewed 2026-07-09):
 * - only when the shell explicitly asks (x-hq-renew header) — a bare
 *   cross-site GET/navigation can check status but never mints a cookie
 * - only while the renewal chain is younger than SESSION_ABSOLUTE_MAX_S;
 *   past the ceiling the current token simply runs out its remaining ≤14d
 *   and the password is required again
 * - `firstIat` (original login time) is carried through every re-issue so
 *   the ceiling cannot be reset by renewing
 */
export async function GET(request: NextRequest) {
  const session = await getOpsSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  const wantsRenewal = request.headers.get('x-hq-renew') === '1';
  const chainAge = sessionChainAgeS(session);
  if (wantsRenewal && chainAge < SESSION_ABSOLUTE_MAX_S) {
    await setOpsSessionCookie(session.role, session.firstIat ?? session.iat);
  }

  return NextResponse.json({ authenticated: true, role: session.role });
}
