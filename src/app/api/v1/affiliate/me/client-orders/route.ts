/**
 * GET /api/v1/affiliate/me/client-orders
 * Returns GroupOrderV2 records with lifecycle classification for the authenticated affiliate.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { getAffiliateSession } from '@/lib/affiliates/affiliate-session';
import { getDashboardEngagement } from '@/lib/group-orders-v2/view-tracking';
import { GroupV2PaymentStatus } from '@prisma/client';

type LifecycleStatus = 'draft' | 'in_progress' | 'paid' | 'completed';

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getAffiliateSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const orders = await prisma.groupOrderV2.findMany({
      where: { affiliateId: session.affiliateId, status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
      include: {
        tabs: {
          include: {
            draftItems: { select: { quantity: true } },
            purchasedItems: true,
            payments: true,
          },
        },
        _count: { select: { participants: true } },
      },
    });

    const engagement = await getDashboardEngagement(orders.map((o) => o.shareCode));
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://partyondelivery.com';
    const now = new Date();

    const data = orders.map((order) => {
      const hasPaidPayment = order.tabs.some((tab) =>
        tab.payments.some((p) => p.status === GroupV2PaymentStatus.PAID)
      );

      const firstTab = order.tabs.sort((a, b) => a.position - b.position)[0];
      const deliveryDate = firstTab?.deliveryDate ?? null;

      let lifecycleStatus: LifecycleStatus;
      if (hasPaidPayment) {
        lifecycleStatus = deliveryDate && deliveryDate < now ? 'completed' : 'paid';
      } else if (order.viewCount > 0) {
        lifecycleStatus = 'in_progress';
      } else {
        lifecycleStatus = 'draft';
      }

      const totalCents = order.tabs.reduce(
        (sum, tab) =>
          sum +
          tab.purchasedItems.reduce(
            (s, item) => s + Math.round(Number(item.price) * item.quantity * 100),
            0
          ),
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

    return NextResponse.json({ success: true, data: { orders: data } });
  } catch (error) {
    console.error('[Affiliate Client Orders] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch client orders' }, { status: 500 });
  }
}
