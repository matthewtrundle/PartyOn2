/**
 * One-shot backfill: put pre-existing invisible captures onto the Lead Flow
 * board (2026-07-13 lead-capture audit, PR G). DRY-RUN BY DEFAULT — pass
 * --apply to write. Operator-gated per house rules.
 *
 * Scope (deliberate):
 *  1. GroupOrderV2 dashboard hosts — ACTIVE, unexpired, host contactable,
 *     ZERO PAID participant payments (the true built-but-unpaid pipeline).
 *     Dashboards that already collected money are customers, and the won
 *     matcher's date floor would strand their cards in NEW forever (their
 *     orders predate the backfilled lead), so they are excluded.
 *  2. partner_inquiries from the last 180 days.
 *  3. partner_applications still PENDING (approved ones are affiliates).
 *
 * Idempotent: a lead already linked to the same entity (metadata
 * groupDashboard.groupOrderId / partnerInquiry.inquiryId /
 * affiliateApplication.applicationId) is skipped; the mirror helpers upsert
 * by email/phone, so re-runs never create siblings.
 *
 * Reuses the SAME production writers (mirrorDashboardHostLead, upsertLead,
 * markLeadStatus, enrollLeadIfEligible) so the single-writer invariants —
 * guarded promote, no reopen power, no LeadStatus downgrades — hold here too.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/backfill-lead-gaps.ts          # dry-run report
 *   npx tsx scripts/backfill-lead-gaps.ts --apply  # write
 */

import { prisma } from '../src/lib/database/client';
import { mirrorDashboardHostLead } from '../src/lib/leads/dashboard-lead';
import { markLeadStatus, upsertLead } from '../src/lib/leads/leadCapture';
import { enrollLeadIfEligible } from '../src/lib/leads/pipeline';

const APPLY = process.argv.includes('--apply');
const INQUIRY_WINDOW_DAYS = 180;

function log(line: string): void {
  console.log(`${APPLY ? '[APPLY]' : '[dry-run]'} ${line}`);
}

/** Is any lead already linked to this entity via the given metadata path? */
async function leadLinked(path: string[], id: string): Promise<boolean> {
  const hit = await prisma.lead.findFirst({
    where: { metadata: { path, equals: id } },
    select: { id: true },
  });
  return hit !== null;
}

/** Shared B2B mirror (same shape as the partners/inquiry + affiliate/apply routes). */
async function mirrorB2bLead(opts: {
  email: string;
  phone: string | null;
  contactName: string;
  sourcePage: string;
  metadataKey: 'partnerInquiry' | 'affiliateApplication';
  metadataValue: Record<string, unknown>;
}): Promise<void> {
  const [first, ...rest] = opts.contactName.split(/\s+/);
  const lead = await upsertLead(
    {
      email: opts.email,
      phone: opts.phone,
      firstName: first || null,
      lastName: rest.join(' ') || null,
    },
    { sourcePage: opts.sourcePage, sourceWidget: 'PARTNER_INQUIRY' },
  );
  if (!lead) return;
  const prevMeta = (lead.metadata as Record<string, unknown> | null) ?? {};
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      sourcePage: opts.sourcePage,
      sourceWidget: 'PARTNER_INQUIRY',
      metadata: { ...prevMeta, [opts.metadataKey]: opts.metadataValue },
    },
  });
  if (lead.status === 'PARTIAL' || lead.status === 'ANONYMOUS') {
    await markLeadStatus(lead.id, 'SUBMITTED');
  } else {
    await enrollLeadIfEligible(lead.id);
  }
}

