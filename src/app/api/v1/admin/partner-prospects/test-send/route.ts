/**
 * POST /api/v1/admin/partner-prospects/test-send
 *
 * Send the full partner-outreach campaign preview to the review inbox
 * (info@partyondelivery.com) as ONE message: touch 1, both branches of
 * touch 2 (+5d, open-gated), and touch 3 (+12d), each under a labelled
 * divider. Prospects never receive them bundled — this is a review sheet.
 * Every touch is rendered from the SAME source journeys.ts reads at send
 * time, so what is approved here is what actually goes out. Subject is
 * prefixed [TEST — <Company>].
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
import { PARTNER_OUTREACH_SIGNATURE, renderFollowUpEmail } from '@/lib/followups/copy';
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

  // Preview every touch the prospect can actually receive, using the SAME
  // sources journeys.ts reads at send time (draft first, generic template only
  // where the journey itself would fall back). Previously this appended the
  // generic step-2 template regardless — so the reviewer approved copy that
  // would never send, under a "+48h if no reply" label that matched neither
  // the +5-day timing nor the open-branch trigger.
  const rule = '────────────────────────────────';
  const sections: string[] = [`TOUCH 1 — sends immediately on enrollment
Subject: ${outreach.subject}
${rule}

${outreach.body}`];

  if (outreach.followUpBody) {
    sections.push(`${rule}
TOUCH 2 — +5 days, ONLY if they opened touch 1
Subject: Re: ${outreach.subject}
${rule}

${outreach.followUpBody}`);
  } else {
    // Mirrors journeys.ts: an empty followUpBody means the opened branch sends
    // nothing at all (it returns null), so say that rather than imply copy.
    sections.push(`${rule}
TOUCH 2 (opened branch) — +5 days
${rule}

[No follow-up body on this draft — the opened branch would send nothing.]`);
  }

  sections.push(`${rule}
TOUCH 2 (alternate) — +5 days, if touch 1 was NEVER opened
Subject: ${outreach.altSubject ?? outreach.subject}
${rule}

[The touch-1 body above is resent as a fresh thread under this subject.]`);

  if (outreach.touch3Body) {
    sections.push(`${rule}
TOUCH 3 — +12 days, standalone soft close
Subject: ${outreach.subject}
${rule}

${outreach.touch3Body}`);
  } else {
    sections.push(`${rule}
TOUCH 3 — +12 days
${rule}

[No touch-3 body on this draft — nothing would send.]`);
  }

  sections.push(`${rule}
Any reply, or the prospect becoming an active partner, cancels the remaining
touches. Sends are capped at 10/day, 9am–7pm CT.`);

  const combinedBody = sections.join('\n\n');

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
