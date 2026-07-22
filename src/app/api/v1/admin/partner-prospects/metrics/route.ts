/**
 * GET /api/v1/admin/partner-prospects/metrics
 *
 * Workbench metrics strip + research-queue banner counts:
 *   - today: sends used / daily cap (partner-outreach, all touches, CT day)
 *   - week (7d): sent / opened / bounced (via the jobs' EmailLog rows) +
 *     replied (inbound emails on partner-prospect leads)
 *   - queue: research PENDING / enriched-awaiting-draft / redo-requested
 *
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 */

import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { countOutreachSendsToday, outreachDailyCap } from '@/lib/followups/outreach-cap';
import { TAG_PARTNER_PROSPECT } from '@/lib/leads/partner-tags';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    const weekStart = new Date(Date.now() - 7 * 24 * 3_600_000);

    const [usedToday, weekJobs, replied, researchPending, awaitingDraft, redoRequested] =
      await Promise.all([
        countOutreachSendsToday(),
        prisma.followUpJob.findMany({
          where: { journeyKey: 'partner-outreach', status: 'sent', sentAt: { gte: weekStart } },
          select: { emailLogId: true },
        }),
        prisma.inboundEmail.count({
          where: {
            receivedAt: { gte: weekStart },
            lead: { tags: { has: TAG_PARTNER_PROSPECT } },
          },
        }),
        prisma.partnerProspect.count({ where: { researchStatus: 'PENDING' } }),
        prisma.partnerProspect.count({
          where: { researchStatus: 'ENRICHED', draftStatus: 'NONE', draftRedoGuidance: null },
        }),
        prisma.partnerProspect.count({
          where: { draftStatus: 'NONE', draftRedoGuidance: { not: null } },
        }),
      ]);

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
