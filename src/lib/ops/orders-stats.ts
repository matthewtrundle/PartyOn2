/**
 * Global order summary stats shared by GET /api/v1/admin/orders and the
 * unified orders view (GET /api/ops/orders-view). Extracted verbatim from
 * the admin orders route so both endpoints return identical numbers.
 */

import { prisma } from '@/lib/database/client';
import { FinancialStatus, OrderStatus } from '@prisma/client';

export interface OrdersSummaryStats {
  /** Lifetime order count. */
  total: number;
  /** Sum of paid, non-cancelled order totals over the last 30 calendar days. */
  last30Revenue: number;
  /** Same metric for the 30 days before that — used to compute the % delta. */
  prior30Revenue: number;
  /** Percent change vs prior 30 days. `null` means no comparable baseline (first month w/ revenue). */
  revenueChangePct: number | null;
  /** Count of paid orders in the last 30 days. */
  last30Orders: number;
  todayOrders: number;
  todayRevenue: number;
  pendingFulfillment: number;
}

/** Compute the rolling-30-day / today / pending-fulfillment summary block. */
export async function getOrdersSummaryStats(): Promise<OrdersSummaryStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Rolling-30-day window (current 30 days vs prior 30 for percent change)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Lifetime total order count (kept so the existing total-orders pill stays accurate)
  const stats = await prisma.order.aggregate({
    _count: { id: true },
  });

  // Revenue filters: PAID and non-cancelled — only money actually earned
  const revenueFilter = {
    financialStatus: FinancialStatus.PAID,
    status: { not: OrderStatus.CANCELLED },
  } as const;

  const [last30, prior30, todayStats, pendingCount] = await Promise.all([
    prisma.order.aggregate({
      where: { ...revenueFilter, createdAt: { gte: thirtyDaysAgo } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { ...revenueFilter, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { ...revenueFilter, createdAt: { gte: todayStart } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.order.count({ where: { fulfillmentStatus: 'UNFULFILLED' } }),
  ]);

  const last30Revenue = Number(last30._sum.total || 0);
  const prior30Revenue = Number(prior30._sum.total || 0);
  const revenueChangePct =
    prior30Revenue > 0
      ? ((last30Revenue - prior30Revenue) / prior30Revenue) * 100
      : last30Revenue > 0
        ? null // first month with revenue — no comparable baseline
        : 0;

  return {
    total: stats._count.id,
    last30Revenue,
    prior30Revenue,
    revenueChangePct,
    last30Orders: last30._count.id,
    todayOrders: todayStats._count.id,
    todayRevenue: Number(todayStats._sum.total || 0),
    pendingFulfillment: pendingCount,
  };
}
