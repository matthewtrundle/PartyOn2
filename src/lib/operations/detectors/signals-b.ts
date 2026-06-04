/**
 * Drift-signal detectors — batch B (signals 6-9 + pre-fulfillment shortage).
 *
 *  6. ai-note-backlog         InventoryNote.status='pending' AND createdAt < now-24h
 *  7. variant-mismapping      Sibling has growing committed without sales
 *  8. cost-coverage-gap       Variant ≥5 units sold in 30d but costPerUnit IS NULL
 *  9. cycle-count-overdue     Top-20 by 14d volume with no count movement in 7d
 * 10. pre-fulfillment-shortage Any PAID order line in next 14d with available < 0
 *
 * See docs/OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md §6 for the full spec.
 */

import { prisma } from '@/lib/database/client';
import type { OperationsRecommendationInput } from '../types';
import { DAY_MS, HOUR_MS } from '../detector-helpers';

/** Signal #6: inventory notes stuck in pending ≥24h. */
export async function detectAiNoteBacklog(now: Date = new Date()): Promise<OperationsRecommendationInput[]> {
  const cutoff = new Date(now.getTime() - 24 * HOUR_MS);
  const notes = await prisma.inventoryNote.findMany({
    where: { status: 'pending', createdAt: { lt: cutoff } },
    select: { id: true, content: true, createdAt: true },
    take: 100,
  });
  return notes.map((n) => {
    const hours = Math.round((now.getTime() - n.createdAt.getTime()) / HOUR_MS);
    const preview = n.content.length > 70 ? `${n.content.slice(0, 67)}…` : n.content;
    return {
      signalKind: 'ai-note-backlog' as const,
      severity: 'high' as const,
      title: `Inventory note pending ${hours}h: "${preview}"`,
      evidence: [
        { metricName: 'hours_pending', metricValue: hours },
        { note: preview, sourceLinks: [{ label: 'Review and apply', href: `/ops/inventory?openNote=${n.id}` }] },
      ],
      targetEntityType: 'inventoryNote' as const,
      targetEntityId: n.id,
      actionPayload: {
        kind: 'navigate',
        label: 'Review and apply',
        params: { href: `/ops/inventory?openNote=${n.id}` },
      },
    };
  });
}

/**
 * Signal #7: sibling-variant mismapping. Variant A has 30d sales; sibling B
 * (same product) has growing committed_quantity but no sales — orders likely
 * binding to the wrong variant.
 */
export async function detectVariantMismapping(now: Date = new Date()): Promise<OperationsRecommendationInput[]> {
  const start = new Date(now.getTime() - 30 * DAY_MS);
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      product_id: string;
      product_title: string;
      suspect_variant_id: string;
      suspect_title: string;
      suspect_committed: number;
      sibling_variant_id: string;
      sibling_title: string;
      sibling_units_30d: bigint;
    }>
  >(
    `WITH sales AS (
       SELECT oi.variant_id, oi.product_id, SUM(oi.quantity)::bigint AS units
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE o.financial_status = 'PAID' AND o.created_at >= $1::timestamp
        GROUP BY oi.variant_id, oi.product_id
     )
     SELECT v_sus.product_id, p.title AS product_title,
            v_sus.id AS suspect_variant_id, v_sus.title AS suspect_title,
            v_sus.committed_quantity AS suspect_committed,
            v_sib.id AS sibling_variant_id, v_sib.title AS sibling_title,
            COALESCE(sales.units, 0)::bigint AS sibling_units_30d
       FROM product_variants v_sus
       JOIN product_variants v_sib ON v_sib.product_id = v_sus.product_id AND v_sib.id <> v_sus.id
       JOIN products p ON p.id = v_sus.product_id
       LEFT JOIN sales ON sales.variant_id = v_sib.id
      WHERE v_sus.track_inventory = TRUE
        AND v_sus.committed_quantity >= 5
        AND COALESCE((SELECT units FROM sales s WHERE s.variant_id = v_sus.id), 0) = 0
        AND COALESCE(sales.units, 0) > 0
      LIMIT 30`,
    start
  );
  const seen = new Set<string>();
  const recs: OperationsRecommendationInput[] = [];
  for (const r of rows) {
    if (seen.has(r.suspect_variant_id)) continue;
    seen.add(r.suspect_variant_id);
    recs.push({
      signalKind: 'variant-mismapping',
      severity: 'normal',
      title: `${r.product_title}: ${r.suspect_title} has ${r.suspect_committed} committed but 0 sales — sibling ${r.sibling_title} sold ${Number(r.sibling_units_30d)}`,
      evidence: [
        { metricName: 'suspect_committed', metricValue: r.suspect_committed },
        { metricName: 'sibling_units_30d', metricValue: Number(r.sibling_units_30d) },
        { note: 'Likely binding error — verify variant IDs match Shopify', sourceLinks: [
          { label: 'Open suspect variant', href: `/ops/inventory?variantId=${r.suspect_variant_id}` },
          { label: 'Open sibling', href: `/ops/inventory?variantId=${r.sibling_variant_id}` },
        ] },
      ],
      targetEntityType: 'productVariant',
      targetEntityId: r.suspect_variant_id,
      actionPayload: {
        kind: 'navigate',
        label: 'Audit variant binding',
        params: { href: `/ops/inventory?variantId=${r.suspect_variant_id}&sibling=${r.sibling_variant_id}` },
      },
    });
  }
  return recs;
}

