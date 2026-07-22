/**
 * PATCH /api/v1/admin/partner-prospects/[id]
 *
 * Prospect row edits + workflow actions:
 *   - { email }                       — edit/clear the email; RESETS all
 *     verification state (a verdict belongs to the address it ran against)
 *   - { draft: { subject?, ... } }    — edit draft copy; an APPROVED draft
 *     drops back to DRAFTED (edits un-approve — re-review before send)
 *   - { action: 'approve' }           — requires a complete draft
 *   - { action: 'unapprove' }
 *   - { action: 'toggle-verify-override' } — CATCH_ALL rows only; lets the
 *     operator accept a catch-all address for sending (PR6 gate)
 *   - { action: 'request-redraft', guidance? } — flips draft to NONE and
 *     stores the note; the next drafting session picks these up first
 *
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const draftEditSchema = z
  .object({
    subject: z.string().trim().max(200).optional(),
    altSubject: z.string().trim().max(200).optional(),
    body: z.string().max(5000).optional(),
    followUpBody: z.string().max(5000).optional(),
    touch3Body: z.string().max(5000).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'empty draft edit' });

const bodySchema = z.union([
  z.object({ email: z.string().trim().toLowerCase().email().max(320).nullable() }),
  z.object({ draft: draftEditSchema }),
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('unapprove') }),
  z.object({ action: z.literal('toggle-verify-override') }),
  z.object({
    action: z.literal('request-redraft'),
    guidance: z.string().trim().max(2000).optional(),
  }),
]);

const RESULT_SELECT = {
  id: true,
  email: true,
  emailVerifyStatus: true,
  emailVerifyOverride: true,
  draftStatus: true,
  draftRedoGuidance: true,
} as const;

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
    return NextResponse.json({ success: false, error: 'invalid_body' }, { status: 400 });
  }

  const existing = await prisma.partnerProspect.findUnique({
    where: { id },
    select: {
      id: true,
      draftStatus: true,
      draftSubject: true,
      draftBody: true,
      emailVerifyStatus: true,
      emailVerifyOverride: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: 'not-found' }, { status: 404 });
  }

  if ('email' in body) {
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
      select: RESULT_SELECT,
    });
    return NextResponse.json({ success: true, data: updated });
  }

  if ('draft' in body) {
    const updated = await prisma.partnerProspect.update({
      where: { id },
      data: {
        ...(body.draft.subject !== undefined ? { draftSubject: body.draft.subject } : {}),
        ...(body.draft.altSubject !== undefined ? { draftAltSubject: body.draft.altSubject } : {}),
        ...(body.draft.body !== undefined ? { draftBody: body.draft.body } : {}),
        ...(body.draft.followUpBody !== undefined
          ? { draftFollowUpBody: body.draft.followUpBody }
          : {}),
        ...(body.draft.touch3Body !== undefined ? { draftTouch3Body: body.draft.touch3Body } : {}),
        // Edits un-approve — a human re-reviews exactly what will send.
        draftStatus: 'DRAFTED',
        draftApprovedAt: null,
        draftApprovedBy: null,
      },
      select: RESULT_SELECT,
    });
    return NextResponse.json({ success: true, data: updated });
  }

  switch (body.action) {
    case 'approve': {
      if (!existing.draftSubject || !existing.draftBody) {
        return NextResponse.json({ success: false, error: 'no-draft-to-approve' }, { status: 400 });
      }
      const updated = await prisma.partnerProspect.update({
        where: { id },
        data: {
          draftStatus: 'APPROVED',
          draftApprovedAt: new Date(),
          draftApprovedBy: auth.role,
        },
        select: RESULT_SELECT,
      });
      return NextResponse.json({ success: true, data: updated });
    }
    case 'unapprove': {
      const updated = await prisma.partnerProspect.update({
        where: { id },
        data: { draftStatus: 'DRAFTED', draftApprovedAt: null, draftApprovedBy: null },
        select: RESULT_SELECT,
      });
      return NextResponse.json({ success: true, data: updated });
    }
    case 'toggle-verify-override': {
      if (existing.emailVerifyStatus !== 'CATCH_ALL') {
        return NextResponse.json(
          { success: false, error: 'override-only-for-catch-all' },
          { status: 400 },
        );
      }
      const next = !existing.emailVerifyOverride;
      const updated = await prisma.partnerProspect.update({
        where: { id },
        data: {
          emailVerifyOverride: next,
          emailVerifyOverriddenBy: next ? auth.role : null,
        },
        select: RESULT_SELECT,
      });
      return NextResponse.json({ success: true, data: updated });
    }
    case 'request-redraft': {
      const updated = await prisma.partnerProspect.update({
        where: { id },
        data: {
          draftStatus: 'NONE',
          draftRedoGuidance: body.guidance ?? null,
          draftApprovedAt: null,
          draftApprovedBy: null,
        },
        select: RESULT_SELECT,
      });
      return NextResponse.json({ success: true, data: updated });
    }
  }
}
