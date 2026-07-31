/**
 * Resend Webhook Handler
 *
 * POST /api/webhooks/resend - Receive Resend email lifecycle events
 *
 * Events handled:
 * - email.sent - Email accepted by recipient server
 * - email.delivered - Email delivered to inbox
 * - email.opened - Recipient opened the email
 * - email.bounced - Email bounced
 * - email.complained - Recipient marked as spam
 * - email.delivery_delayed - Delivery temporarily delayed
 */

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { prisma } from '@/lib/database/client';
import { EmailStatus } from '@prisma/client';
import { suppress } from '@/lib/followups/suppression';
import { formatBounceReason, type ResendBounceInfo } from '@/lib/email/bounce-reason';

interface ResendWebhookData {
  created_at: string;
  email_id: string;
  from: string;
  to: string[];
  subject: string;
  /** Present on email.bounced — why the receiving server rejected it. */
  bounce?: ResendBounceInfo;
}

const EVENT_STATUS_MAP: Record<string, EmailStatus> = {
  'email.sent': EmailStatus.SENT,
  'email.delivered': EmailStatus.DELIVERED,
  'email.opened': EmailStatus.OPENED,
  'email.bounced': EmailStatus.BOUNCED,
  'email.complained': EmailStatus.COMPLAINED,
};

const EVENT_TIMESTAMP_FIELD: Record<string, string> = {
  'email.sent': 'sentAt',
  'email.delivered': 'deliveredAt',
  'email.opened': 'openedAt',
  'email.bounced': 'bouncedAt',
  'email.complained': 'complainedAt',
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Resend Webhook] RESEND_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const body = await request.text();

    // Verify signature using svix
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('[Resend Webhook] Missing svix headers');
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 });
    }

    const wh = new Webhook(webhookSecret);
    let payload: { type: string; data: ResendWebhookData };

    try {
      payload = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as { type: string; data: ResendWebhookData };
    } catch (err) {
      console.error('[Resend Webhook] Signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const { type, data } = payload;
    const resendId = data.email_id;

    console.log('[Resend Webhook] Received:', type, resendId);

    // Look up the email log by resendId
    const emailLog = await prisma.emailLog.findFirst({
      where: { resendId },
    });

    if (!emailLog) {
      // Unknown email -- don't trigger retries
      console.log('[Resend Webhook] No email log found for resendId:', resendId);
      return NextResponse.json({ received: true });
    }

    // Map event type to status and timestamp field
    const newStatus = EVENT_STATUS_MAP[type];
    const timestampField = EVENT_TIMESTAMP_FIELD[type];

    if (newStatus && timestampField) {
      // Bounce reason → errorMessage so the ops UIs can say WHY it bounced.
      // (Resend also emits `email.failed` with a reason; that event is not
      // handled here yet — see EVENT_STATUS_MAP.)
      const bounceReason = type === 'email.bounced' ? formatBounceReason(data.bounce) : null;
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: newStatus,
          [timestampField]: new Date(data.created_at),
          ...(bounceReason ? { errorMessage: bounceReason } : {}),
        },
      });

      console.log('[Resend Webhook] Updated email log:', emailLog.id, '->', newStatus);

      // Auto-suppress on delivery problems: add the address to the follow-up
      // suppression list and cancel its scheduled follow-up jobs. Idempotent,
      // so webhook re-delivery is safe. Transactional email is unaffected —
      // only the follow-up engine consults the suppression list.
      if (type === 'email.bounced' || type === 'email.complained') {
        const reason = type === 'email.bounced' ? 'bounce' : 'complaint';
        const result = await suppress(emailLog.to, reason, 'resend-webhook', `resendId=${resendId}`);
        console.log(
          '[Resend Webhook] Suppressed', emailLog.to, `(${reason});`,
          'canceled', result.canceledJobs, 'scheduled follow-up job(s)'
        );
      }
    } else {
      // delivery_delayed or unknown -- log but don't update status
      console.log('[Resend Webhook] Unhandled event type:', type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Resend Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
