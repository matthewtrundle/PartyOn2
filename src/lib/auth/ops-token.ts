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

const TOKEN_EXPIRY = '48h';

export interface OpsSessionPayload {
  role: OpsRole;
  exp?: number;
  iat?: number;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET or NEXTAUTH_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Create a JWT session token for ops
 */
export async function createOpsSessionToken(role: OpsRole): Promise<string> {
  return new SignJWT({ role } as unknown as Record<string, unknown>)
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
