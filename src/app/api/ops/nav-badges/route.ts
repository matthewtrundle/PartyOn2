import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { todayCT } from '@/lib/ops/cooler-grouping';
import { getHotLeadsNeedingReply } from '@/lib/leads/board-data';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ops/nav-badges — cheap counts for the HQ shell tab badges.
 *
 * - ordersToday: orders delivering today (CT) not yet delivered/cancelled.
 *   Day semantics mirror the orders view, which buckets days by the UTC date
 *   of Order.deliveryDate (todayCT() → [00:00Z, +24h) window on that date).
 * - recsOpen (admin only): open+approved recommendations across the three
 *   stores — mirrors listUnifiedRecommendations' default statuses, but as
 *   count() queries so the badge never pays for the 250-row list.
 * - leadsHot (admin only): hot Lead Flow cards waiting on a reply.
 */
export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const day = todayCT();
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const openStatuses = ['open', 'approved'];
  const isAdmin = auth.role === 'admin';

  const [ordersToday, hotLeads, ...recCounts] = await Promise.all([
    prisma.order.count({
      where: {
        deliveryDate: { gte: start, lt: end },
        fulfillmentStatus: { not: 'DELIVERED' },
        status: { not: 'CANCELLED' },
      },
    }),
    isAdmin
      ? getHotLeadsNeedingReply().catch(() => ({ count: 0, oldestWaitHours: null }))
      : Promise.resolve({ count: 0, oldestWaitHours: null }),
    ...(isAdmin
      ? [
          prisma.recommendationItem.count({ where: { status: { in: openStatuses } } }),
          prisma.operationsRecommendation.count({ where: { status: { in: openStatuses } } }),
          prisma.financeRecommendation.count({ where: { status: { in: openStatuses } } }),
        ]
      : []),
  ]);

  const recsOpen = recCounts.reduce((sum, n) => sum + n, 0);

  return NextResponse.json({ ordersToday, recsOpen, leadsHot: hotLeads.count });
}
