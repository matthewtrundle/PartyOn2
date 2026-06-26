/**
 * Order Cancel API
 * POST /api/v1/admin/orders/[id]/cancel
 * Cancel an order with optional refund and email notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { stripe } from '@/lib/stripe/client';
import { getMaxRefundable } from '@/lib/stripe/refund-utils';
import { createRefund, releaseCommittedInventory } from '@/lib/inventory/services/order-service';
import { sendOrderCancellationEmail } from '@/lib/email/email-service';
import { sendRefundProcessedEmail } from '@/lib/email/email-service';
import { generateOrderCancellationEmail } from '@/lib/email/templates/order-cancellation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { customNote, preview, issueRefund } = body as {
      customNote?: string;
      preview?: boolean;
      issueRefund?: boolean;
    };

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        refunds: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const emailData = {
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      customNote,
      refundIssued: issueRefund,
      refundAmount: Number(order.total),
      items: order.items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      deliveryDate: order.deliveryDate
        ? new Date(order.deliveryDate).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          })
        : undefined,
    };

    // Preview mode: return HTML without changing anything
    if (preview) {
      const html = generateOrderCancellationEmail(emailData);
      return NextResponse.json({ success: true, html });
    }

    // Validate order can be cancelled
    if (['CANCELLED', 'REFUNDED'].includes(order.status)) {
      return NextResponse.json(
        { success: false, error: `Order is already ${order.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    let refundResult = null;

    // Process refund if requested
    if (issueRefund) {
      if (!order.stripePaymentIntentId) {
        return NextResponse.json(
          { success: false, error: 'No Stripe payment found for this order. Cannot process refund.' },
          { status: 400 }
        );
      }

      // Refund whatever Stripe still has — not what order.total says,
      // since order.total gets rewritten by OrderAmendment when items change.
      const totalPriorRefunds = order.refunds.reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );
      const refundAmount = await getMaxRefundable(order.stripePaymentIntentId, totalPriorRefunds);

      if (refundAmount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Order has already been fully refunded' },
          { status: 400 }
        );
      }

      // Process Stripe refund.
      // Idempotency key is derived from the order id + amount: a cancel is a
      // one-shot terminal action, so if this request is retried after the Stripe
      // refund succeeded but the DB write failed, Stripe replays the SAME refund
      // instead of issuing a second one. The amount is included so that if the
      // order is amended between a failed attempt and the retry (changing the
      // computed refund), the retry gets a fresh key rather than colliding with
      // the old amount and locking Stripe for 24h. Belt-and-suspenders with the
      // Stripe-aware cap above (which already blocks re-refunding a refunded order).
      const refundAmountCents = Math.round(refundAmount * 100);
      const stripeRefund = await stripe.refunds.create(
        {
          payment_intent: order.stripePaymentIntentId,
          amount: refundAmountCents,
          reason: 'requested_by_customer',
          metadata: {
            orderId: id,
            orderNumber: String(order.orderNumber),
            reason: 'Order cancelled',
          },
        },
        { idempotencyKey: `order-cancel-refund-${id}-${refundAmountCents}` }
      );

      // Create refund record in DB
      await createRefund(id, refundAmount, 'Order cancelled');

      // Update refund record with Stripe ID
      const dbRefund = await prisma.refund.findFirst({
        where: { orderId: id },
        orderBy: { createdAt: 'desc' },
      });
      if (dbRefund) {
        await prisma.refund.update({
          where: { id: dbRefund.id },
          data: {
            stripeRefundId: stripeRefund.id,
            processedBy: 'admin',
            processedAt: new Date(),
          },
        });
      }

      refundResult = {
        stripeRefundId: stripeRefund.id,
        amount: refundAmount,
        status: stripeRefund.status,
      };

      // Update financial status
      await prisma.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          financialStatus: 'REFUNDED',
        },
      });
    } else {
      // Just cancel without refund
      await prisma.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });
    }

    // Release committed inventory (fixes bug: cancel previously left stock decremented)
    try {
      if (order.fulfillmentStatus === 'DELIVERED') {
        // Already fulfilled: inventoryQuantity was already decremented by fulfillment,
        // committedQuantity is already 0. Restoring stock is handled by the return flow.
        // No inventory action needed here — the physical goods were delivered.
      } else {
        // Not yet fulfilled: release the committed quantity back to available
        await releaseCommittedInventory(id);
      }
    } catch (inventoryError) {
      console.error('[Cancel API] Failed to release committed inventory:', inventoryError);
    }

    // Send cancellation email
    try {
      await sendOrderCancellationEmail(order.customerEmail, emailData);
    } catch (emailError) {
      console.error('[Cancel API] Failed to send cancellation email:', emailError);
    }

    // Also send refund email if refund was issued
    if (issueRefund && refundResult) {
      try {
        await sendRefundProcessedEmail(
          order.customerEmail,
          order.customerName,
          order.orderNumber,
          refundResult.amount,
          'Order cancelled'
        );
      } catch (emailError) {
        console.error('[Cancel API] Failed to send refund email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status: 'CANCELLED',
        refund: refundResult,
      },
    });
  } catch (error) {
    console.error('[Cancel API] Error:', error);

    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string };
      return NextResponse.json(
        { success: false, error: `Stripe error: ${stripeError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
