/**
 * PATCH /api/v1/admin/partner-prospects/[id]
 *
 * Prospect row edits. PR2 scope: email only — editing (or clearing) the
 * email RESETS verification state (status → UNVERIFIED, raw/verified_at
 * cleared, catch-all override cleared), because a verification verdict
 * belongs to the exact address it was run against.
 *
 * Later PRs extend this route with draft edits + approve/unapprove/
 * request-redraft actions.
 *
 * Body: { email: string | null }
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320).nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { success: false, error: 'invalid_body ({ email: string | null })' },
      { status: 400 },
    );
  }

  const existing = await prisma.partnerProspect.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: 'not-found' }, { status: 404 });
  }

  const updated = await prisma.partnerProspect.update({
    where: { id },
    data: {
      email: body.email,
      // A verdict belongs to the address it was run against — reset all of it.
      emailVerifyStatus: 'UNVERIFIED',
      emailVerifiedAt: null,
      emailVerifyRaw: Prisma.DbNull,
      emailVerifyOverride: false,
      emailVerifyOverriddenBy: null,
    },
    select: { id: true, email: true, emailVerifyStatus: true },
  });

  return NextResponse.json({ success: true, data: updated });
}
