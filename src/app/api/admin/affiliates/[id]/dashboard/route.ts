/**
 * GET /api/admin/affiliates/[id]/dashboard
 * Returns the same data an affiliate sees on their dashboard, for admin viewing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { CommissionStatus, GroupV2PaymentStatus } from '@prisma/client';
import { getTierLabel, getTierProgress, getAnniversaryYearStart } from '@/lib/affiliates/commission-engine';
import { getDashboardEngagement } from '@/lib/group-orders-v2/view-tracking';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const affiliate = await prisma.affiliate.findUnique({
      where: { id },
    });

    if (!affiliate) {
      return NextResponse.json({ success: false, error: 'Affiliate not found' }, { status: 404 });
    }

    // Year-to-date stats (rolling year from affiliate join date)
    const yearStart = getAnniversaryYearStart(affiliate.createdAt);

    // Monthly stats: last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [yearCommissions, lifetimeAgg, commissions, payouts, dashboardOrders, recentCommissions] = await Promise.all([
      // Current year commissions
      prisma.affiliateCommission.findMany({
        where: {
          affiliateId: id,
          createdAt: { gte: yearStart },
          status: { not: CommissionStatus.VOID },
        },
      }),
      // Lifetime aggregate
      prisma.affiliateCommission.aggregate({
        where: {
          affiliateId: id,
          status: { not: CommissionStatus.VOID },
        },
        _sum: { commissionBaseCents: true, commissionAmountCents: true },
        _count: true,
      }),
      // Recent orders (commissions)
      prisma.affiliateCommission.findMany({
        where: { affiliateId: id },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              subtotal: true,
              customerName: true,
              deliveryDate: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      // Payouts
      prisma.affiliatePayout.findMany({
        where: { affiliateId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          payoutPeriod: true,
          totalAmountCents: true,
          status: true,
          processedAt: true,
          createdAt: true,
          _count: { select: { commissions: true } },
        },
      }),
      // Dashboard orders (GroupOrderV2 created by this affiliate) - include payments for lifecycle status
      prisma.groupOrderV2.findMany({
        where: { affiliateId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          tabs: {
            include: {
              draftItems: true,
              purchasedItems: true,
              payments: true,
            },
          },
          _count: { select: { participants: true } },
        },
      }),
      // Recent commissions for monthly stats
      prisma.affiliateCommission.findMany({
        where: {
          affiliateId: id,
          createdAt: { gte: sixMonthsAgo },
          status: { not: CommissionStatus.VOID },
        },
        select: {
          commissionBaseCents: true,
          commissionAmountCents: true,
          createdAt: true,
        },
      }),
    ]);

    const yearRevenueCents = yearCommissions.reduce((sum, c) => sum + c.commissionBaseCents, 0);
    const yearCommissionCents = yearCommissions.reduce((sum, c) => sum + c.commissionAmountCents, 0);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://partyondelivery.com';

    // Build monthly stats (same logic as /api/v1/affiliate/me)
    const monthMap = new Map<string, { revenueCents: number; commissionCents: number; orderCount: number }>();
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { revenueCents: 0, commissionCents: 0, orderCount: 0 });
    }
    for (const c of recentCommissions) {
      const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key);
      if (entry) {
        entry.revenueCents += c.commissionBaseCents;
        entry.commissionCents += c.commissionAmountCents;
        entry.orderCount += 1;
      }
    }
    const monthlyStats = Array.from(monthMap.entries()).map(([month, stats]) => {
      const [y, m] = month.split('-');
      const date = new Date(Number(y), Number(m) - 1);
      const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return { month, label, ...stats };
    });

    // Build clientOrders (same format as /api/v1/affiliate/me/client-orders)
    const engagement = await getDashboardEngagement(dashboardOrders.map((o) => o.shareCode));
    const now = new Date();
    const clientOrders = dashboardOrders.map((order) => {
      const hasPaidPayment = order.tabs.some((tab) =>
        tab.payments.some((p) => p.status === GroupV2PaymentStatus.PAID)
      );
      const firstTab = order.tabs.sort((a, b) => a.position - b.position)[0];
      const deliveryDate = firstTab?.deliveryDate ?? null;

      let lifecycleStatus: 'draft' | 'in_progress' | 'paid' | 'completed';
      if (hasPaidPayment) {
        lifecycleStatus = deliveryDate && deliveryDate < now ? 'completed' : 'paid';
      } else if (order.viewCount > 0) {
        lifecycleStatus = 'in_progress';
      } else {
        lifecycleStatus = 'draft';
      }

      const totalCents = order.tabs.reduce(
        (sum, tab) =>
          sum + tab.purchasedItems.reduce((s, item) => s + Math.round(Number(item.price) * item.quantity * 100), 0),
        0
      );
      const itemCount = order.tabs.reduce(
        (sum, tab) => sum + tab.purchasedItems.reduce((s, item) => s + item.quantity, 0),
        0
      );

      const cartItemCount = order.tabs.reduce(
        (sum, tab) => sum + tab.draftItems.reduce((s, item) => s + item.quantity, 0),
        0
      );
      const eng = engagement.get(order.shareCode);

      return {
        id: order.id,
        type: 'dashboard' as const,
        clientName: order.hostName,
        orderName: order.name,
        createdAt: order.createdAt.toISOString(),
        deliveryDate: deliveryDate?.toISOString() ?? null,
        itemCount,
        totalCents,
        lifecycleStatus,
        dashboardUrl: `${appUrl}/dashboard/${order.shareCode}`,
        shareCode: order.shareCode,
        // Engagement analytics
        viewCount: eng?.uniqueVisitors ?? order.viewCount,
        activeSeconds: eng?.totalActiveSeconds ?? 0,
        lastActivityAt: eng?.lastActivityAt?.toISOString() ?? null,
        participantCount: order._count.participants,
        cartItemCount,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        affiliate: {
          id: affiliate.id,
          code: affiliate.code,
          partnerSlug: affiliate.partnerSlug,
          businessName: affiliate.businessName,
          contactName: affiliate.contactName,
          email: affiliate.email,
        },
        yearToDate: {
          revenueCents: yearRevenueCents,
          commissionCents: yearCommissionCents,
          orderCount: yearCommissions.length,
          currentTier: getTierLabel(yearRevenueCents),
          tierProgressPercent: Math.round(getTierProgress(yearRevenueCents)),
        },
        lifetime: {
          revenueCents: lifetimeAgg._sum.commissionBaseCents || 0,
          commissionCents: lifetimeAgg._sum.commissionAmountCents || 0,
          orderCount: lifetimeAgg._count,
        },
        monthlyStats,
        orders: commissions.map((c) => ({
          orderId: c.orderId,
          orderNumber: c.order.orderNumber,
          customerName: c.order.customerName,
          orderDate: c.order.createdAt,
          deliveryDate: c.order.deliveryDate,
          subtotalCents: Math.round(Number(c.order.subtotal) * 100),
          commissionCents: c.commissionAmountCents,
          commissionRate: Number(c.commissionRate),
          tier: c.tierAtTime,
          status: c.status,
        })),
        payouts,
        clientOrders,
      },
    });
  } catch (error) {
    console.error('[Admin Affiliate Dashboard API] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load dashboard' }, { status: 500 });
  }
}
