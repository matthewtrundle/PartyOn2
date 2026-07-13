/**
 * Aggregate builder for the HQ "Today" Shift Board (GET /api/ops/today).
 * Composes the existing lib builders directly (no HTTP fan-out) so the screen
 * paints in one round trip and every number matches its source-of-truth
 * surface: orders-view (runs/deliveries/revenue), unpaid carts, stock counts,
 * event rosters, recommendation counts.
 */

import { prisma } from '@/lib/database/client';
import { FinancialStatus, OrderStatus, Prisma } from '@prisma/client';
import { getOrdersView } from './orders-view-data';
import { getOpsEventSummaries } from '@/lib/events/ops-summary';
import { getHotLeadsNeedingReply } from '@/lib/leads/board-data';
import { todayCT } from './cooler-grouping';

const LOW_STOCK_THRESHOLD = 10; // mirrors /api/v1/inventory
const STALE_CART_HOURS = 24;

export interface TodayKpis {
  /** Booking-dated (orders CREATED today, PAID) — mirrors orders-view stats. */
  revenueToday: number;
  /** % vs the same weekday last week (booking-dated). Null = no baseline. */
  revenueDeltaPct: number | null;
  ordersBookedToday: number;
  deliveriesTotal: number;
  deliveriesDone: number;
  nextRunTime: string | null;
  alertsCount: number;
  alertsBreakdown: string;
  unpaidCartTotal: number;
  unpaidCartCount: number;
  staleCartCount: number;
}

export interface TodayTriageItem {
  key: string;
  severity: 'red' | 'amber' | 'blue';
  badge: string;
  title: string;
  actionLabel: string;
  href: string;
}

export interface TodayRun {
  time: string;
  name: string;
  orderNumber: number | null;
  context: string;
  flags: string[];
  href: string;
}

export interface TodayData {
  kpis: TodayKpis;
  triage: TodayTriageItem[];
  runs: TodayRun[];
  generatedAt: string;
}

interface StockCounts {
  low: number;
  out: number;
  oversold: number;
}

/**
 * Low/out/oversold counts among ACTIVE, inventory-tracked variants.
 * track_inventory=false items (evergreen cocktail kits, HEB produce) are
 * deliberately excluded — they are always orderable by design and would be
 * permanent false alarms here.
 */
async function getStockCounts(): Promise<StockCounts> {
  const rows = await prisma.$queryRaw<
    Array<{ low: bigint; out: bigint; oversold: bigint }>
  >(Prisma.sql`
    SELECT
      COUNT(*) FILTER (
        WHERE (pv.inventory_quantity - pv.committed_quantity) > 0
          AND (pv.inventory_quantity - pv.committed_quantity) <= ${LOW_STOCK_THRESHOLD}
      ) AS low,
      COUNT(*) FILTER (
        WHERE (pv.inventory_quantity - pv.committed_quantity) = 0
      ) AS out,
      COUNT(*) FILTER (
        WHERE (pv.inventory_quantity - pv.committed_quantity) < 0
      ) AS oversold
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE p.status = 'ACTIVE' AND pv.track_inventory = true
  `);
  const r = rows[0];
  return {
    low: Number(r?.low ?? 0),
    out: Number(r?.out ?? 0),
    oversold: Number(r?.oversold ?? 0),
  };
}

interface CartSummary {
  unpaidTotal: number;
  unpaidCount: number;
  staleCount: number;
}

/**
 * Unpaid-cart rollup, scoped to the ACTIONABLE universe: carts created in the
 * last 30 days whose first tab is still OPEN (the real join/order gate —
 * locked/closed dashboards can't take money without reopening, so they are
 * neither counted nor nudge-listed). "Stale" = open longer than 24h.
 */
