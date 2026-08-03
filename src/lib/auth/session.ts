/**
 * Session Management
 * Handles JWT tokens and session cookies
 */

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { SafeCustomer } from './auth-service';

/**
 * Session cookie name
 */
const SESSION_COOKIE = 'auth_session';

/**
 * JWT secret (should be in environment variable)
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET or NEXTAUTH_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Token expiry time
 */
const TOKEN_EXPIRY = '7d'; // 7 days

/**
 * Session payload
 */
export interface SessionPayload {
  customerId: string;
  email: string;
  emailVerified: boolean;
  ageVerified: boolean;
  exp?: number;
  iat?: number;
}

/**
 * Create a JWT session token
 */
export async function createSessionToken(customer: SafeCustomer): Promise<string> {
  const payload: SessionPayload = {
    customerId: customer.id,
    email: customer.email,
    emailVerified: customer.emailVerified,
    ageVerified: customer.ageVerified,
  };

  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getJwtSecret());

  return token;
}

/**
 * Verify a session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    // Pin the algorithm so a future swap to a KeyLike/JWK can't silently
    // widen what is accepted.
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Set session cookie
 */
export async function setSessionCookie(customer: SafeCustomer): Promise<void> {
  const token = await createSessionToken(customer);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Get current session from cookie
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

/**
 * Require authentication - throws if not logged in
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}

/**
 * Require age verification - throws if not verified
 */
export async function requireAgeVerification(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (!session.ageVerified) {
    throw new Error('Age verification required');
  }
  return session;
}