async function backfillDashboardHosts(): Promise<{ mirrored: number; skipped: number }> {
  const groups = await prisma.groupOrderV2.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
      OR: [{ hostEmail: { not: null } }, { hostPhone: { not: null } }],
      // Zero PAID payments anywhere on the dashboard — unpaid pipeline only.
      NOT: { tabs: { some: { payments: { some: { status: 'PAID' } } } } },
    },
    select: {
      id: true,
      shareCode: true,
      hostName: true,
      hostEmail: true,
      hostPhone: true,
      partyType: true,
      source: true,
      tabs: { select: { deliveryDate: true }, orderBy: { deliveryDate: 'asc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  let mirrored = 0;
  let skipped = 0;
  for (const g of groups) {
    if (await leadLinked(['groupDashboard', 'groupOrderId'], g.id)) {
      skipped++;
      continue;
    }
    log(
      `dashboard host → lead: ${g.shareCode} (${g.hostEmail ?? g.hostPhone}) party=${g.partyType ?? '—'} source=${g.source}`,
    );
    if (APPLY) {
      await mirrorDashboardHostLead({
        groupOrderId: g.id,
        shareCode: g.shareCode,
        hostName: g.hostName,
        hostEmail: g.hostEmail,
        hostPhone: g.hostPhone,
        partyType: g.partyType,
        deliveryDate: g.tabs[0]?.deliveryDate ?? null,
        source: g.source,
        createdVia: 'backfill',
      });
    }
    mirrored++;
  }
  return { mirrored, skipped };
}

async function backfillPartnerInquiries(): Promise<{ mirrored: number; skipped: number }> {
  const floor = new Date(Date.now() - INQUIRY_WINDOW_DAYS * 86_400_000);
  const inquiries = await prisma.partnerInquiry.findMany({
    where: { createdAt: { gte: floor } },
    select: {
      id: true,
      email: true,
      phone: true,
      contactName: true,
      businessName: true,
      businessType: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  let mirrored = 0;
  let skipped = 0;
  for (const q of inquiries) {
    // Internal smoke-test submissions are not leads.
    if (q.email.toLowerCase().endsWith('@partyondelivery.com')) {
      skipped++;
      continue;
    }
    if (await leadLinked(['partnerInquiry', 'inquiryId'], q.id)) {
      skipped++;
      continue;
    }
    log(`partner inquiry → lead: ${q.email} (${q.businessName})`);
    if (APPLY) {
      await mirrorB2bLead({
        email: q.email,
        phone: q.phone,
        contactName: q.contactName,
        sourcePage: '/partners',
        metadataKey: 'partnerInquiry',
        metadataValue: {
          inquiryId: q.id,
          businessName: q.businessName,
          businessType: q.businessType,
          submittedAt: q.createdAt.toISOString(),
          backfilled: true,
        },
      });
    }
    mirrored++;
  }
  return { mirrored, skipped };
}

async function backfillAffiliateApplications(): Promise<{ mirrored: number; skipped: number }> {
  const apps = await prisma.partnerApplication.findMany({
    where: { status: 'PENDING' },
    select: {
      id: true,
      email: true,
      phone: true,
      contactName: true,
      businessName: true,
      category: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  let mirrored = 0;
  let skipped = 0;
  for (const a of apps) {
    if (await leadLinked(['affiliateApplication', 'applicationId'], a.id)) {
      skipped++;
      continue;
    }
    log(`affiliate application → lead: ${a.email} (${a.businessName})`);
    if (APPLY) {
      await mirrorB2bLead({
        email: a.email,
        phone: a.phone,
        contactName: a.contactName,
        sourcePage: '/affiliate/apply',
        metadataKey: 'affiliateApplication',
        metadataValue: {
          applicationId: a.id,
          businessName: a.businessName,
          category: a.category,
          submittedAt: a.createdAt.toISOString(),
          backfilled: true,
        },
      });
    }
    mirrored++;
  }
  return { mirrored, skipped };
}

async function main(): Promise<void> {
  console.log(
    `Lead-gap backfill — ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (pass --apply to write)'}\n`,
  );
  const hosts = await backfillDashboardHosts();
  const inquiries = await backfillPartnerInquiries();
  const apps = await backfillAffiliateApplications();
  console.log('\nSummary:');
  console.log(`  dashboard hosts:        ${hosts.mirrored} to mirror, ${hosts.skipped} skipped (already linked)`);
  console.log(`  partner inquiries:      ${inquiries.mirrored} to mirror, ${inquiries.skipped} skipped (linked or internal test)`);
  console.log(`  affiliate applications: ${apps.mirrored} to mirror, ${apps.skipped} skipped (already linked)`);
  if (!APPLY) console.log('\nNothing written. Re-run with --apply to execute.');
}

main()
  .catch((err) => {
    console.error('backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
