/**
 * Operations Director — weekly briefing cron.
 *
 * Schedule: Monday 13:30 UTC (8:30am Central) — runs 30 minutes after the
 * Marketing briefing so the operator gets both back-to-back without one
 * blocking the other.
 *
 * Stage A: deterministic email + payload + GitHub commit to
 * docs/operations/weekly/YYYY-Www.md. The committed markdown is what the
 * operator's Obsidian vault picks up via scripts/operations/sync-obsidian.mjs.
 *
 * No LLM narrative pass yet — leave Stage B for a follow-up once the
 * operations-director agent has been used for a few weeks and the operator
 * has a sense for what narrative would add over the deterministic content.
 *
 * See docs/OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md §7 Phase 1D.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { resend } from '@/lib/email/resend-client';
import { putFileToRepo } from '@/lib/github/put-file';
import { buildOperationsBriefingPayload } from '@/lib/operations/briefing-payload';
import { renderBriefingMarkdown } from '@/lib/operations/briefing-markdown';
import {
  renderOperationsBriefingEmail,
  renderOperationsBriefingText,
} from '@/lib/email/templates/operations-briefing';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function isoWeek(date: Date): { year: number; week: number; label: string } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const label = `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  return { year: d.getUTCFullYear(), week, label };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const week = isoWeek(now);

  const snapshot = await prisma.operationsSnapshot.findFirst({ orderBy: { capturedAt: 'desc' } });
  if (!snapshot) {
    return NextResponse.json(
      { error: 'no operations snapshot exists yet — run /api/cron/operations-snapshot first' },
      { status: 503 }
    );
  }

  const payload = await buildOperationsBriefingPayload({
    snapshot,
    weekLabel: week.label,
    issueNumber: week.week,
    year: week.year,
    generatedAt: now,
    queueUrl: 'https://partyondelivery.com/admin/recommendations?domain=operations',
    dashboardUrl: 'https://partyondelivery.com/admin/operations',
  });

  // Deliver email — fails soft so the cron stays green and the JSON response
  // always returns the payload (operator can inspect via curl if email's down).
  const recipient = process.env.OPS_BRIEFING_TO
    || process.env.MARKETING_BRIEFING_TO
    || 'allan@partyondelivery.com';

  let email: { sent: boolean; error?: string } = { sent: false, error: 'not attempted' };
  if (!resend) {
    email = { sent: false, error: 'RESEND_API_KEY not configured' };
  } else {
    try {
      const html = renderOperationsBriefingEmail(payload);
      const text = renderOperationsBriefingText(payload);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'orders@partyondelivery.com';
      await resend.emails.send({
        from: `Party On Delivery — Operations Director <${fromEmail}>`,
        to: recipient,
        subject: `Operations weekly briefing — ${week.label}`,
        html,
        text,
      });
      email = { sent: true };
    } catch (err) {
      email = { sent: false, error: err instanceof Error ? err.message : String(err) };
      console.error('[operations-briefing] email send failed:', err);
    }
  }

  // Commit deterministic markdown to GitHub so the Obsidian vault picks it
  // up on the next sync:operations run. Fails soft.
  const markdown = renderBriefingMarkdown(payload);
  const commit = await putFileToRepo({
    path: `docs/operations/weekly/${week.label}.md`,
    content: markdown,
    message: `chore(operations): weekly briefing ${week.label}`,
  }).catch((err) => ({ committed: false, error: err instanceof Error ? err.message : String(err) }));

  return NextResponse.json({
    ok: true,
    week: week.label,
    capturedAt: snapshot.capturedAt.toISOString(),
    counts: {
      driftEvents: payload.driftEvents.length,
      cycleCounts: payload.cycleCounts.length,
      danglingDrafts: payload.danglingDrafts.length,
    },
    delivery: { email, recipient, commit },
    payload,
  });
}
