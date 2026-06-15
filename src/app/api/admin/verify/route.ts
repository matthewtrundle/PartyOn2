import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { setOpsSessionCookie } from '@/lib/auth/ops-session';
import {
  getClientIp,
  checkLoginThrottle,
  recordFailedLogin,
  clearLoginThrottle,
} from '@/lib/auth/login-throttle';

export type AdminRole = 'admin' | 'employee';

interface AuthResult {
  success: boolean;
  role?: AdminRole;
  error?: string;
}

/**
 * Constant-time password comparison. Hashing both sides to a fixed 32-byte
 * digest lets us use timingSafeEqual (which requires equal-length buffers)
 * without leaking the password length, and avoids the early-exit timing of
 * plain `===`.
 */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Block brute-force before doing any work (read-only check)
  const throttle = await checkLoginThrottle(ip);
  if (!throttle.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Please wait a minute and try again.' } as AuthResult,
      { status: 429, headers: { 'Retry-After': String(60) } }
    );
  }

  try {
    const body = await request.json();
    const password = typeof body?.password === 'string' ? body.password : '';

    const adminPassword = process.env.ADMIN_PASSWORD;
    const employeePassword = process.env.EMPLOYEE_PASSWORD;

    // No valid password configured
    if (!adminPassword && !employeePassword) {
      console.error('No admin passwords configured in environment');
      return NextResponse.json(
        { success: false, error: 'Admin access not configured' } as AuthResult,
        { status: 500 }
      );
    }

    // Check admin password first
    if (adminPassword && safeEqual(password, adminPassword)) {
      await clearLoginThrottle(ip);
      await setOpsSessionCookie('admin');
      return NextResponse.json({ success: true, role: 'admin' as AdminRole } as AuthResult);
    }

    // Check employee password
    if (employeePassword && safeEqual(password, employeePassword)) {
      await clearLoginThrottle(ip);
      await setOpsSessionCookie('employee');
      return NextResponse.json({ success: true, role: 'employee' as AdminRole } as AuthResult);
    }

    // Wrong password — count this attempt against the IP
    await recordFailedLogin(ip);
    return NextResponse.json(
      { success: false, error: 'Invalid password' } as AuthResult,
      { status: 401 }
    );
  } catch (error) {
    console.error('Admin verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' } as AuthResult,
      { status: 500 }
    );
  }
}
