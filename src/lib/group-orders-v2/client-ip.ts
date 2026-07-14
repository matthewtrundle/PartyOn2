/**
 * Client IP resolution for the public dashboard-tracking endpoints.
 *
 * Prefers platform-set headers (Vercel writes x-real-ip and
 * x-vercel-forwarded-for at the edge) over the client-suppliable
 * x-forwarded-for, so rotating a forged XFF header can't mint unlimited
 * "unique visitors".
 */
import type { NextRequest } from 'next/server';

/** Resolve the caller's IP from the most trustworthy header available. */
export function clientIpFrom(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
