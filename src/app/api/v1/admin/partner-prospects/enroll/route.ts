/**
 * POST /api/v1/admin/partner-prospects/enroll
 *
 * Enroll prospects in the 'partner-outreach' 3-touch campaign (approved
 * personalized email on enroll, open-branched touch 2 at +5d, standalone
 * close at +12d; ≤10 sends/day across all touches). Batches are capped at
 * 10 per request. Gates: APPROVED draft + a verified email that is not
 * INVALID + not suppressed — see enrollGateReason. Enqueueing is
 * idempotent (dedupeKey), and NOTHING SENDS while the
 * followups_partner_outreach feature flag is off.
 *
 * Body: { websites: string[] }  (prospect website URLs, max 10)
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { enqueueJourney } from '@/lib/followups/enqueue';
import { isSuppressed } from '@/lib/followups/suppression';
import { TAG_PARTNER_PROSPECT } from '@/lib/leads/partner-tags';
import { enrollGateReason } from '@/lib/partners/enroll-gate';
import { assignAbArm, getProspectByWebsite } from '@/lib/partners/prospect-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  websites: z.array(z.string().url()).min(1).max(10),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { success: false, error: 'invalid_body (websites: string[], max 10)' },
      { status: 400 },
    );
  }

  const results: { website: string; ok: boolean; reason?: string; jobId?: string }[] = [];

  for (const website of body.websites) {
    const prospect = await getProspectByWebsite(website);
    if (!prospect) {
      results.push({ website, ok: false, reason: 'not-in-database' });
      continue;
    }
    const email = prospect.email;
    if (!email) {
      results.push({ website, ok: false, reason: 'no-email' });
      continue;
    }
    // Full enrollment gates: not suppressed + APPROVED draft + a verified,
    // non-INVALID email. Reasons surface in the UI.
    const gateReason = enrollGateReason(prospect, await isSuppressed(email));
    if (gateReason) {
      results.push({ website, ok: false, reason: gateReason });
      continue;
    }

    // Requires a synced Lead — run Sync to CRM first.
    const lead = await prisma.lead.findFirst({
      where: {
        tags: { has: TAG_PARTNER_PROSPECT },
        metadata: { path: ['websiteKey'], equals: prospect.websiteKey },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, firstName: true },
    });
    if (!lead) {
      results.push({ website, ok: false, reason: 'not-synced' });
      continue;
    }

    // Safety net: if the drafting session didn't label an arm, bucket this
    // prospect deterministically so it's never unattributed in A/B results.
    // (No-op when abArm is already set — the normal path.)
    if (!prospect.abArm) {
      await prisma.partnerProspect.update({
        where: { id: prospect.id },
        data: { abArm: assignAbArm(prospect.websiteKey) },
      });
    }

    const enq = await enqueueJourney('partner-outreach', {
      email,
      entityId: lead.id,
      leadId: lead.id,
      payload: {
        website: prospect.website,
        company: prospect.name,
        firstName: lead.firstName ?? '',
        partnerSlug: prospect.partnerSlug ?? '',
      },
    });
    results.push({
      website,
      ok: enq.enqueued,
      reason: enq.enqueued ? undefined : enq.reason,
      jobId: enq.jobId,
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      enrolled: results.filter((r) => r.ok).length,
      results,
    },
  });
}