/** Signal #8: high-velocity variants with no cost — blocks margin attribution. */
export async function detectCostCoverageGap(now: Date = new Date()): Promise<OperationsRecommendationInput[]> {
  const start = new Date(now.getTime() - 30 * DAY_MS);
  const rows = await prisma.$queryRawUnsafe<
    Array<{ variant_id: string; title: string; product_title: string; units_30d: bigint }>
  >(
    `SELECT oi.variant_id AS variant_id, MIN(v.title) AS title, MIN(p.title) AS product_title,
            SUM(oi.quantity)::bigint AS units_30d
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN product_variants v ON v.id = oi.variant_id
       JOIN products p ON p.id = v.product_id
      WHERE o.financial_status = 'PAID'
        AND o.created_at >= $1::timestamp
        AND v.cost_per_unit IS NULL
      GROUP BY oi.variant_id
     HAVING SUM(oi.quantity) >= 5
      ORDER BY SUM(oi.quantity) DESC
      LIMIT 50`,
    start
  );
  // Cap to the top 15 movers — the long tail clogs the triage queue without
  // adding signal. Remaining uncosted variants still count toward
  // costCoveragePct, just not the rec queue.
  return rows.slice(0, 15).map((r) => ({
    signalKind: 'cost-coverage-gap' as const,
    severity: 'normal' as const,
    title: `${r.product_title}${r.title && r.title !== 'Default' ? ` (${r.title})` : ''}: ${Number(r.units_30d)} units sold in 30d, no cost set`,
    evidence: [
      { metricName: 'units_30d', metricValue: Number(r.units_30d) },
      { note: 'Margin/ROI math depends on this cost being populated', sourceLinks: [{ label: 'Open variant', href: `/ops/inventory?variantId=${r.variant_id}` }] },
    ],
    targetEntityType: 'productVariant' as const,
    targetEntityId: r.variant_id,
    actionPayload: {
      kind: 'navigate',
      label: 'Enter cost',
      params: { href: `/ops/inventory?variantId=${r.variant_id}&editCost=1` },
    },
  }));
}

/**
 * Signal #9: top-20 by unit volume (trailing 14d) with no count-flavored
 * InventoryMovement in last 7d.
 */
