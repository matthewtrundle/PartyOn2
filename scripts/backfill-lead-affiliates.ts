/**
 * One-shot backfill: stamp Lead.affiliateId for existing leads (the column
 * has existed unwritten since the board build — "populated by
 * partner-attribution code added in a later PR"; that PR is the 2026-07-23
 * board overhaul PR-D, which starts stamping at capture time; this script
 * covers everything captured before it). DRY-RUN BY DEFAULT — pass --apply
 * to write. Operator-gated per house rules.
 *
 * Resolution order per lead (first hit wins; fill-blank only — every write
 * is guarded `WHERE affiliate_id IS NULL`, so re-runs and races with live
 * capture are safe):
 *   1. metadata.groupDashboard.groupOrderId → GroupOrderV2.affiliateId
 *      (covers every Premier webhook dashboard host)
 *   2. metadata.partner slug (incl. the premier-concierge → PREMIER alias)
 *      → Affiliate.partnerSlug / code, via the shared resolveAffiliateId
 *   3. lead.orderId → Order.affiliateId (checkout ref_code attribution)
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/backfill-lead-affiliates.ts          # dry-run report
 *   npx tsx scripts/backfill-lead-affiliates.ts --apply  # write
 */

import { prisma } from '../src/lib/database/client';
import { resolveAffiliateId } from '../src/lib/leads/affiliate-resolve';

const APPLY = process.argv.includes('--apply');
const BATCH = 200;

function log(line: string): void {
  console.log(`${APPLY ? '[APPLY]' : '[dry-run]'} ${line}`);
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

interface Resolution {
  leadId: string;
  email: string | null;
  affiliateId: string;
  via: 'dashboard' | 'partner-slug' | 'order';
  detail: string;
}

async function main(): Promise<void> {
  const resolutions: Resolution[] = [];
  const slugCache = new Map<string, string | null>();

  let cursor: string | null = null;
  let scanned = 0;
  for (;;) {
    const leads: Array<{
      id: string;
      email: string | null;
      metadata: unknown;
      orderId: string | null;
    }> = await prisma.lead.findMany({
      where: { affiliateId: null },
      select: { id: true, email: true, metadata: true, orderId: true },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (leads.length === 0) break;
    cursor = leads[leads.length - 1].id;
    scanned += leads.length;

    // Batch the dashboard + order lookups for this page.
    const meta = leads.map((l) => ({ lead: l, m: asRecord(l.metadata) }));
    const groupIds = [
      ...new Set(
        meta
          .map(({ m }) => asRecord(m?.groupDashboard)?.groupOrderId)
          .filter((v): v is string => typeof v === 'string' && v.length > 0),
      ),
    ];
    const orderIds = [
      ...new Set(leads.map((l) => l.orderId).filter((v): v is string => v != null)),
    ];
    const [groups, orders] = await Promise.all([
      groupIds.length
        ? prisma.groupOrderV2.findMany({
            where: { id: { in: groupIds }, affiliateId: { not: null } },
            select: { id: true, affiliateId: true },
          })
        : Promise.resolve([]),
      orderIds.length
        ? prisma.order.findMany({
            where: { id: { in: orderIds }, affiliateId: { not: null } },
            select: { id: true, affiliateId: true },
          })
        : Promise.resolve([]),
    ]);
    const groupAff = new Map(groups.map((g) => [g.id, g.affiliateId as string]));
    const orderAff = new Map(orders.map((o) => [o.id, o.affiliateId as string]));

    for (const { lead, m } of meta) {
      // 1. Dashboard's affiliate
      const gid = asRecord(m?.groupDashboard)?.groupOrderId;
      const viaDashboard = typeof gid === 'string' ? groupAff.get(gid) : undefined;
      if (viaDashboard) {
        resolutions.push({
          leadId: lead.id,
          email: lead.email,
          affiliateId: viaDashboard,
          via: 'dashboard',
          detail: `group ${gid}`,
        });
        continue;
      }
      // 2. Partner slug (cached; includes the premier-concierge alias)
      const partner = m?.partner;
      if (typeof partner === 'string' && partner) {
        const key = partner.toLowerCase();
        if (!slugCache.has(key)) slugCache.set(key, await resolveAffiliateId(partner));
        const viaSlug = slugCache.get(key);
        if (viaSlug) {
          resolutions.push({
            leadId: lead.id,
            email: lead.email,
            affiliateId: viaSlug,
            via: 'partner-slug',
            detail: partner,
          });
          continue;
        }
      }
      // 3. Won order's affiliate
      const viaOrder = lead.orderId ? orderAff.get(lead.orderId) : undefined;
      if (viaOrder) {
        resolutions.push({
          leadId: lead.id,
          email: lead.email,
          affiliateId: viaOrder,
          via: 'order',
          detail: `order ${lead.orderId}`,
        });
      }
    }
  }

  // Report: counts per route + per affiliate, then samples.
  const byVia = new Map<string, number>();
  const byAffiliate = new Map<string, number>();
  for (const r of resolutions) {
    byVia.set(r.via, (byVia.get(r.via) ?? 0) + 1);
    byAffiliate.set(r.affiliateId, (byAffiliate.get(r.affiliateId) ?? 0) + 1);
  }
  const affiliates = await prisma.affiliate.findMany({
    where: { id: { in: [...byAffiliate.keys()] } },
    select: { id: true, businessName: true, code: true },
  });
  const affName = new Map(affiliates.map((a) => [a.id, `${a.businessName} (${a.code})`]));

  log(`scanned ${scanned} unstamped leads → ${resolutions.length} resolvable`);
  for (const [via, n] of byVia) log(`  via ${via}: ${n}`);
  for (const [id, n] of byAffiliate) log(`  → ${affName.get(id) ?? id}: ${n}`);
  for (const r of resolutions.slice(0, 10)) {
    log(`  sample: ${r.email ?? r.leadId} → ${affName.get(r.affiliateId) ?? r.affiliateId} [${r.via}: ${r.detail}]`);
  }

  if (!APPLY) {
    log('dry-run complete — re-run with --apply to write.');
    return;
  }

  let written = 0;
  for (const r of resolutions) {
    // Fill-blank guard makes every write idempotent + race-safe.
    const res = await prisma.lead.updateMany({
      where: { id: r.leadId, affiliateId: null },
      data: { affiliateId: r.affiliateId },
    });
    written += res.count;
  }
  log(`wrote ${written}/${resolutions.length} leads (skips = stamped since scan).`);
}

main()
  .catch((err) => {
    console.error('[backfill-lead-affiliates] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
