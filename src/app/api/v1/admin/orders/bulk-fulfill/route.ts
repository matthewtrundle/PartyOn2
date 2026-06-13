/**
 * Bulk Fulfill Orders API
 * PATCH /api/v1/admin/orders/bulk-fulfill
 * Sets fulfillmentStatus to FULFILLED and status to COMPLETED for multiple orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { FulfillmentStatus, OrderStatus } from '@prisma/client';
import { markCommissionsDelivered } from '@/lib/affiliates/commission-engine';
import { fulfillInventoryForOrder } from '@/lib/inventory/services/order-service';

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { orderIds } = body as { orderIds: string[] };

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'orderIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (orderIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Cannot fulfill more than 100 orders at once' },
        { status: 400 }
      );
    }

    // Fetch eligible orders individually so we can trigger per-order inventory fulfillment
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        fulfillmentStatus: { not: FulfillmentStatus.DELIVERED },
      },
      select: { id: true },
    });

    let fulfilledCount = 0;
    for (const order of orders) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            fulfillmentStatus: FulfillmentStatus.DELIVERED,
            status: OrderStatus.DELIVERED,
          },
        });

        await fulfillInventoryForOrder(order.id);
        fulfilledCount++;
      } catch (err) {
        console.error(`[Bulk Fulfill API] Failed to fulfill order ${order.id}:`, err);
      }
    }

    // Update affiliate commissions for delivered orders
    try {
      await markCommissionsDelivered(orderIds);
    } catch (err) {
      console.error('[Bulk Fulfill API] Failed to update affiliate commissions:', err);
    }

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: fulfilledCount,
        requestedCount: orderIds.length,
      },
    });
  } catch (error) {
    console.error('[Bulk Fulfill API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fulfill orders' },
      { status: 500 }
    );
  }
}
