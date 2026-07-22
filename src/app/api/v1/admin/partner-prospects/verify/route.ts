/**
 * POST /api/v1/admin/partner-prospects/verify
 *
 * Verify one prospect's email deliverability via ZeroBounce and store the
 * result on the row (email_verify_status / _raw / verified_at).
 *
 * Fail-closed: an 'unknown' answer, a timeout, or a vendor error returns
 * 502 and leaves the row UNTOUCHED — an outage can never flip an address
 * to sendable. Missing ZEROBOUNCE_API_KEY returns 501 so the UI can show
 * "verification unavailable".
 *
 * Body: { id: string }  (partner_prospects row id)
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import {
  getEmailVerifier,
  VerificationUnavailableError,
} from '@/lib/outreach/email-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const bodySchema = z.object({ id: z.string().min(1).max(64) });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_body' }, { status: 400 });
  }

  const prospect = await prisma.partnerProspect.findUnique({
    where: { id: body.id },
    select: { id: true, email: true },
  });
  if (!prospect) {
    return NextResponse.json({ success: false, error: 'not-found' }, { status: 404 });
  }
  if (!prospect.email) {
    return NextResponse.json({ success: false, error: 'no-email' }, { status: 400 });
  }

  const verifier = getEmailVerifier();
  if (!verifier) {
    return NextResponse.json(
      { success: false, error: 'verification-unavailable' },
      { status: 501 },
    );
  }

  try {
    const result = await verifier.verify(prospect.email);
    await prisma.partnerProspect.update({
      where: { id: prospect.id },
      data: {
        emailVerifyStatus: result.status,
        emailVerifiedAt: new Date(),
        emailVerifyRaw: result.raw,
      },
    });
    return NextResponse.json({ success: true, data: { id: prospect.id, status: result.status } });
  } catch (error) {
    if (error instanceof VerificationUnavailableError) {
      // Row untouched — previous status stands.
      return NextResponse.json({ success: false, error: error.message }, { status: 502 });
    }
    console.error('[Partner Prospect Verify] Error:', error);
    return NextResponse.json({ success: false, error: 'verify-failed' }, { status: 500 });
  }
}
