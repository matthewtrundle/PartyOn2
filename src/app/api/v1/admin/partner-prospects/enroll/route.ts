/**
 * POST /api/v1/admin/partner-prospects/enroll
 *
 * Enroll prospects in the 'partner-outreach' 2-touch campaign (personalized
 * initial email now, abridged follow-up at +48h). Batches are capped at 10
 * per Brian's 5-10-at-a-time rule. Enqueueing is idempotent (dedupeKey), and
 * NOTHING SENDS while the followups_partner_outreach feature flag is off —
 * the engine skips flagged-off journeys.
 *
 * Body: { websites: string[] }  (prospect website URLs, max 10)
 * Auth: middleware requires a valid ops session for /api/v1/admin/*.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { enqueueJourney } from '@/lib/followups/enqueue';
import { TAG_PARTNER_PROSPECT } from '@/lib/leads/partner-tags';
import { findProspectByWebsite, websiteKey } from '@/lib/partners/prospect-datasets';

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
    const prospect = findProspectByWebsite(website);
    if (!prospect) {
      results.push({ website, ok: false, reason: 'not-in-database' });
      continue;
    }
    if (!prospect.email) {
      results.push({ website, ok: false, reason: 'no-email' });
      continue;
    }

    // Requires a synced Lead — run Sync to CRM first.
    const lead = await prisma.lead.findFirst({
      where: {
        tags: { has: TAG_PARTNER_PROSPECT },
        metadata: { path: ['websiteKey'], equals: websiteKey(website) },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, firstName: true },
    });
    if (!lead) {
      results.push({ website, ok: false, reason: 'not-synced' });
      continue;
    }

    const enq = await enqueueJourney('partner-outreach', {
      email: prospect.email,
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
