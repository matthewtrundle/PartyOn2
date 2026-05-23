/**
 * Drift-signal detectors — batch A (signals 1-5).
 *
 *  1. receiving-lag           ReceivingInvoice.status='PENDING_REVIEW' AND createdAt < now-24h
 *  2. pick-inventory-lag      OrderItemPickState.packed=true, ≥24h old, no matching pack movement
 *  3. repeated-shorts         Same variantId shorted on ≥2 distinct orders in last 7d
 *  4. negative-available      committedQuantity > inventoryQuantity for any variant
 *  5. velocity-anomaly        Variant ≥4 units in 30d, then 0 in last 14d, parent ACTIVE
 *
 * See docs/OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md §6 for the full spec.
 */

import { prisma } from '@/lib/database/client';
import type { OperationsRecommendationInput } from '../types';
import { DAY_MS, HOUR_MS, formatGroupLabel, resolveOrderLabel } from '../detector-helpers';

/** Signal #1: receiving invoices stuck in PENDING_REVIEW for ≥24 hours. */
export async function detectReceivingLag(now: Date = new Date()): Promise<OperationsRecommendationInput[]> {
  const cutoff = new Date(now.getTime() - 24 * HOUR_MS);
  const stuck = await prisma.receivingInvoice.findMany({
    where: { status: 'PENDING_REVIEW', createdAt: { lt: cutoff } },
    select: { id: true, distributorName: true, invoiceNumber: true, createdAt: true },
  });
  return stuck.map((inv) => {
    const hours = Math.round((now.getTime() - inv.createdAt.getTime()) / HOUR_MS);
    const distributor = inv.distributorName ?? 'Unknown distributor';
    return {
      signalKind: 'receiving-lag' as const,
      severity: 'high' as const,
      title: `Receiving invoice ${inv.invoiceNumber ?? '(unnumbered)'} stuck in PENDING_REVIEW (${hours}h, ${distributor})`,
      evidence: [
        {
          metricName: 'hours_pending',
          metricValue: hours,
          sourceLinks: [{ label: 'Open receiving invoice', href: `/ops/inventory/receiving/${inv.id}` }],
        },
        { note: `Distributor: ${distributor}` },
      ],
      targetEntityType: 'receivingInvoice' as const,
      targetEntityId: inv.id,
      actionPayload: {
        kind: 'navigate',
        label: 'Open receiving',
        params: { href: `/ops/inventory/receiving/${inv.id}` },
      },
    };
  });
}

/**
 * Signal #2: packed ≥24h ago but inventory hasn't decremented. After the
 * pre-Phase-1 wiring, every packed order also writes an InventoryMovement row
 * with reason starting with 'pack'. So "lag" = packed pick state exists ≥24h
 * old AND no movement row with reference to this order. Catches backfill +
 * any future bugs.
 */
export async function detectPickInventoryLag(now: Date = new Date()): Promise<OperationsRecommendationInput[]> {
  const cutoff = new Date(now.getTime() - 24 * HOUR_MS);
  const picks = await prisma.orderItemPickState.findMany({
    where: { packed: true, updatedAt: { lt: cutoff } },
    select: { orderId: true, itemKey: true, shortBy: true, updatedAt: true },
    take: 500,
  });
  const byOrder = new Map<string, { count: number; oldest: Date }>();
  for (const p of picks) {
    const cur = byOrder.get(p.orderId);
    if (!cur) byOrder.set(p.orderId, { count: 1, oldest: p.updatedAt });
    else {
      cur.count += 1;
      if (p.updatedAt < cur.oldest) cur.oldest = p.updatedAt;
    }
  }
  const recs: OperationsRecommendationInput[] = [];
  for (const [orderId, agg] of byOrder.entries()) {
    const moved = await prisma.inventoryMovement.findFirst({
      where: { referenceId: orderId, reason: { contains: 'pack', mode: 'insensitive' } },
      select: { id: true },
    });
    if (moved) continue;
    const label = await resolveOrderLabel(orderId);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    });
    const hours = Math.round((now.getTime() - agg.oldest.getTime()) / HOUR_MS);
    recs.push({
      signalKind: 'pick-inventory-lag',
      severity: 'high',
      title: `Order #${order?.orderNumber ?? orderId.slice(0, 8)} (${formatGroupLabel(label)}) — packed ${hours}h ago, inventory not decremented`,
      evidence: [
        { metricName: 'packed_lines', metricValue: agg.count },
        { metricName: 'hours_since_pack', metricValue: hours },
        { note: `Manifest: ${formatGroupLabel(label)}`, sourceLinks: [{ label: 'Open order', href: `/ops/orders/${orderId}` }] },
      ],
      targetEntityType: 'order',
      targetEntityId: orderId,
      actionPayload: {
        kind: 'apiCall',
        label: 'Reconcile pick → inventory',
        params: { method: 'POST', path: `/api/admin/operations/recommendations/reconcile-pack`, body: { orderId } },
      },
    });
  }
  return recs;
}

