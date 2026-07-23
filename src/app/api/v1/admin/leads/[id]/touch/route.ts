/**
 * POST /api/v1/admin/leads/[id]/touch — log an outreach attempt (call or
 * text) made off-board, so the card's touch count + "last touched" reflect
 * real persistence and the red "reply needed" tag clears.
 *
 * Mirrors the reply route's bookkeeping minus the email: LeadEvent
 * (kind: outreach.logged) → last_contacted_at stamp → auto NEW→CONTACTED →
 * score recompute. Stage writes go through transitionStage (its $transaction
 * + audit hold); the recompute stays outside it (the #245 invariant).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { requireAdminRole } from '@/lib/auth/ops-session';
import {
  enrollLeadIfEligible,
  recomputeLeadScore,
  transitionStage,
} from '@/lib/leads/pipeline';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({
  channel: z.enum(['call', 'text', 'email']),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_body' }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
  if (!lead) {
    return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
  }

  const now = new Date();
  await prisma.leadEvent.create({
    data: {
      leadId: lead.id,
      type: 'CUSTOM',
      metadata: { kind: 'outreach.logged', channel: input.channel } as never,
    },
  });
  // Logging an attempt IS contacting the lead — clears the reply flag and
  // starts the conversation clock (same as an email reply).
  await prisma.lead.update({ where: { id: lead.id }, data: { lastContactedAt: now } });
  await enrollLeadIfEligible(lead.id, { allowPartial: true });
  await transitionStage(lead.id, 'CONTACTED', { via: 'touch', onlyFrom: ['NEW'] });
  await recomputeLeadScore(lead.id).catch(() => undefined);

  return NextResponse.json({ success: true, data: { channel: input.channel } });
}