export async function detectCycleCountOverdue(now: Date = new Date()): Promise<OperationsRecommendationInput[]> {
  const start14 = new Date(now.getTime() - 14 * DAY_MS);
  const start7 = new Date(now.getTime() - 7 * DAY_MS);
  const top = await prisma.$queryRawUnsafe<
    Array<{ variant_id: string; title: string; product_title: string; units_14d: bigint }>
  >(
    `SELECT oi.variant_id AS variant_id, MIN(v.title) AS title, MIN(p.title) AS product_title,
            SUM(oi.quantity)::bigint AS units_14d
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN product_variants v ON v.id = oi.variant_id
       JOIN products p ON p.id = v.product_id
      WHERE o.financial_status = 'PAID'
        AND o.created_at >= $1::timestamp
        AND v.track_inventory = TRUE
      GROUP BY oi.variant_id
      ORDER BY SUM(oi.quantity) DESC
      LIMIT 20`,
    start14
  );
  const recs: OperationsRecommendationInput[] = [];
  for (const r of top) {
    const recentCount = await prisma.inventoryMovement.findFirst({
      where: {
        variantId: r.variant_id,
        createdAt: { gte: start7 },
        OR: [
          { type: 'AI_COUNT' },
          { type: 'ADJUSTMENT', reason: { contains: 'count', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (recentCount) continue;
    recs.push({
      signalKind: 'cycle-count-overdue',
      severity: 'normal',
      title: `${r.product_title}${r.title && r.title !== 'Default' ? ` (${r.title})` : ''}: top mover (${Number(r.units_14d)} units in 14d), not counted in ≥7d`,
      evidence: [
        { metricName: 'units_14d', metricValue: Number(r.units_14d) },
        { note: 'Recommend physical count to keep ledger honest', sourceLinks: [{ label: 'Open variant', href: `/ops/inventory?variantId=${r.variant_id}` }] },
      ],
      targetEntityType: 'productVariant',
      targetEntityId: r.variant_id,
      actionPayload: {
        kind: 'navigate',
        label: 'Mark counted',
        params: { href: `/ops/inventory?openNoteFor=${r.variant_id}&prefill=Counted+%5BN%5D+units` },
      },
    });
  }
  return recs;
}

/**
 * Pre-fulfillment shortage: ANY variant in a PAID order in the next 14 days with
 * available < 0. Urgent — operator needs to order or substitute.
 */
export async function detectPreFulfillmentShortage(now: Date = new Date()): Promise<OperationsRecommendationInput[]> {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 14);
  end.setUTCHours(23, 59, 59, 999);
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      variant_id: string;
      title: string;
      product_title: string;
      demand: bigint;
      available: number;
      earliest: Date;
    }>
  >(
    `SELECT oi.variant_id AS variant_id, MIN(v.title) AS title, MIN(p.title) AS product_title,
            SUM(oi.quantity)::bigint AS demand,
            MIN(v.inventory_quantity - v.committed_quantity) AS available,
            MIN(o.delivery_date) AS earliest
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN product_variants v ON v.id = oi.variant_id
       JOIN products p ON p.id = v.product_id
      WHERE o.financial_status = 'PAID'
        AND o.status <> 'CANCELLED'
        AND o.delivery_date >= $1::timestamp
        AND o.delivery_date <= $2::timestamp
        AND v.track_inventory = TRUE
      GROUP BY oi.variant_id
     HAVING MIN(v.inventory_quantity - v.committed_quantity) < 0`,
    start,
    end
  );
  return rows.map((r) => ({
    signalKind: 'pre-fulfillment-shortage' as const,
    severity: 'urgent' as const,
    title: `${r.product_title}${r.title && r.title !== 'Default' ? ` (${r.title})` : ''}: short by ${Math.abs(r.available)} for paid orders by ${r.earliest.toISOString().slice(0, 10)}`,
    evidence: [
      { metricName: 'paid_demand_14d', metricValue: Number(r.demand) },
      { metricName: 'available', metricValue: r.available },
      { metricName: 'earliest_delivery', metricValue: r.earliest.toISOString().slice(0, 10), sourceLinks: [{ label: 'Open purchase plan', href: `/ops/inventory?variantId=${r.variant_id}&plan=1` }] },
    ],
    targetEntityType: 'productVariant' as const,
    targetEntityId: r.variant_id,
    actionPayload: {
      kind: 'navigate',
      label: 'Open in purchase plan',
      params: { href: `/ops/inventory?variantId=${r.variant_id}&plan=1` },
    },
  }));
}
