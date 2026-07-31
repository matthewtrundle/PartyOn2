/**
 * GET /api/v1/admin/partner-prospects/[id]/campaign
 *
 * Per-prospect campaign detail for the drawer's touch timeline:
 * { enrolled, leadId, touches: CampaignTouch[3] } — per touch the job
 * status / scheduledFor / sentAt / cancelReason / lastError plus a narrow
 * EmailLog slice (status, openedAt, bouncedAt, errorMessage).
 *
 * Deliberately a LAZY per-drawer fetch, not part of GET /sync: the workbench
 * refetches the sync map on every action, and per-touch detail is only
 * needed when a drawer is open — this keeps the hot path and the LeadState
 * shape untouched.
 *
 * SECURITY — EmailLog reads here are keyed by the lead's own follow-up jobs'
 * emailLogId set (never by recipient address), so the address-keyed
 * allow-list in src/lib/leads/email-visibility.ts does not apply; EmailLog
 * holds credential-bearing mail (password resets, magic links), so this
 * route additionally pins `type: 'FOLLOW_UP'` as defense-in-depth and
 * selects only delivery-status fields — never `to`, never `metadata`.
 *
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { TAG_PARTNER_PROSPECT } from '@/lib/leads/partner-tags';
import {
  buildCampaignTouches,
  type CampaignTouchEmail,
} from '@/lib/partners/campaign-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const prospect = await prisma.partnerProspect.findUnique({
      where: { id },
      select: { id: true, leadId: true, websiteKey: true },
    });
    if (!prospect) {
      return NextResponse.json({ success: false, error: 'not-found' }, { status: 404 });
    }

    // Resolve the lead: stored back-link first, else the sync route's
    // websiteKey lookup (pre-back-link legacy rows).
    let leadId = prospect.leadId;
    if (!leadId) {
      const lead = await prisma.lead.findFirst({
        where: {
          tags: { has: TAG_PARTNER_PROSPECT },
          metadata: { path: ['websiteKey'], equals: prospect.websiteKey },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      leadId = lead?.id ?? null;
    }
    if (!leadId) {
      return NextResponse.json({
        success: true,
        data: { enrolled: false, leadId: null, touches: [] },
      });
    }

    const jobs = await prisma.followUpJob.findMany({
      where: { journeyKey: 'partner-outreach', leadId },
      orderBy: { step: 'asc' },
      select: {
        leadId: true,
        step: true,
        status: true,
        scheduledFor: true,
        sentAt: true,
        cancelReason: true,
        lastError: true,
        emailLogId: true,
      },
    });
    if (jobs.length === 0) {
      return NextResponse.json({
        success: true,
        data: { enrolled: false, leadId, touches: [] },
      });
    }

    const logIds = jobs.map((j) => j.emailLogId).filter((v): v is string => v !== null);
    const logs = logIds.length
      ? await prisma.emailLog.findMany({
          where: { id: { in: logIds }, type: 'FOLLOW_UP' },
          select: { id: true, status: true, openedAt: true, bouncedAt: true, errorMessage: true },
        })
      : [];
    const logsById = new Map<string, CampaignTouchEmail>(
      logs.map((l) => [
        l.id,
        { status: l.status, openedAt: l.openedAt, bouncedAt: l.bouncedAt, errorMessage: l.errorMessage },
      ]),
    );

    return NextResponse.json({
      success: true,
      data: { enrolled: true, leadId, touches: buildCampaignTouches(jobs, logsById) },
    });
  } catch (error) {
    console.error('[Partner Prospects] campaign detail error:', error);
    return NextResponse.json({ success: false, error: 'campaign-failed' }, { status: 500 });
  }
}
