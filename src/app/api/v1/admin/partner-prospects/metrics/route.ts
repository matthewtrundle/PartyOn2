/**
 * GET /api/v1/admin/partner-prospects/metrics
 *
 * Workbench metrics strip + research-queue banner counts:
 *   - today: sends used / daily cap (partner-outreach, all touches, CT day)
 *   - week (7d): sent / opened / bounced (via the jobs' EmailLog rows) +
 *     replied (campaign-scoped: inbound this week that arrived at-or-after
 *     the lead's FIRST campaign send — which may be older than 7 days, so
 *     sent jobs are fetched all-time; see campaign-status.ts)
 *   - queue: research PENDING / enriched-awaiting-draft / redo-requested
 *
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 */

import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { countOutreachSendsToday, outreachDailyCap } from '@/lib/followups/outreach-cap';
import { TAG_PARTNER_PROSPECT } from '@/lib/leads/partner-tags';
import { firstSentAtByLead, isCampaignReply } from '@/lib/partners/campaign-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    const weekStart = new Date(Date.now() - 7 * 24 * 3_600_000);

    // Sent jobs are fetched ALL-TIME (tiny volume — ≤10/day by design): the
    // 7-day tiles subset them below, and reply scoping needs each lead's
    // first-ever send, not its first send this week.
    const [usedToday, sentJobs, inbound, researchPending, awaitingDraft, redoRequested] =
      await Promise.all([
        countOutreachSendsToday(),
        prisma.followUpJob.findMany({
          where: { journeyKey: 'partner-outreach', status: 'sent' },
          select: { leadId: true, status: true, sentAt: true, emailLogId: true },
        }),
        prisma.inboundEmail.findMany({
          where: {
            receivedAt: { gte: weekStart },
            lead: { tags: { has: TAG_PARTNER_PROSPECT } },
          },
          select: { leadId: true, receivedAt: true },
        }),
        prisma.partnerProspect.count({ where: { researchStatus: 'PENDING' } }),
        prisma.partnerProspect.count({
          where: { researchStatus: 'ENRICHED', draftStatus: 'NONE', draftRedoGuidance: null },
        }),
        prisma.partnerProspect.count({
          where: { draftStatus: 'NONE', draftRedoGuidance: { not: null } },
        }),
      ]);

    const weekJobs = sentJobs.filter((j) => j.sentAt && j.sentAt >= weekStart);
    const firstSent = firstSentAtByLead(sentJobs);
    const replied = inbound.filter(
      (r) => r.leadId !== null && isCampaignReply(r.receivedAt, firstSent.get(r.leadId)),
    ).length;

    const logIds = weekJobs.map((j) => j.emailLogId).filter((id): id is string => id !== null);
    const [opened, bounced] = logIds.length
      ? await Promise.all([
          prisma.emailLog.count({ where: { id: { in: logIds }, openedAt: { not: null } } }),
          prisma.emailLog.count({ where: { id: { in: logIds }, bouncedAt: { not: null } } }),
        ])
      : [0, 0];

    return NextResponse.json({
      success: true,
      data: {
        today: { used: usedToday, cap: outreachDailyCap() },
        week: { sent: weekJobs.length, opened, bounced, replied },
        queue: { researchPending, awaitingDraft, redoRequested },
      },
    });
  } catch (error) {
    console.error('[Partner Prospects] metrics error:', error);
    return NextResponse.json({ success: false, error: 'metrics-failed' }, { status: 500 });
  }
}