/**
 * Signal #3: same variant shorted on ≥2 distinct orders in last 7 days.
 *
 * Known gap: the SQL joins `order_items oi ON oi.title = pks.item_key`, but
 * `OrderItemPickState.item_key` for bundle components is
 * `${itemTitle}::${bundleComponentTitle}` (see pick-inventory-service.ts:9–11).
 * Those rows won't match a line item directly and shorts on bundle components
 * are dropped here. Acceptable for now — bundle components are a minority and
 * their parent line still gets counted. Revisit when bundles drive enough
 * shorts to matter.
 */
export async function detectRepeatedShorts(now: Date = new Date()): Promise<OperationsRecommendationInput[]> {
  const cutoff = new Date(now.getTime() - 7 * DAY_MS);
  const rows = await prisma.$queryRawUnsafe<Array<{ variant_id: string; title: string; orders: bigint; total_short: bigint }>>(
    `SELECT oi.variant_id AS variant_id,
            MIN(oi.title) AS title,
            COUNT(DISTINCT pks.order_id)::bigint AS orders,
            SUM(pks.short_by)::bigint AS total_short
       FROM order_item_pick_states pks
       JOIN orders o ON o.id = pks.order_id
       JOIN order_items oi ON oi.order_id = pks.order_id AND oi.title = pks.item_key
      WHERE pks.short_by > 0
        AND pks.updated_at >= $1::timestamp
        AND o.financial_status = 'PAID'
      GROUP BY oi.variant_id
     HAVING COUNT(DISTINCT pks.order_id) >= 2`,
    cutoff
  );
  return rows.map((r) => ({
    signalKind: 'repeated-shorts' as const,
    severity: 'high' as const,
    title: `${r.title}: short on ${Number(r.orders)} orders this week (${Number(r.total_short)} units short total)`,
    evidence: [
      { metricName: 'orders_shorted_7d', metricValue: Number(r.orders) },
      { metricName: 'total_units_short', metricValue: Number(r.total_short) },
      { note: 'Likely ledger drift — physical count recommended', sourceLinks: [{ label: 'Open variant in ops', href: `/ops/inventory?variantId=${r.variant_id}` }] },
    ],
    targetEntityType: 'productVariant' as const,
    targetEntityId: r.variant_id,
    actionPayload: {
      kind: 'navigate',
      label: 'Mark for count',
      params: { href: `/ops/inventory?openNoteFor=${r.variant_id}&prefill=Repeated+shorts+this+week+%E2%80%94+counted` },
    },
  }));
}

