/**
 * GET    /api/ops/followups/suppressions — list the do-not-email rows.
 * POST   /api/ops/followups/suppressions — add one manually { email, note? }.
 * DELETE /api/ops/followups/suppressions — remove one { email } (admin may
 *        clear bounce/complaint rows — the public preferences page cannot).
 *
 * Ops-auth only. Full emails shown here (ops needs them to act on customer
 * requests); everywhere else in the dashboard they're masked.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { suppress, unsuppress } from '@/lib/followups/suppression';

const addSchema = z.object({
  email: z.string().email().max(320),
  note: z.string().max(500).optional(),
});

const removeSchema = z.object({
  email: z.string().email().max(320),
});

export async function GET() {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const suppressions = await prisma.emailSuppression.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ success: true, suppressions });
  } catch (error) {
    console.error('[ops/followups/suppressions GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load suppressions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = addSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
    }
    const result = await suppress(parsed.data.email, 'manual', 'admin', parsed.data.note);
    return NextResponse.json({ success: true, canceledJobs: result.canceledJobs });
  } catch (error) {
    console.error('[ops/followups/suppressions POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add suppression' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = removeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
    }
    const removed = await unsuppress(parsed.data.email, { allowHardReasons: true });
    if (!removed) {
      return NextResponse.json({ success: false, error: 'Not on the list' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ops/followups/suppressions DELETE] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove suppression' }, { status: 500 });
  }
}
