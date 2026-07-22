/**
 * POST /api/ops/followups/test-send — render a journey step with sample
 * payload and send it immediately to the given address, [TEST]-prefixed.
 * Bypasses feature flags and the send window (explicit ops action) but NOT
 * the suppression list.
 *
 * Ops-auth only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EmailType, type FollowUpJob } from '@prisma/client';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { sendEmailDetailed } from '@/lib/email/resend-client';
import { getJourney, JOURNEY_KEYS } from '@/lib/followups/journeys';
import { getFollowUpCopyOverrides } from '@/lib/followups/copy-overrides';
import { buildPreferencesUrl, normalizeEmail } from '@/lib/followups/suppression';
import { SITE_BASE_URL } from '@/lib/followups/types';

const bodySchema = z.object({
  journeyKey: z.enum(JOURNEY_KEYS as [string, ...string[]]),
  step: z.number().int().min(1).max(2).default(1),
  email: z.string().email().max(320),
});

const SAMPLE_PAYLOAD: Record<string, unknown> = {
  firstName: 'Allan',
  guestCount: '25',
  resumePath: '/order',
  deliveryDate: 'Saturday, July 18',
  invoicePath: '/invoice/sample-token',
  businessName: 'Sample Rentals LLC',
};

export async function POST(request: NextRequest) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  if (!process.env.UNSUBSCRIBE_SECRET || !process.env.FOLLOWUP_FROM_EMAIL) {
    return NextResponse.json(
      { success: false, error: 'UNSUBSCRIBE_SECRET / FOLLOWUP_FROM_EMAIL not configured' },
      { status: 500 }
    );
  }

  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
    }
    const { journeyKey, step, email } = parsed.data;
    const journey = getJourney(journeyKey);
    const stepDef = journey?.steps[step - 1];
    if (!journey || !stepDef) {
      return NextResponse.json({ success: false, error: 'No such journey step' }, { status: 400 });
    }

    const to = normalizeEmail(email);
    const fakeJob = {
      id: 'test-send',
      journeyKey,
      step,
      email: to,
      dedupeKey: `${journeyKey}:${step}:test-send`,
      payload: SAMPLE_PAYLOAD,
    } as unknown as FollowUpJob;

    const rendered = await stepDef.buildEmail({
      job: fakeJob,
      payload: SAMPLE_PAYLOAD,
      link: (path: string) => {
        const safePath = path.startsWith('/') && !path.startsWith('//') ? path : '/';
        const url = new URL(safePath, SITE_BASE_URL);
        url.searchParams.set('utm_source', 'email');
        url.searchParams.set('utm_medium', 'followup');
        url.searchParams.set('utm_campaign', journeyKey);
        url.searchParams.set('utm_content', `step-${step}-test`);
        return url.toString();
      },
      unsubscribeUrl: buildPreferencesUrl(to),
      // Test sends render with saved overrides — what you see is what ships.
      copyOverrides: await getFollowUpCopyOverrides(),
    });
    if (!rendered) {
      return NextResponse.json(
        { success: false, error: 'This step renders no email (by design)' },
        { status: 400 }
      );
    }

    const result = await sendEmailDetailed({
      to,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
      type: EmailType.FOLLOW_UP,
      metadata: { testSend: true, journeyKey, step },
      tags: [{ name: 'journey', value: 'test_send' }],
      from: {
        email: process.env.FOLLOWUP_FROM_EMAIL,
        name: process.env.FOLLOWUP_FROM_NAME || 'Allan at Party On Delivery',
      },
      respectSuppression: true,
    });

    if (result.suppressed) {
      return NextResponse.json(
        { success: false, error: 'That address is on the suppression list' },
        { status: 409 }
      );
    }
    if (!result.sent) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Send failed' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, emailLogId: result.emailLogId });
  } catch (error) {
    console.error('[ops/followups/test-send POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Test send failed' }, { status: 500 });
  }
}
