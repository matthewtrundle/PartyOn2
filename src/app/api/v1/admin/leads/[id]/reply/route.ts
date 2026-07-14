/**
 * POST /api/v1/admin/leads/[id]/reply — send a 1:1 email to a lead from the
 * board's composer.
 *
 * Flow: admin auth → lead has an email → suppression-respecting Resend send
 * (from/reply-to info@) → EmailLog (linked via metadata.leadId) → LeadEvent
 * (kind: email.reply) → last_contacted_at stamp → auto NEW→CONTACTED →
 * score recompute. 409s surface suppression to the composer.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { EmailType } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { sendEmailDetailed } from '@/lib/email/resend-client';
import { buildLeadReplyEmail } from '@/lib/email/templates/lead-reply';
import {
  enrollLeadIfEligible,
  recomputeLeadScore,
  transitionStage,
} from '@/lib/leads/pipeline';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REPLY_FROM_EMAIL = 'info@partyondelivery.com';

const bodySchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
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

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
  }
  if (!lead.email) {
    return NextResponse.json(
      { success: false, error: 'lead_has_no_email' },
      { status: 409 },
    );
  }

  const senderName = lead.owner || 'Allan';
  const email = buildLeadReplyEmail({
    subject: input.subject,
    body: input.body,
    senderName,
  });

  const result = await sendEmailDetailed({
    to: lead.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    type: EmailType.LEAD_REPLY,
    metadata: { leadId: lead.id },
    from: { email: REPLY_FROM_EMAIL, name: `${senderName} at Party On Delivery` },
    replyTo: REPLY_FROM_EMAIL,
    respectSuppression: true,
  });

  if (result.suppressed) {
    return NextResponse.json(
      { success: false, error: 'recipient_suppressed' },
      { status: 409 },
    );
  }
  if (!result.sent) {
    return NextResponse.json(
      { success: false, error: result.error ?? 'send_failed' },
      { status: 502 },
    );
  }

  // The email is OUT — a bookkeeping failure past this point must return
  // success anyway, or the composer's "try again" would double-send the
  // customer (review #11).
  try {
    const now = new Date();
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        type: 'CUSTOM',
        metadata: {
          kind: 'email.reply',
          emailLogId: result.emailLogId,
          subject: email.subject,
          sender: senderName,
        } as never,
      },
    });
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastContactedAt: now },
    });
    // Replying IS working the lead — a tray (off-board) lead gets a card
    // (review #12), and a reply from NEW starts the conversation.
    await enrollLeadIfEligible(lead.id, { allowPartial: true });
    await transitionStage(lead.id, 'CONTACTED', { via: 'reply', onlyFrom: ['NEW'] });
    await recomputeLeadScore(lead.id).catch(() => undefined);
  } catch (err) {
    console.error('[leads/reply] post-send bookkeeping failed (email WAS sent)', err);
  }

  return NextResponse.json({
    success: true,
    data: { emailLogId: result.emailLogId },
  });
}
