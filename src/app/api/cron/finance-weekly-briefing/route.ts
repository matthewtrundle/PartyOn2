/**
 * Finance Director — weekly briefing cron.
 *
 * Schedule: Monday 14:00 UTC (9:00am Central). Runs after Marketing's 13:00
 * and Operations' 13:30 so the operator gets all three director briefings
 * back-to-back in the morning email window.
 *
 * Deterministic email + payload + GitHub commit to
 * docs/finance/weekly/YYYY-Www.md. No LLM narrative pass yet (mirrors
 * Phase 1D pattern from Operations Director).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/email/resend-client';
import { putFileToRepo } from '@/lib/github/put-file';
import { buildFinanceBriefingPayload } from '@/lib/finance/briefing-payload';
import { renderFinanceBriefingMarkdown } from '@/lib/finance/briefing-markdown';
import {
  renderFinanceBriefingEmail,
  renderFinanceBriefingText,
} from '@/lib/email/templates/finance-briefing';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const payload = await buildFinanceBriefingPayload(now);

  // Deliver email — fails soft so the cron stays green.
  const recipient =
    process.env.FINANCE_BRIEFING_TO ||
    process.env.OPS_BRIEFING_TO ||
    process.env.MARKETING_BRIEFING_TO ||
    'allan@partyondelivery.com';

  let email: { sent: boolean; error?: string } = { sent: false, error: 'not attempted' };
  if (!resend) {
    email = { sent: false, error: 'RESEND_API_KEY not configured' };
  } else {
    try {
      const html = renderFinanceBriefingEmail(payload);
      const text = renderFinanceBriefingText(payload);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'orders@partyondelivery.com';
      await resend.emails.send({
        from: `Party On Delivery — Finance Director <${fromEmail}>`,
        to: recipient,
        subject: `Finance weekly briefing — ${payload.weekLabel}`,
        html,
        text,
      });
      email = { sent: true };
    } catch (err) {
      email = { sent: false, error: err instanceof Error ? err.message : String(err) };
      console.error('[finance-briefing] email send failed:', err);
    }
  }

  // Commit deterministic markdown to GitHub for the (future) Obsidian sync.
  const markdown = renderFinanceBriefingMarkdown(payload);
  const commit = await putFileToRepo({
    path: `docs/finance/weekly/${payload.weekLabel}.md`,
    content: markdown,
    message: `chore(finance): weekly briefing ${payload.weekLabel}`,
  }).catch((err) => ({ committed: false, error: err instanceof Error ? err.message : String(err) }));

  return NextResponse.json({
    ok: true,
    week: payload.weekLabel,
    snapshotDate: payload.snapshotDate,
    counts: {
      urgent: payload.urgentRecs.length,
      high: payload.highRecs.length,
      normal: payload.normalRecCount,
    },
    delivery: { email, recipient, commit },
    payload,
  });
}
