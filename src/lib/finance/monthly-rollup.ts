/**
 * Monthly trajectory rollup builder (Phase 5C).
 *
 * Computes one month's finance picture by UNIONing the two revenue eras
 * (ShopifyOrderArchive ≤2025-12 + Order ≥2026-01, deduped on the rare overlap)
 * and layering QB OpEx where available. Profit fields stay null when the data
 * is incomplete; `dataHealth` records WHY so the briefing renders honestly
 * instead of inventing a number.
 *
 * Pure compute + read-only — persistence is the caller's job
 * (scripts/finance/backfill-monthly-rollups.ts + the cron).
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { segmentForOrder, segmentForArchive, type Segment } from './order-segment';
import {
  isOperatingExpense,
  CATEGORY_LABELS,
  type CategorySlug,
} from './qb-account-map';
import { reconcileBankIncome, type BankIncomeRecon } from './bank-income-recon';

const SEGMENTS: readonly Segment[] = ['bach', 'wedding', 'corporate', 'boat', 'kegs', 'general'];
const TOP_N = 10;

/**
 * QB is the expense source for a month only when it has MATERIAL expenses — the
 * sum of QB expenses in categories OTHER than auto-posted `payment_fees` must
 * clear this floor. Below it (e.g. 2026's ~$1,700/mo of Shopify selling fees),
 * the bank feed is the real expense source. Without this guard those auto-posted
 * fee rows would falsely "win" a `qbExpenses.length > 0` test and hide the real
 * bank expenses. Never blend the two — QB's own bank feed sees the same
 * transactions Plaid does, so blending would double-count.
 */
const QB_MATERIAL_FLOOR_CENTS = 50_000; // $500

/**
 * Whether QuickBooks has MATERIAL expense data for a month — the test that picks
 * QB vs the bank feed as the expense source. Sums QB expenses in categories OTHER
 * than auto-posted `payment_fees`; a bare `qbExpenses.length > 0` would let
 * 2026's ~$1,700/mo of Shopify-fee rows falsely win and hide the real bank
 * expenses (the precedence trap — risk #1).
 */
export function isQbMaterial(
  qbExpenses: { amountCents: number; categorySlug: string | null }[]
): boolean {
  const materialCents = qbExpenses
    .filter((e) => e.categorySlug !== 'payment_fees')
    .reduce((s, e) => s + e.amountCents, 0);
  return materialCents >= QB_MATERIAL_FLOOR_CENTS;
}

export interface SkuRow { sku: string | null; title: string; revenueCents: number; qty: number }
export interface CustomerRow { name: string; email: string; revenueCents: number; orderCount: number }
export interface AffiliateRow { code: string; name: string; revenueCents: number; commissionCents: number }
export interface ExpenseCatRow {
  category: CategorySlug;
  label: string;
  cents: number;
  topVendor: string | null;
  topVendorCents: number;
}
export interface SegmentStat { revenueCents: number; orderCount: number }

export interface MonthlyRollupResult {
  year: number;
  month: number;
  revenueCents: number;
  orderCount: number;
  revenueFromShopifyCents: number;
  revenueFromOrdersCents: number;
  cogsCents: number | null;
  grossProfitCents: number | null;
  opexCents: number | null;
  netIncomeCents: number | null;
  topSkus: SkuRow[];
  segmentBreakdown: Record<Segment, SegmentStat>;
  topCustomers: CustomerRow[];
  topAffiliates: AffiliateRow[];
  expenseCategories: ExpenseCatRow[];
  dataHealth: Record<string, unknown>;
}