async function getUnpaidCartSummary(now: Date): Promise<CartSummary> {
  const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const carts = await prisma.groupOrderV2.findMany({
    where: {
      createdAt: { gte: windowStart },
      tabs: { some: { draftItems: { some: {} } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      createdAt: true,
      tabs: {
        select: {
          status: true,
          draftItems: { select: { price: true, quantity: true } },
        },
      },
    },
  });

  let unpaidTotal = 0;
  let unpaidCount = 0;
  let staleCount = 0;
  const staleCutoff = now.getTime() - STALE_CART_HOURS * 60 * 60 * 1000;

  for (const cart of carts) {
    if (cart.tabs[0]?.status !== 'OPEN') continue;
    const cartTotal = cart.tabs.reduce(
      (sum, tab) =>
        sum + tab.draftItems.reduce((s, i) => s + Number(i.price) * i.quantity, 0),
      0,
    );
    if (cartTotal <= 0) continue;
    unpaidCount += 1;
    unpaidTotal += cartTotal;
    if (cart.createdAt.getTime() < staleCutoff) staleCount += 1;
  }

  return {
    unpaidTotal: Math.round(unpaidTotal * 100) / 100,
    unpaidCount,
    staleCount,
  };
}

/** Booking-dated PAID revenue for the same weekday last week (delta baseline). */
async function getLastWeekSameDayRevenue(): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const start = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const agg = await prisma.order.aggregate({
    where: {
      financialStatus: FinancialStatus.PAID,
      status: { not: OrderStatus.CANCELLED },
      createdAt: { gte: start, lt: end },
    },
    _sum: { total: true },
  });
  return Number(agg._sum.total || 0);
}

const OPEN_REC_STATUSES = ['open', 'approved'];

async function getRecsOpenCount(): Promise<number> {
  const counts = await Promise.all([
    prisma.recommendationItem.count({ where: { status: { in: OPEN_REC_STATUSES } } }),
    prisma.operationsRecommendation.count({ where: { status: { in: OPEN_REC_STATUSES } } }),
    prisma.financeRecommendation.count({ where: { status: { in: OPEN_REC_STATUSES } } }),
  ]);
  return counts.reduce((a, b) => a + b, 0);
}

/** Build the full Shift Board payload. `role` gates admin-only triage rows. */
export async function getTodayData(role: 'admin' | 'employee'): Promise<TodayData> {
  const now = new Date();

  const [view, stock, carts, lastWeekRevenue, events, recsOpen, hotLeads] = await Promise.all([
    getOrdersView({ days: 1 }),
    getStockCounts(),
    getUnpaidCartSummary(now),
    getLastWeekSameDayRevenue(),
    getOpsEventSummaries(),
    role === 'admin' ? getRecsOpenCount() : Promise.resolve(0),
    role === 'admin'
      ? getHotLeadsNeedingReply().catch(() => ({ count: 0, oldestWaitHours: null }))
      : Promise.resolve({ count: 0, oldestWaitHours: null }),
  ]);

  const todayKey = todayCT();
  const todayCards = view.days.find((d) => d.date === todayKey)?.cards ?? [];

  // Deliveries count RUNS (cooler cards), matching how the day is worked.
  // A card is done when every non-cancelled order on it is delivered.
  const activeCards = todayCards.filter((c) =>
    c.orders.some((o) => o.status !== 'CANCELLED'),
  );
  const cardDone = (c: (typeof todayCards)[number]): boolean =>
    c.orders
      .filter((o) => o.status !== 'CANCELLED')
      .every((o) => o.fulfillmentStatus === 'DELIVERED');
  // Slot strings can be ranges ("10:00 AM - 10:30 AM") — show the start.
  const slotStart = (slot: string | null | undefined): string | null =>
    slot ? slot.split(' - ')[0].trim() : null;
  const deliveriesTotal = activeCards.length;
  const deliveriesDone = activeCards.filter(cardDone).length;
  const nextRunTime = slotStart(activeCards.find((c) => !cardDone(c))?.deliveryTime);

  // Events needing attention: ticketed, upcoming, under minimum
  const eventsBelowMin = events.filter(
    (e) =>
      e.ticketed &&
      !e.ticketed.postponed &&
      (e.status === 'active' || e.status === 'upcoming' || e.status === 'today') &&
      e.ticketed.ticketsSold < e.ticketed.minimum,
  );

  const overdueCount = view.overdue?.cards.length ?? 0;

  // Triage assembly — worst first
  const triage: TodayTriageItem[] = [];
  if (stock.oversold > 0) {
    triage.push({
      key: 'oversold',
      severity: 'red',
      badge: 'OVERSOLD',
      title: `${stock.oversold} variant${stock.oversold === 1 ? '' : 's'} oversold — orders waiting`,
      actionLabel: 'Fix',
      href: '/ops/inventory?filter=oversold',
    });
  }
  if (stock.out > 0) {
    triage.push({
      key: 'out',
      severity: 'red',
      badge: 'OUT',
      title: `${stock.out} product${stock.out === 1 ? '' : 's'} out of stock`,
      actionLabel: 'Restock',
      href: '/ops/inventory?filter=out_of_stock',
    });
  }
  if (overdueCount > 0) {
    triage.push({
      key: 'overdue',
      severity: 'red',
      badge: 'OVERDUE',
      title: `${overdueCount} past delivery${overdueCount === 1 ? '' : 'ies'} still unfulfilled`,
      actionLabel: 'Review',
      href: '/ops/orders',
    });
  }
  for (const e of eventsBelowMin) {
    triage.push({
      key: `event-${e.key}`,
      severity: 'amber',
      badge: 'EVENT',
      title: `${e.title}: ${e.ticketed!.ticketsSold}/${e.ticketed!.minimum} minimum`,
      actionLabel: 'Roster',
      href: e.detailPath,
    });
  }
  if (carts.staleCount > 0) {
    triage.push({
      key: 'stale-carts',
      severity: 'amber',
      badge: 'CARTS',
      title: `${carts.staleCount} unpaid cart${carts.staleCount === 1 ? '' : 's'} sitting >24h`,
      actionLabel: 'Nudge',
      href: '/ops/orders?view=carts',
    });
  }
  if (hotLeads.count > 0) {
    // Admin-only by construction (count is 0 for employees, and the href is
    // an admin route the client redirect would bounce them from anyway).
    triage.push({
      key: 'hot-leads',
      severity: (hotLeads.oldestWaitHours ?? 0) > 48 ? 'red' : 'amber',
      badge: 'LEADS',
      title: `${hotLeads.count} hot lead${hotLeads.count === 1 ? '' : 's'} waiting on a reply`,
      actionLabel: 'Open board',
      href: '/admin/leads?temp=hot',
    });
  }
  if (stock.low > 0) {
    triage.push({
      key: 'low',
      severity: 'amber',
      badge: 'LOW',
      title: `${stock.low} product${stock.low === 1 ? '' : 's'} running low`,
      actionLabel: 'Review',
      href: '/ops/inventory?filter=low_stock',
    });
  }
  if (recsOpen > 0) {
    triage.push({
      key: 'recs',
      severity: 'blue',
      badge: 'RECS',
      title: `${recsOpen} recommendation${recsOpen === 1 ? '' : 's'} waiting on a decision`,
      actionLabel: 'Review',
      href: '/admin/recommendations',
    });
  }

  const runs: TodayRun[] = activeCards.map((c) => {
    const firstOrder = c.orders[0];
    const flags: string[] = [];
    if (c.isBoatish) flags.push('BOAT');
    if (c.isVeryLarge) flags.push('XL');
    if (cardDone(c)) flags.push('DONE');
    return {
      time: slotStart(c.deliveryTime) || '',
      name: c.displayName,
      orderNumber: firstOrder?.orderNumber ?? null,
      context: `${c.totalItems} item${c.totalItems === 1 ? '' : 's'} · $${c.total.toFixed(0)}${c.isCooler ? ' · cooler' : ''}`,
      flags,
      href: firstOrder ? `/ops/orders/${firstOrder.id}` : '/ops/orders',
    };
  });

  const alertsCount = triage.filter((t) => t.severity !== 'blue').length;
  const alertsBreakdown =
    [
      stock.out + stock.oversold > 0 ? `${stock.out + stock.oversold} stock` : null,
      overdueCount > 0 ? `${overdueCount} overdue` : null,
      carts.staleCount > 0 ? `${carts.staleCount} carts` : null,
      eventsBelowMin.length > 0 ? `${eventsBelowMin.length} event` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'all clear';

  const revenueToday = view.stats.global.todayRevenue;
  const revenueDeltaPct =
    lastWeekRevenue > 0
      ? ((revenueToday - lastWeekRevenue) / lastWeekRevenue) * 100
      : null;

  return {
    kpis: {
      revenueToday,
      revenueDeltaPct,
      ordersBookedToday: view.stats.global.todayOrders,
      deliveriesTotal,
      deliveriesDone,
      nextRunTime,
      alertsCount,
      alertsBreakdown,
      unpaidCartTotal: carts.unpaidTotal,
      unpaidCartCount: carts.unpaidCount,
      staleCartCount: carts.staleCount,
    },
    triage,
    runs,
    generatedAt: now.toISOString(),
  };
}
