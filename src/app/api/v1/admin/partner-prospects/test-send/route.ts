/**
 * POST /api/v1/admin/partner-prospects/test-send
 *
 * Send the exact partner-outreach campaign preview to the review inbox
 * (info@partyondelivery.com): the personalized step-1 email, with the
 * +48h abridged step-2 follow-up appended below a divider so both touches
 * are reviewed in one message. Subject is prefixed [TEST — <Company>].
 *
 * Touches nothing: no jobs, no suppression writes, no lead updates —
 * pure render + send to the internal inbox. This is the mandatory review
 * step before any batch is enrolled for real sends.
 *
 * Body: { website: string }
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { sendEmailDetailed } from '@/lib/email/resend-client';
import {
  PARTNER_OUTREACH_SIGNATURE,
  DEFAULT_COPY,
  renderFollowUpEmail,
  renderSubject,
  renderTemplate,
} from '@/lib/followups/copy';
import { SITE_BASE_URL } from '@/lib/followups/types';
import { getProspectByWebsite, getSendableDraft } from '@/lib/partners/prospect-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEST_INBOX = 'info@partyondelivery.com';

const bodySchema = z.object({ website: z.string().url() });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_body' }, { status: 400 });
  }

  const prospect = await getProspectByWebsite(body.website);
  if (!prospect) {
    return NextResponse.json({ success: false, error: 'not-in-database' }, { status: 404 });
  }
  const outreach = await getSendableDraft(body.website);
  if (!outreach) {
    return NextResponse.json({ success: false, error: 'not-enriched' }, { status: 400 });
  }

  // Step 2 preview — same template + token substitution the engine uses.
  const firstName = (prospect.contactName ?? '').replace(/\(.*?\)/g, '').trim().split(/\s+/)[0] || 'there';
  const tokens = {
    firstName,
    company: prospect.name,
    partnerUrl: prospect.partnerSlug ? `${SITE_BASE_URL}/partners/${prospect.partnerSlug}` : null,
  };
  const step2Tpl = DEFAULT_COPY['partner-outreach'][1];
  const step2Subject = renderSubject(step2Tpl.subject, tokens);
  const step2Body = renderTemplate(step2Tpl.body, tokens);

  const combinedBody = `${outreach.body}

────────────────────────────────
FOLLOW-UP (sends +48h later if no reply)
Subject: ${step2Subject}
────────────────────────────────

${step2Body}`;

  const rendered = renderFollowUpEmail(
    `[TEST — ${prospect.name}] ${outreach.subject}`,
    combinedBody,
    `${SITE_BASE_URL}/email/preferences`,
    PARTNER_OUTREACH_SIGNATURE,
  );

  const result = await sendEmailDetailed({
    to: TEST_INBOX,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    type: 'FOLLOW_UP',
    from: { email: TEST_INBOX, name: 'Allan at Party On Delivery' },
    tags: [{ name: 'campaign', value: 'partner_outreach_test' }],
    respectSuppression: false,
  });

  if (!result.sent) {
    return NextResponse.json(
      { success: false, error: result.error ?? 'send-failed' },
      { status: 502 },
    );
  }
  return NextResponse.json({ success: true, data: { to: TEST_INBOX, resendId: result.resendId } });
}
