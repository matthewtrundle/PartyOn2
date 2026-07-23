/**
 * GET /api/v1/admin/partner-prospects/ab[?experiment=<key>]
 *
 * A/B results for the partner-outreach first-touch copy test: per-arm reply
 * rate (the win metric) + open rate (secondary), with the shared
 * two-proportion z-test on reply rate. Unit is the PROSPECT — a prospect is
 * "sent" once it has ≥1 sent partner-outreach job, "replied" if an
 * InboundEmail exists on its lead, "opened" if any of its sends' EmailLog rows
 * has openedAt. Reply attribution mirrors the metrics route (any inbound on
 * the lead counts as a reply).
 *
 * Optional ?experiment=<key> restricts to prospects tagged with that
 * experimentKey; otherwise every prospect carrying an arm label is included.
 *
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { computeOutreachAbResults, type OutreachArmKey } from '@/lib/partners/ab-results';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    const experimentKey = request.nextUrl.searchParams.get('experiment');

    // Prospects in the test: those carrying an arm label (optionally scoped to
    // one experiment). leadId is the join key to sends/replies.
    const prospects = await prisma.partnerProspect.findMany({
      where: {
        abArm: { in: ['A', 'B'] },
        leadId: { not: null },
        ...(experimentKey ? { experimentKey } : {}),
      },
      select: { leadId: true, abArm: true },
    });
    // Assignment counts (all arm-tagged prospects, sent or not) so the panel
    // shows the split before any sends fire.
    const assigned = {
      A: prospects.filter((p) => p.abArm === 'A').length,
      B: prospects.filter((p) => p.abArm === 'B').length,
    };
    if (prospects.length === 0) {
      const empty = computeOutreachAbResults([]);
      return NextResponse.json({ success: true, data: { experimentKey, assigned, ...empty } });
    }

    const leadIds = prospects.map((p) => p.leadId).filter((id): id is string => id !== null);

    // Sent partner-outreach jobs for these leads → which leads were sent, and
    // the EmailLog ids to check opens against.
    const jobs = await prisma.followUpJob.findMany({
      where: { journeyKey: 'partner-outreach', status: 'sent', leadId: { in: leadIds } },
      select: { leadId: true, emailLogId: true },
    });
    const sentLeadIds = new Set(jobs.map((j) => j.leadId).filter((id): id is string => id !== null));

    const logIds = jobs.map((j) => j.emailLogId).filter((id): id is string => id !== null);
    const openedLogs = logIds.length
      ? await prisma.emailLog.findMany({
          where: { id: { in: logIds }, openedAt: { not: null } },
          select: { id: true },
        })
      : [];
    const openedLogIds = new Set(openedLogs.map((l) => l.id));
    const openedLeadIds = new Set(
      jobs
        .filter((j) => j.emailLogId && openedLogIds.has(j.emailLogId))
        .map((j) => j.leadId)
        .filter((id): id is string => id !== null),
    );

    const repliedRows = await prisma.inboundEmail.findMany({
      where: { leadId: { in: Array.from(sentLeadIds) } },
      select: { leadId: true },
    });
    const repliedLeadIds = new Set(
      repliedRows.map((r) => r.leadId).filter((id): id is string => id !== null),
    );

    // One record per SENT prospect (dedupe leads defensively).
    const seen = new Set<string>();
    const sentProspects = prospects
      .filter((p) => p.leadId && sentLeadIds.has(p.leadId) && !seen.has(p.leadId) && seen.add(p.leadId))
      .map((p) => ({
        arm: p.abArm as OutreachArmKey,
        opened: openedLeadIds.has(p.leadId as string),
        replied: repliedLeadIds.has(p.leadId as string),
      }));

    const result = computeOutreachAbResults(sentProspects);
    return NextResponse.json({ success: true, data: { experimentKey, assigned, ...result } });
  } catch (error) {
    console.error('[Partner Prospects] ab-results error:', error);
    return NextResponse.json({ success: false, error: 'ab-results-failed' }, { status: 500 });
  }
}