/** Signal #4: variants with committed > on-hand. Urgent — math is broken. */
export async function detectNegativeAvailable(): Promise<OperationsRecommendationInput[]> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; title: string; product_title: string; inventory_quantity: number; committed_quantity: number }>
  >(
    `SELECT v.id AS id, v.title AS title, p.title AS product_title,
            v.inventory_quantity, v.committed_quantity
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
      WHERE v.track_inventory = TRUE
        AND v.committed_quantity > v.inventory_quantity
      LIMIT 200`
  );
  return rows.map((r) => {
    const deficit = r.committed_quantity - r.inventory_quantity;
    const display = `${r.product_title}${r.title && r.title !== 'Default' ? ` (${r.title})` : ''}`;
    // Tier by shortfall magnitude — a 1-unit short is picker noise, a 6+ short
    // means we likely can't fulfill without intervention.
    const severity: 'urgent' | 'high' | 'normal' =
      deficit >= 6 ? 'urgent' : deficit >= 2 ? 'high' : 'normal';
    return {
      signalKind: 'negative-available' as const,
      severity,
      title: `${display}: ${deficit} units committed but not on hand (in-stock ${r.inventory_quantity}, committed ${r.committed_quantity})`,
      evidence: [
        { metricName: 'in_stock', metricValue: r.inventory_quantity },
        { metricName: 'committed', metricValue: r.committed_quantity },
        { metricName: 'deficit', metricValue: deficit, sourceLinks: [{ label: 'Open variant', href: `/ops/inventory?variantId=${r.id}` }] },
      ],
      targetEntityType: 'productVariant' as const,
      targetEntityId: r.id,
      actionPayload: {
        kind: 'navigate',
        label: 'Count + adjust',
        params: { href: `/ops/inventory?openNoteFor=${r.id}&prefill=Counted+%5BN%5D+units+%28negative+available+detected%29` },
      },
    };
  });
}

/**
 * Signal #5: variant sold steadily in last 30d, then went silent for 14d, no
 * status change on the parent product. "Steadily" = ≥4 units in 30d.
 */
export async function detectVelocityAnomaly(now: Date = new Date()): Promise<OperationsRecommendationInput[]> {
  const start30 = new Date(now.getTime() - 30 * DAY_MS);
  const start14 = new Date(now.getTime() - 14 * DAY_MS);
  const rows = await prisma.$queryRawUnsafe<
    Array<{ variant_id: string; title: string; product_title: string; units_30d: bigint; units_last_14d: bigint }>
  >(
    `WITH v_sales AS (
       SELECT oi.variant_id, SUM(oi.quantity)::bigint AS units_30d,
              SUM(CASE WHEN o.created_at >= $1::timestamp THEN oi.quantity ELSE 0 END)::bigint AS units_last_14d
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE o.financial_status = 'PAID'
          AND o.created_at >= $2::timestamp
        GROUP BY oi.variant_id
     )
     SELECT v_sales.variant_id, v.title AS title, p.title AS product_title,
            v_sales.units_30d, v_sales.units_last_14d
       FROM v_sales
       JOIN product_variants v ON v.id = v_sales.variant_id
       JOIN products p ON p.id = v.product_id
      WHERE v_sales.units_30d >= 4
        AND v_sales.units_last_14d = 0
        AND p.status = 'ACTIVE'
      LIMIT 50`,
    start14,
    start30
  );
  return rows.map((r) => ({
    signalKind: 'velocity-anomaly' as const,
    severity: 'normal' as const,
    title: `${r.product_title}${r.title && r.title !== 'Default' ? ` (${r.title})` : ''}: ${Number(r.units_30d)} units in prior 30d, 0 in last 14d`,
    evidence: [
      { metricName: 'units_30d', metricValue: Number(r.units_30d) },
      { metricName: 'units_last_14d', metricValue: 0 },
      { note: 'Possible mis-mapping or seasonality — audit variant', sourceLinks: [{ label: 'Open variant', href: `/ops/inventory?variantId=${r.variant_id}` }] },
    ],
    targetEntityType: 'productVariant' as const,
    targetEntityId: r.variant_id,
    actionPayload: {
      kind: 'navigate',
      label: 'Audit variant',
      params: { href: `/ops/inventory?variantId=${r.variant_id}` },
    },
  }));
}
