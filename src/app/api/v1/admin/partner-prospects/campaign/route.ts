/**
 * GET /api/v1/admin/partner-prospects/campaign
 *
 * Journey-wide campaign overview for the workbench's collapsible funnel
 * panel (all verticals — same precedent as /metrics): distinct-prospect
 * funnel, per-touch table, delivery-problem rows, the scheduled queue,
 * today's cap usage, and the send-flag state. Aggregation lives in the
 * pure lib (src/lib/partners/campaign-stats.ts); this route only queries
 * and stitches. Distinct from GET [id]/campaign (one prospect's drawer
 * timeline) and deliberately NOT folded into /metrics, which feeds the
 * always-on strip.
 *
 * Unmasked prospect emails/names are correct here: same page, same ops
 * auth, same audience as the prospects table that already shows them
 * (the masking in the generic /admin/emails/followups panels protects
 * consumer PII on a page with a broader audience).
 *
 * EmailLog reads are keyed by the jobs' own emailLogId set with
 * type:'FOLLOW_UP' pinned, narrow select — same defense-in-depth as
 * [id]/campaign (EmailLog holds credential mail; see email-visibility.ts).
 *
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 */

import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { FEATURE_FLAGS, isFeatureEnabled } from '@/lib/features/feature-flags';
import { countOutreachSendsToday, outreachDailyCap } from '@/lib/followups/outreach-cap';
import {
  computeCampaignOverview,
  type CampaignProspectInfo,
} from '@/lib/partners/campaign-stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    // All partner-outreach jobs, all statuses — tiny by design (≤10 sends/day).
    const jobs = await prisma.followUpJob.findMany({
      where: { journeyKey: 'partner-outreach' },
      select: {
        leadId: true,
        email: true,
        step: true,
        status: true,
        scheduledFor: true,
        sentAt: true,
        canceledAt: true,
        cancelReason: true,
        lastError: true,
        emailLogId: true,
        updatedAt: true,
      },
    });

    const logIds = [...new Set(jobs.map((j) => j.emailLogId).filter((v): v is string => v !== null))];
    const leadIds = [...new Set(jobs.map((j) => j.leadId).filter((v): v is string => v !== null))];
    const jobEmails = [...new Set(jobs.map((j) => j.email))];

    const [logs, prospects, inbound, suppressions, usedToday, flagOn] = await Promise.all([
      logIds.length
        ? prisma.emailLog.findMany({
            where: { id: { in: logIds }, type: 'FOLLOW_UP' },
            select: { id: true, openedAt: true, bouncedAt: true, errorMessage: true },
          })
        : Promise.resolve([]),
      leadIds.length
        ? prisma.partnerProspect.findMany({
            where: { leadId: { in: leadIds } },
            select: { id: true, name: true, vertical: true, websiteKey: true, leadId: true },
          })
        : Promise.resolve([]),
      leadIds.length
        ? prisma.inboundEmail.findMany({
            where: { leadId: { in: leadIds } },
            select: { leadId: true, receivedAt: true },
            orderBy: { receivedAt: 'asc' },
          })
        : Promise.resolve([]),
      jobEmails.length
        ? prisma.emailSuppression.findMany({
            where: { email: { in: jobEmails } },
            select: { email: true, reason: true },
          })
        : Promise.resolve([]),
      countOutreachSendsToday(),
      isFeatureEnabled(FEATURE_FLAGS.FOLLOWUPS_PARTNER_OUTREACH),
    ]);

    const prospectsByLeadId = new Map<string, CampaignProspectInfo>();
    for (const p of prospects) {
      if (!p.leadId) continue;
      prospectsByLeadId.set(p.leadId, {
        id: p.id,
        name: p.name,
        vertical: p.vertical,
        websiteKey: p.websiteKey,
      });
    }
    const suppressionsByEmail = new Map(suppressions.map((s) => [s.email, s.reason]));

    const overview = computeCampaignOverview({
      jobs,
      logs,
      inbound,
      suppressionsByEmail,
      prospectsByLeadId,
      capToday: { used: usedToday, cap: outreachDailyCap() },
      flagOn,
    });

    return NextResponse.json({ success: true, data: overview });
  } catch (error) {
    console.error('[Partner Prospects] campaign overview error:', error);
    return NextResponse.json({ success: false, error: 'campaign-overview-failed' }, { status: 500 });
  }
}
