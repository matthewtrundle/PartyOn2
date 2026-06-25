/**
 * Internal database rollups for the nightly snapshot + Marketing Director.
 * Pulls what only we have: orders, margins, affiliate attribution, product mix.
 */

import { prisma } from '@/lib/database/client';

export interface ChannelRollup {
  channel: string; // direct | affiliate | group | utm source
  orders: number;
  revenue: number;
  margin: number | null;
  averageOrderValue: number;
  averageMarginPct: number | null;
  /** Weighted average margin coverage % across orders in this bucket. <70 = unreliable margin. */
  marginCoveragePct: number;
}

export interface LandingPageRollup {
  landingPage: string;
  orders: number;
  revenue: number;
  averageOrderValue: number;
}

export interface ProductMarginRow {
  productId: string;
  title: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
  /** % of revenue with known cost — < 100 means margin is partial. */
  marginCoveragePct: number;
}

export interface SegmentRollup {
  segment: string; // bach | wedding | corporate | boat | kegs | general | unknown
  orders: number;
  revenue: number;
  margin: number | null;
  averageOrderValue: number;
  averageMarginPct: number | null;
  marginCoveragePct: number;
}

export interface AffiliateRoiRow {
  affiliateId: string;
  code: string;
  businessName: string;
  orders: number;
  revenue: number;
  margin: number | null;       // sum of Order.marginAmount (null if all orders missing margin)
  commissionPaid: number;      // sum of AffiliateCommission.commissionAmountCents / 100, excluding VOIDED
  netMargin: number | null;    // margin - commissionPaid
  roiPct: number | null;       // (netMargin / commissionPaid) * 100, null if commissionPaid <= 0
  /** Weighted-by-revenue margin coverage % across this affiliate's orders. <70 = ROI unreliable. */
  marginCoveragePct: number;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * `endDaysAgo` lets callers ask for a prior window: e.g. (30, 30) is "30 days ending 30 days ago" —
 * the period we compare today's 30-day rollup against to compute WoW/MoM deltas.
 */
function dateWindow(windowDays: number, endDaysAgo = 0): { gte: Date; lt: Date } {
  return {
    gte: daysAgo(windowDays + endDaysAgo),
    lt: daysAgo(endDaysAgo),
  };
}

/**
 * Revenue/margin split by internal channel bucket.
 * Buckets: affiliate (has affiliateId), group (groupOrderV2Id), utm_<source>, direct.
 */
export async function getChannelRollup(windowDays = 30, endDaysAgo = 0): Promise<ChannelRollup[]> {
  const window = dateWindow(windowDays, endDaysAgo);
  const orders = await prisma.order.findMany({
    where: { createdAt: window, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    select: {
      total: true,
      marginAmount: true,
      marginCoveragePct: true,
      affiliateId: true,
      groupOrderV2Id: true,
      utmSource: true,
    },
  });

  type Bucket = { orders: number; revenue: number; margin: number; marginKnown: number; coveredRevenue: number };
  const buckets = new Map<string, Bucket>();
  for (const o of orders) {
    let channel = 'direct';
    if (o.affiliateId) channel = 'affiliate';
    else if (o.groupOrderV2Id) channel = 'group';
    else if (o.utmSource) channel = `utm_${o.utmSource.toLowerCase()}`;

    const b = buckets.get(channel) ?? { orders: 0, revenue: 0, margin: 0, marginKnown: 0, coveredRevenue: 0 };
    b.orders += 1;
    const total = Number(o.total);
    b.revenue += total;
    const cov = o.marginCoveragePct != null ? Number(o.marginCoveragePct) : 0;
    b.coveredRevenue += total * (cov / 100);
    if (o.marginAmount != null) {
      b.margin += Number(o.marginAmount);
      b.marginKnown += 1;
    }
    buckets.set(channel, b);
  }

  return Array.from(buckets.entries())
    .map(([channel, b]) => ({
      channel,
      orders: b.orders,
      revenue: Number(b.revenue.toFixed(2)),
      margin: b.marginKnown > 0 ? Number(b.margin.toFixed(2)) : null,
      averageOrderValue: b.orders > 0 ? Number((b.revenue / b.orders).toFixed(2)) : 0,
      averageMarginPct:
        b.marginKnown > 0 && b.revenue > 0 ? Number(((b.margin / b.revenue) * 100).toFixed(1)) : null,
      marginCoveragePct: b.revenue > 0 ? Number(((b.coveredRevenue / b.revenue) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getLandingPageRollup(windowDays = 30, endDaysAgo = 0): Promise<LandingPageRollup[]> {
  const window = dateWindow(windowDays, endDaysAgo);
  const orders = await prisma.order.findMany({
    where: {
      createdAt: window,
      landingPage: { not: null },
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
    },
    select: { landingPage: true, total: true },
  });
  const buckets = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    const key = (o.landingPage ?? '/').split('?')[0];
    const b = buckets.get(key) ?? { orders: 0, revenue: 0 };
    b.orders += 1;
    b.revenue += Number(o.total);
    buckets.set(key, b);
  }
  return Array.from(buckets.entries())
    .map(([landingPage, b]) => ({
      landingPage,
      orders: b.orders,
      revenue: Number(b.revenue.toFixed(2)),
      averageOrderValue: Number((b.revenue / b.orders).toFixed(2)),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export interface LandingPagePathsRollup {
  orders: number;
  revenue: number;
  averageOrderValue: number;
}

/**
 * Orders/revenue/AOV for a specific set of landing-page paths, unioned together.
 * Used by the per-landing-page analytics hub, where one page = a canonical route
 * plus alias routes (e.g. /weddings + /austin-wedding-weekend-delivery). Matches
 * `Order.landingPage` on the path portion only (query string stripped), mirroring
 * getLandingPageRollup's bucketing.
 */
export async function getLandingPageRollupForPaths(
  paths: string[],
  windowDays = 30,
  endDaysAgo = 0
): Promise<LandingPagePathsRollup> {
  if (paths.length === 0) return { orders: 0, revenue: 0, averageOrderValue: 0 };
  const window = dateWindow(windowDays, endDaysAgo);
  const wanted = new Set(paths);
  // Push the path filter into the query (startsWith catches `/weddings?utm=...`
  // query-string variants) so we don't scan every order in the window; the JS
  // `split('?')` check below is the precise filter that rejects `/weddings-foo`.
  const orders = await prisma.order.findMany({
    where: {
      createdAt: window,
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
      OR: paths.map((p) => ({ landingPage: { startsWith: p } })),
    },
    select: { landingPage: true, total: true },
  });

  let count = 0;
  let revenue = 0;
  for (const o of orders) {
    const key = (o.landingPage ?? '/').split('?')[0];
    if (!wanted.has(key)) continue;
    count += 1;
    revenue += Number(o.total);
  }
  return {
    orders: count,
    revenue: Number(revenue.toFixed(2)),
    averageOrderValue: count > 0 ? Number((revenue / count).toFixed(2)) : 0,
  };
}

/**
 * Revenue/margin/AOV split by customer segment (bach/wedding/corporate/boat/kegs/general).
 * Reads `Order.segment` directly — populated at order creation by classifySegment(); rows
 * with null segment (older orders that haven't been backfilled yet) are bucketed as 'unknown'.
 */
export async function getSegmentRollup(windowDays = 30, endDaysAgo = 0): Promise<SegmentRollup[]> {
  const window = dateWindow(windowDays, endDaysAgo);
  const orders = await prisma.order.findMany({
    where: { createdAt: window, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    select: { segment: true, total: true, marginAmount: true, marginCoveragePct: true },
  });

  type Bucket = { orders: number; revenue: number; margin: number; marginKnown: number; coveredRevenue: number };
  const buckets = new Map<string, Bucket>();
  for (const o of orders) {
    const seg = o.segment ?? 'unknown';
    const b = buckets.get(seg) ?? { orders: 0, revenue: 0, margin: 0, marginKnown: 0, coveredRevenue: 0 };
    b.orders += 1;
    const total = Number(o.total);
    b.revenue += total;
    const cov = o.marginCoveragePct != null ? Number(o.marginCoveragePct) : 0;
    b.coveredRevenue += total * (cov / 100);
    if (o.marginAmount != null) {
      b.margin += Number(o.marginAmount);
      b.marginKnown += 1;
    }
    buckets.set(seg, b);
  }

  return Array.from(buckets.entries())
    .map(([segment, b]) => ({
      segment,
      orders: b.orders,
      revenue: Number(b.revenue.toFixed(2)),
      margin: b.marginKnown > 0 ? Number(b.margin.toFixed(2)) : null,
      averageOrderValue: b.orders > 0 ? Number((b.revenue / b.orders).toFixed(2)) : 0,
      averageMarginPct:
        b.marginKnown > 0 && b.revenue > 0 ? Number(((b.margin / b.revenue) * 100).toFixed(1)) : null,
      marginCoveragePct: b.revenue > 0 ? Number(((b.coveredRevenue / b.revenue) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Per-affiliate ROI: revenue/margin attributed via Affiliate.code vs commission paid out.
 * Joins Order.affiliateId with AffiliateCommission to compute net margin and ROI%.
 * Excludes VOIDED commissions; HELD/CONFIRMED/PAID all count as paid (or owed).
 */
export async function getAffiliateRoi(windowDays = 30, endDaysAgo = 0): Promise<AffiliateRoiRow[]> {
  const window = dateWindow(windowDays, endDaysAgo);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: window,
      affiliateId: { not: null },
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
    },
    select: {
      id: true,
      total: true,
      marginAmount: true,
      marginCoveragePct: true,
      affiliateId: true,
      affiliate: { select: { id: true, code: true, businessName: true } },
    },
  });

  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const commissions = await prisma.affiliateCommission.findMany({
    where: { orderId: { in: orderIds }, status: { not: 'VOID' } },
    select: { affiliateId: true, commissionAmountCents: true },
  });

  type Bucket = {
    affiliateId: string;
    code: string;
    businessName: string;
    orders: number;
    revenue: number;
    margin: number;
    marginKnown: number;
    commissionCents: number;
    coveredRevenue: number;
  };
  const buckets = new Map<string, Bucket>();

  for (const o of orders) {
    if (!o.affiliate) continue;
    const aId = o.affiliate.id;
    const b = buckets.get(aId) ?? {
      affiliateId: aId,
      code: o.affiliate.code,
      businessName: o.affiliate.businessName,
      orders: 0,
      revenue: 0,
      margin: 0,
      marginKnown: 0,
      commissionCents: 0,
      coveredRevenue: 0,
    };
    b.orders += 1;
    const total = Number(o.total);
    b.revenue += total;
    const cov = o.marginCoveragePct != null ? Number(o.marginCoveragePct) : 0;
    b.coveredRevenue += total * (cov / 100);
    if (o.marginAmount != null) {
      b.margin += Number(o.marginAmount);
      b.marginKnown += 1;
    }
    buckets.set(aId, b);
  }

  for (const c of commissions) {
    const b = buckets.get(c.affiliateId);
    if (b) b.commissionCents += c.commissionAmountCents;
  }

  return Array.from(buckets.values())
    .map((b) => {
      const margin = b.marginKnown > 0 ? Number(b.margin.toFixed(2)) : null;
      const commissionPaid = Number((b.commissionCents / 100).toFixed(2));
      const netMargin = margin != null ? Number((margin - commissionPaid).toFixed(2)) : null;
      const roiPct =
        netMargin != null && commissionPaid > 0
          ? Number(((netMargin / commissionPaid) * 100).toFixed(1))
          : null;
      return {
        affiliateId: b.affiliateId,
        code: b.code,
        businessName: b.businessName,
        orders: b.orders,
        revenue: Number(b.revenue.toFixed(2)),
        margin,
        commissionPaid,
        netMargin,
        roiPct,
        marginCoveragePct: b.revenue > 0 ? Number(((b.coveredRevenue / b.revenue) * 100).toFixed(1)) : 0,
      };
    })
    .sort((a, b) => (b.netMargin ?? -Infinity) - (a.netMargin ?? -Infinity));
}

export async function getProductMargins(
  windowDays = 30,
  limit = 25,
  endDaysAgo = 0
): Promise<ProductMarginRow[]> {
  const window = dateWindow(windowDays, endDaysAgo);
  const items = await prisma.orderItem.findMany({
    where: {
      createdAt: window,
      order: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    },
    select: {
      productId: true,
      quantity: true,
      totalPrice: true,
      totalCost: true,
      product: { select: { title: true } },
    },
  });

  type Agg = ProductMarginRow & { coveredRevenue: number };
  const agg = new Map<string, Agg>();
  for (const i of items) {
    const row = agg.get(i.productId) ?? {
      productId: i.productId,
      title: i.product?.title ?? '(unknown)',
      unitsSold: 0,
      revenue: 0,
      cost: 0,
      margin: 0,
      marginPct: 0,
      marginCoveragePct: 0,
      coveredRevenue: 0,
    };
    row.unitsSold += i.quantity;
    row.revenue += Number(i.totalPrice);
    if (i.totalCost != null) {
      row.cost += Number(i.totalCost);
      row.coveredRevenue += Number(i.totalPrice);
    }
    agg.set(i.productId, row);
  }

  return Array.from(agg.values())
    .map((r) => {
      // Use covered-revenue as denominator so marginPct reflects margin on items where cost is known —
      // mixing known-cost margin with full revenue (which used to happen here) produced bogus low margins.
      const margin = r.coveredRevenue - r.cost;
      const denom = r.coveredRevenue > 0 ? r.coveredRevenue : r.revenue;
      return {
        productId: r.productId,
        title: r.title,
        unitsSold: r.unitsSold,
        revenue: Number(r.revenue.toFixed(2)),
        cost: Number(r.cost.toFixed(2)),
        margin: Number(margin.toFixed(2)),
        marginPct: denom > 0 ? Number(((margin / denom) * 100).toFixed(1)) : 0,
        marginCoveragePct: r.revenue > 0 ? Number(((r.coveredRevenue / r.revenue) * 100).toFixed(1)) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
