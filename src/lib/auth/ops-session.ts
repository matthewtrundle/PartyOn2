/**
 * Ops Session Management
 * JWT-based auth for /ops and /api/ops routes
 *
 * Token signing/verification lives in ops-token.ts (edge-safe, used by
 * middleware too); this module owns the cookie and route-handler helpers.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  OPS_SESSION_COOKIE,
  createOpsSessionToken,
  verifyOpsSessionToken,
  type OpsRole,
  type OpsSessionPayload,
} from './ops-token';

export {
  OPS_SESSION_COOKIE,
  createOpsSessionToken,
  verifyOpsSessionToken,
  type OpsRole,
  type OpsSessionPayload,
};

/**
 * Set the ops session cookie. Pass `firstIat` when renewing so the chain
 * origin survives re-issues (see SESSION_ABSOLUTE_MAX_S in ops-token.ts).
 */
export async function setOpsSessionCookie(role: OpsRole, firstIat?: number): Promise<void> {
  const token = await createOpsSessionToken(role, firstIat);
  const cookieStore = await cookies();

  cookieStore.set(OPS_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 14, // 14 days — sliding via GET /api/ops/session
    path: '/',
  });
}

/**
 * Get current ops session from cookie
 */
export async function getOpsSession(): Promise<OpsSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(OPS_SESSION_COOKIE)?.value;

  if (!token) return null;
  return verifyOpsSessionToken(token);
}

/**
 * Clear the ops session cookie
 */
export async function clearOpsSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(OPS_SESSION_COOKIE);
}

/**
 * Require ops auth (any role). Returns session or 401 NextResponse.
 */
export async function requireOpsAuth(): Promise<OpsSessionPayload | NextResponse> {
  const session = await getOpsSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }
  return session;
}

/**
 * Require admin role. Returns session or 401/403 NextResponse.
 */
export async function requireAdminRole(): Promise<OpsSessionPayload | NextResponse> {
  const session = await getOpsSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }
  if (session.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Admin role required' },
      { status: 403 }
    );
  }
  return session;
}