function monthWindow(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export interface YearMonth { year: number; month: number }

/** Inclusive list of {year,month} from start to end. */
export function enumerateMonths(start: YearMonth, end: YearMonth): YearMonth[] {
  const out: YearMonth[] = [];
  let y = start.year;
  let m = start.month;
  while (y < end.year || (y === end.year && m <= end.month)) {
    out.push({ year: y, month: m });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/** Earliest month that has revenue in either era, for full-history backfill. */
export async function earliestDataMonth(): Promise<YearMonth> {
  const [arch, order] = await Promise.all([
    prisma.shopifyOrderArchive.findFirst({ orderBy: { processedAt: 'asc' }, select: { processedAt: true } }),
    prisma.order.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
  ]);
  const dates = [arch?.processedAt, order?.createdAt].filter((d): d is Date => !!d);
  if (dates.length === 0) {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  }
  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  return { year: min.getUTCFullYear(), month: min.getUTCMonth() + 1 };
}

function toBigIntOrNull(n: number | null): bigint | null {
  return n === null ? null : BigInt(Math.round(n));
}

/** Upsert a computed rollup into finance_monthly_rollup (keyed on year+month). */
export async function persistMonthlyRollup(r: MonthlyRollupResult): Promise<void> {
  const data = {
    revenueCents: BigInt(r.revenueCents),
    orderCount: r.orderCount,
    cogsCents: toBigIntOrNull(r.cogsCents),
    grossProfitCents: toBigIntOrNull(r.grossProfitCents),
    opexCents: toBigIntOrNull(r.opexCents),
    netIncomeCents: toBigIntOrNull(r.netIncomeCents),
    revenueFromShopifyCents: BigInt(r.revenueFromShopifyCents),
    revenueFromOrdersCents: BigInt(r.revenueFromOrdersCents),
    topSkus: r.topSkus as unknown as Prisma.InputJsonValue,
    segmentBreakdown: r.segmentBreakdown as unknown as Prisma.InputJsonValue,
    topCustomers: r.topCustomers as unknown as Prisma.InputJsonValue,
    topAffiliates: r.topAffiliates as unknown as Prisma.InputJsonValue,
    expenseCategories: r.expenseCategories as unknown as Prisma.InputJsonValue,
    dataHealth: r.dataHealth as Prisma.InputJsonValue,
    computedAt: new Date(),
  };
  await prisma.financeMonthlyRollup.upsert({
    where: { year_month: { year: r.year, month: r.month } },
    create: { year: r.year, month: r.month, ...data },
    update: data,
  });
}

function decToCents(d: Prisma.Decimal | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return Math.round(Number(d) * 100);
}

function emptySegments(): Record<Segment, SegmentStat> {
  const out = {} as Record<Segment, SegmentStat>;
  for (const s of SEGMENTS) out[s] = { revenueCents: 0, orderCount: 0 };
  return out;
}

export async function computeMonthlyRollup(
  year: number,
  month: number
): Promise<MonthlyRollupResult> {
  const { start, end } = monthWindow(year, month);

  const [orders, archive, commissions, qbExpenses] = await Promise.all([
    prisma.order.findMany({
      where: { financialStatus: 'PAID', createdAt: { gte: start, lt: end } },
      select: {
        total: true,
        customerName: true,
        customerEmail: true,
        landingPage: true,
        utmCampaign: true,
        segment: true,
        shopifyOrderId: true,
        groupOrderV2: { select: { name: true } },
        items: { select: { sku: true, title: true, totalPrice: true, totalCost: true, quantity: true } },
      },
    }),
    prisma.shopifyOrderArchive.findMany({
      where: { financialStatus: 'PAID', processedAt: { gte: start, lt: end } },
      select: {
        shopifyOrderId: true,
        totalPriceCents: true,
        sourceName: true,
        note: true,
        tags: true,
        lineItems: true,
      },
    }),
    prisma.affiliateCommission.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: {
        commissionAmountCents: true,
        affiliate: { select: { code: true, businessName: true } },
        order: { select: { total: true } },
      },
    }),
    prisma.qbExpense.findMany({
      where: { txnDate: { gte: start, lt: end } },
      select: { amountCents: true, categorySlug: true, vendorName: true },
    }),
  ]);

  // Dedup: skip archive rows that are also represented in the Order table.
  const orderShopifyIds = new Set(
    orders.map((o) => o.shopifyOrderId).filter((x): x is string => !!x)
  );
  const archiveDeduped = archive.filter(
    (a) => !a.shopifyOrderId || !orderShopifyIds.has(a.shopifyOrderId)
  );

  const revenueFromOrdersCents = orders.reduce((s, o) => s + decToCents(o.total), 0);
  const revenueFromShopifyCents = archiveDeduped.reduce((s, a) => s + a.totalPriceCents, 0);
  const revenueCents = revenueFromOrdersCents + revenueFromShopifyCents;
  const orderCount = orders.length + archiveDeduped.length;

  const topSkus = buildTopSkus(orders, archiveDeduped);
  const segmentBreakdown = buildSegments(orders, archiveDeduped);
  const topCustomers = buildTopCustomers(orders);
  const topAffiliates = buildTopAffiliates(commissions);
  // --- Expense source: QB where MATERIAL, else bank-derived (never blend) -----
  const qb = buildExpenses(qbExpenses);
  const qbMaterial = isQbMaterial(qbExpenses);

  // Bank-derived expenses: production outflows stamped as real costs (B2).
  // Queried every month so QB-sourced months can still cross-check (B5).
  const bankRows = await prisma.plaidTransaction.findMany({
    where: {
      item: { environment: 'production' },
      date: { gte: start, lt: end },
      pending: false,
      isBankDerivedExpense: true,
    },
    select: { amount: true, bankDerivedCategory: true, merchantName: true, name: true },
  });
  const bank = buildExpenses(
    bankRows.map((r) => ({
      amountCents: decToCents(r.amount),
      categorySlug: r.bankDerivedCategory,
      vendorName: r.merchantName ?? r.name,
    }))
  );
  const bankExpenseTotalCents = (bank.cogsCents ?? 0) + (bank.opexCents ?? 0);

  let expenseSource: 'qb' | 'bank' | 'none';
  let cogsCents: number | null;
  let opexCents: number | null;
  let expenseCategories: ExpenseCatRow[];
  if (qbMaterial) {
    expenseSource = 'qb';
    ({ cogsCents, opexCents, expenseCategories } = qb);
  } else if (bankRows.length > 0) {
    expenseSource = 'bank';
    ({ cogsCents, opexCents, expenseCategories } = bank);
  } else {
    expenseSource = 'none';
    cogsCents = null;
    opexCents = null;
    expenseCategories = [];
  }

  // Income cross-check against real bank deposits (does NOT replace revenue).
  const bankIncome = await reconcileBankIncome({
    year,
    month,
    stripeRevenueProxyCents: revenueCents,
  });

  // Per-order COGS from OrderItem cost (sparse, ~4% coverage) — only used as a
  // fallback signal; QB inventory cogs is the primary cost source.
  const orderItemCostCents = orders.reduce(
    (s, o) => s + o.items.reduce((is, it) => is + decToCents(it.totalCost), 0),
    0
  );

  const effectiveCogs = cogsCents ?? (orderItemCostCents > 0 ? orderItemCostCents : null);
  const grossProfitCents = effectiveCogs !== null ? revenueCents - effectiveCogs : null;
  const netIncomeCents =
    grossProfitCents !== null && opexCents !== null ? grossProfitCents - opexCents : null;

  const dataHealth = buildDataHealth({
    year,
    month,
    revenueCents,
    revenueFromShopifyCents,
    qbExpenseCount: qbExpenses.length,
    expenseSource,
    cogsCents,
    opexCents,
    bankExpenseTotalCents,
    bankIncome,
    orderItemCostCents,
    orderCount: orders.length,
    archiveCount: archiveDeduped.length,
  });

  return {
    year,
    month,
    revenueCents,
    orderCount,
    revenueFromShopifyCents,
    revenueFromOrdersCents,
    cogsCents: effectiveCogs,
    grossProfitCents,
    opexCents,
    netIncomeCents,
    topSkus,
    segmentBreakdown,
    topCustomers,
    topAffiliates,
    expenseCategories,
    dataHealth,
  };
}

interface OrderItemRow {
  sku: string | null;
  title: string;
  totalPrice: Prisma.Decimal;
  totalCost: Prisma.Decimal | null;
  quantity: number;
}
interface OrderRow {
  total: Prisma.Decimal;
  customerName: string | null;
  customerEmail: string | null;
  landingPage: string | null;
  utmCampaign: string | null;
  segment: string | null;
  shopifyOrderId: string | null;
  groupOrderV2: { name: string | null } | null;
  items: OrderItemRow[];
}

interface ArchiveLineItem { sku: string | null; title: string | null; quantity: number; unitPriceCents: number }

function buildTopSkus(
  orders: OrderRow[],
  archive: { lineItems: Prisma.JsonValue }[]
): SkuRow[] {
  const map = new Map<string, SkuRow>();
  const add = (sku: string | null, title: string, revenueCents: number, qty: number) => {
    const key = sku || title;
    const cur = map.get(key) ?? { sku, title, revenueCents: 0, qty: 0 };
    cur.revenueCents += revenueCents;
    cur.qty += qty;
    map.set(key, cur);
  };
  for (const o of orders) {
    for (const it of o.items) add(it.sku, it.title, decToCents(it.totalPrice), it.quantity);
  }
  for (const a of archive) {
    const items = Array.isArray(a.lineItems) ? (a.lineItems as unknown as ArchiveLineItem[]) : [];
    for (const it of items) {
      add(it.sku, it.title ?? '(unknown)', it.unitPriceCents * it.quantity, it.quantity);
    }
  }
  return [...map.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, TOP_N);
}

function buildSegments(
  orders: OrderRow[],
  archive: { sourceName: string | null; note: string | null; tags: string[]; totalPriceCents: number }[]
): Record<Segment, SegmentStat> {
  const out = emptySegments();
  for (const o of orders) {
    const seg = segmentForOrder({
      landingPage: o.landingPage,
      utmCampaign: o.utmCampaign,
      storedSegment: o.segment,
      groupName: o.groupOrderV2?.name ?? null,
    });
    out[seg].revenueCents += decToCents(o.total);
    out[seg].orderCount += 1;
  }
  for (const a of archive) {
    const seg = segmentForArchive({ sourceName: a.sourceName, note: a.note, tags: a.tags });
    out[seg].revenueCents += a.totalPriceCents;
    out[seg].orderCount += 1;
  }
  return out;
}

function buildTopCustomers(orders: OrderRow[]): CustomerRow[] {
  const map = new Map<string, CustomerRow>();
  for (const o of orders) {
    const email = (o.customerEmail || '').toLowerCase();
    if (!email) continue;
    const cur = map.get(email) ?? {
      name: o.customerName || email,
      email,
      revenueCents: 0,
      orderCount: 0,
    };
    cur.revenueCents += decToCents(o.total);
    cur.orderCount += 1;
    map.set(email, cur);
  }
  return [...map.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, TOP_N);
}

function buildTopAffiliates(
  commissions: {
    commissionAmountCents: number;
    affiliate: { code: string; businessName: string } | null;
    order: { total: Prisma.Decimal } | null;
  }[]
): AffiliateRow[] {
  const map = new Map<string, AffiliateRow>();
  for (const c of commissions) {
    if (!c.affiliate) continue;
    const cur = map.get(c.affiliate.code) ?? {
      code: c.affiliate.code,
      name: c.affiliate.businessName,
      revenueCents: 0,
      commissionCents: 0,
    };
    cur.revenueCents += decToCents(c.order?.total);
    cur.commissionCents += c.commissionAmountCents;
    map.set(c.affiliate.code, cur);
  }
  return [...map.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, TOP_N);
}

function buildExpenses(
  qbExpenses: { amountCents: number; categorySlug: string | null; vendorName: string | null }[]
): { expenseCategories: ExpenseCatRow[]; cogsCents: number | null; opexCents: number | null } {
  if (qbExpenses.length === 0) {
    return { expenseCategories: [], cogsCents: null, opexCents: null };
  }
  const byCat = new Map<CategorySlug, { cents: number; vendors: Map<string, number> }>();
  for (const e of qbExpenses) {
    const cat = (e.categorySlug ?? 'other') as CategorySlug;
    const bucket = byCat.get(cat) ?? { cents: 0, vendors: new Map() };
    bucket.cents += e.amountCents;
    const vendor = e.vendorName || '(no vendor)';
    bucket.vendors.set(vendor, (bucket.vendors.get(vendor) ?? 0) + e.amountCents);
    byCat.set(cat, bucket);
  }
  const expenseCategories: ExpenseCatRow[] = [...byCat.entries()]
    .map(([category, b]) => {
      const top = [...b.vendors.entries()].sort((a, c) => c[1] - a[1])[0];
      return {
        category,
        label: CATEGORY_LABELS[category] ?? category,
        cents: b.cents,
        topVendor: top ? top[0] : null,
        topVendorCents: top ? top[1] : 0,
      };
    })
    .sort((a, b) => b.cents - a.cents);

  let cogsCents = 0;
  let opexCents = 0;
  for (const row of expenseCategories) {
    if (row.category === 'cogs') cogsCents += row.cents;
    else if (isOperatingExpense(row.category)) opexCents += row.cents;
  }
  return { expenseCategories, cogsCents, opexCents };
}

interface HealthInput {
  year: number;
  month: number;
  revenueCents: number;
  revenueFromShopifyCents: number;
  qbExpenseCount: number;
  expenseSource: 'qb' | 'bank' | 'none';
  cogsCents: number | null;
  opexCents: number | null;
  bankExpenseTotalCents: number;
  bankIncome: BankIncomeRecon;
  orderItemCostCents: number;
  orderCount: number;
  archiveCount: number;
}

/**
 * Flags every reason a month's profit number can't be trusted, and sets
 * `netIncomeReliable` accordingly. The briefing renders net income only when
 * reliable; otherwise it shows "pending" + these flags.
 *
 * Net income is reliable via EITHER path: QB (the books are material + complete)
 * OR bank-derived (expenses sourced from the real bank feed AND income
 * reconciled to deposits). 2026 months flip to reliable once Wells Fargo is
 * connected + the bank-category backfill runs; thin pre-2023 months stay
 * unreliable.
 */
function buildDataHealth(h: HealthInput): Record<string, unknown> {
  const flags: string[] = [];
  const expensesTotalCents = (h.cogsCents ?? 0) + (h.opexCents ?? 0);

  // 1. Expense completeness, per chosen source.
  if (h.expenseSource === 'none') {
    flags.push(
      'no expense source this month — QB not material and no production bank data → OpEx + net income unavailable'
    );
  } else if (h.revenueCents > 0 && expensesTotalCents < h.revenueCents * 0.1) {
    flags.push(
      h.expenseSource === 'qb'
        ? 'QB expenses trivial vs revenue — books likely incomplete this month'
        : 'bank-derived expenses trivial vs revenue — bank feed likely incomplete this month'
    );
  }

  // 2. COGS completeness — a liquor business has alcohol cost every revenue month,
  // so a zero-COGS month means it wasn't recorded (incl. a distributor-allowlist
  // miss on the bank path). The sparse OrderItem cost data is too thin to count.
  if ((h.cogsCents ?? 0) === 0 && h.revenueCents > 0) {
    flags.push('no COGS recorded — gross profit unreliable');
  }

  // 3. Shopify-era understatement (only when QB-sourced and revenue is mostly Shopify).
  if (h.expenseSource === 'qb' && h.revenueFromShopifyCents > h.revenueCents * 0.5) {
    flags.push('Shopify-era revenue is net-of-refund and understated vs real expenses');
  }

  // 4. Income reconciliation to bank deposits (bank-sourced months only).
  if (h.expenseSource === 'bank' && !h.bankIncome.reconciled) {
    flags.push(...h.bankIncome.flags);
  }

  // 5. Discrepancy (surface, don't auto-fix): bank shows materially more spending
  // than QB booked, in a QB-sourced month with bank coverage → QB likely incomplete.
  if (
    h.expenseSource === 'qb' &&
    h.bankExpenseTotalCents > expensesTotalCents * 1.5 &&
    h.bankExpenseTotalCents - expensesTotalCents > QB_MATERIAL_FLOOR_CENTS
  ) {
    // Describe the discrepancy as a RATIO, not raw dollar totals. The QB expense
    // total is COGS+OpEx; embedding it here would let a reader reconstruct the
    // withheld net income (Revenue − total) in the monthly-close email's
    // honesty-gated view, so keep it qualitative.
    const overBy = Math.round((h.bankExpenseTotalCents / expensesTotalCents - 1) * 100);
    flags.push(
      `bank outflows exceed QB-booked expenses by ~${overBy}% — QB books may be incomplete this month`
    );
  }

  const netIncomeReliable =
    flags.length === 0 &&
    h.cogsCents !== null &&
    h.opexCents !== null &&
    (h.expenseSource === 'qb' ||
      (h.expenseSource === 'bank' && h.bankIncome.reconciled));

  return {
    hasOrders: h.orderCount > 0,
    hasArchive: h.archiveCount > 0,
    hasQbExpenses: h.qbExpenseCount > 0,
    expenseSource: h.expenseSource,
    netIncomeReliable,
    incomeReconciled: h.bankIncome.hasProductionBank ? h.bankIncome.reconciled : null,
    otherIncomeCents: h.bankIncome.hasProductionBank ? h.bankIncome.otherIncomeCents : null,
    flags,
  };
}
