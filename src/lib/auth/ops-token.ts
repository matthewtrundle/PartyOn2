/**
 * Ops Session Token — signing and verification only.
 *
 * Kept free of `next/headers` so it can be imported from middleware
 * (edge runtime) as well as route handlers. Cookie read/write lives in
 * ops-session.ts.
 */

import { SignJWT, jwtVerify } from 'jose';

export type OpsRole = 'admin' | 'employee';

export const OPS_SESSION_COOKIE = 'ops_session';

// 14 days per token, paired with sliding renewal in GET /api/ops/session:
// every app launch re-issues the cookie, so an operator who opens the
// installed PWA every couple of weeks never re-types the password. Renewal
// is NOT unlimited — `firstIat` (the original login time) is carried
// forward through every re-issue, and renewal is refused once the chain is
// older than SESSION_ABSOLUTE_MAX_S. Worst-case lifetime of a stolen token
// chain: 60d cap + one final 14d token. (Security review 2026-07-09.)
const TOKEN_EXPIRY = '14d';

/** Hard ceiling on a renewal chain — after this, the password is required. */
export const SESSION_ABSOLUTE_MAX_S = 60 * 24 * 60 * 60; // 60 days

export interface OpsSessionPayload {
  role: OpsRole;
  exp?: number;
  iat?: number;
  /** Unix seconds of the ORIGINAL password login this chain descends from. */
  firstIat?: number;
}

/** Age of the renewal chain in seconds (falls back to iat for old tokens). */
export function sessionChainAgeS(payload: OpsSessionPayload, nowMs: number = Date.now()): number {
  const origin = payload.firstIat ?? payload.iat;
  if (!origin) return Number.POSITIVE_INFINITY;
  return Math.floor(nowMs / 1000) - origin;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET or NEXTAUTH_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Create a JWT session token for ops. `firstIat` is passed on renewal to
 * preserve the chain origin; omitted on a fresh password login (the new
 * token becomes the chain origin itself).
 */
export async function createOpsSessionToken(
  role: OpsRole,
  firstIat?: number,
): Promise<string> {
  const chainOrigin = firstIat ?? Math.floor(Date.now() / 1000);
  return new SignJWT({ role, firstIat: chainOrigin } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getJwtSecret());
}

/**
 * Verify an ops session token
 */
export async function verifyOpsSessionToken(
  token: string
): Promise<OpsSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as OpsSessionPayload;
  } catch {
    return null;
  }
}
