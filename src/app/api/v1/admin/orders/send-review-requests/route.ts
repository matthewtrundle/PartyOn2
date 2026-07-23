/**
 * Send Review Requests API
 * POST /api/v1/admin/orders/send-review-requests
 * Sends review request webhooks to GHL for selected orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { FulfillmentStatus } from '@prisma/client';
import { sendReviewRequest, GhlReviewPayload } from '@/lib/webhooks/ghl';
import { sanitizeName } from '@/lib/leads/leadCapture';

export async function POST(request: NextRequest): Promise<NextResponse> {
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
        { success: false, error: 'Cannot send more than 100 review requests at once' },
        { status: 400 }
      );
    }

    // Fetch eligible orders: delivered, not already sent
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        fulfillmentStatus: FulfillmentStatus.DELIVERED,
        reviewRequestSentAt: null,
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        deliveryPhone: true,
        deliveryDate: true,
      },
    });

    const details: { orderNumber: number; status: 'sent' | 'skipped'; reason?: string }[] = [];
    let sentCount = 0;
    let skippedCount = 0;

    for (const order of orders) {
      const phone = order.customerPhone || order.deliveryPhone;
      if (!phone) {
        details.push({ orderNumber: order.orderNumber, status: 'skipped', reason: 'No phone number' });
        skippedCount++;
        continue;
      }

      // Defense-in-depth: this emitter fires days after delivery on the STORED
      // Order.customerName. New orders are sanitized at creation, but historical
      // rows may still hold a raw Stripe name — neutralize before it leaves for GHL.
      // `?? ''` (not `|| 'Guest'`) on purpose: a garbage-only historical name
      // yields empty first/last rather than fabricating a "Guest" GHL contact.
      const nameParts = (sanitizeName(order.customerName) ?? '').split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const payload: GhlReviewPayload = {
        event: 'review.request',
        first_name: firstName,
        last_name: lastName,
        email: order.customerEmail,
        phone,
        orderNumber: order.orderNumber,
        orderUrl: `https://partyondelivery.com/ops/orders/${order.id}`,
        deliveryDate: order.deliveryDate.toISOString().split('T')[0],
      };

      await sendReviewRequest(payload);

      await prisma.order.update({
        where: { id: order.id },
        data: { reviewRequestSentAt: new Date() },
      });

      details.push({ orderNumber: order.orderNumber, status: 'sent' });
      sentCount++;
    }

    // Count orders that were requested but not found (already sent or not delivered)
    const notFoundCount = orderIds.length - orders.length;
    if (notFoundCount > 0) {
      skippedCount += notFoundCount;
    }

    return NextResponse.json({
      success: true,
      data: { sentCount, skippedCount, details },
    });
  } catch (error) {
    console.error('[Send Review Requests API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send review requests' },
      { status: 500 }
    );
  }
}
