/**
 * Order Refund API
 * POST /api/v1/admin/orders/[id]/refund
 * Process a Stripe refund for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { stripe } from '@/lib/stripe/client';
import { getMaxRefundable } from '@/lib/stripe/refund-utils';
import { createRefund } from '@/lib/inventory/services/order-service';
import { sendRefundProcessedEmail } from '@/lib/email/email-service';

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
    const { amount, reason, amendmentId } = body as {
      amount: number;
      reason?: string;
      amendmentId?: string;
    };

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Refund amount must be greater than 0' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        refunds: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!order.stripePaymentIntentId) {
      return NextResponse.json(
        { success: false, error: 'No Stripe payment found for this order. Cannot process refund.' },
        { status: 400 }
      );
    }

    // Cap is based on what Stripe actually captured, not order.total —
    // order.total gets rewritten by OrderAmendment when items are added/removed.
    const totalPriorRefunds = order.refunds.reduce(
      (sum, r) => sum + Number(r.amount),
      0
    );
    const maxRefundable = await getMaxRefundable(order.stripePaymentIntentId, totalPriorRefunds);

    if (amount > maxRefundable) {
      return NextResponse.json({
        success: false,
        error: `Refund amount ($${amount.toFixed(2)}) exceeds maximum refundable ($${maxRefundable.toFixed(2)})`,
      }, { status: 400 });
    }

    // Process Stripe refund.
    // The Stripe-aware cap above stops a FULL re-refund, but a partial refund
    // would still fit under the (reduced) cap on retry — so we also pass an
    // idempotency key. Scoped to (order, amendment, amount) so a retried request
    // replays the same refund, while distinct amendments / amounts stay independent.
    // CAVEAT (manual path, no amendmentId): two genuinely-distinct manual refunds
    // of the SAME dollar amount on the SAME order within Stripe's 24h idempotency
    // window will collide — the second replays the first instead of issuing new
    // money. That's the safe direction (never double-pays); if a real second
    // same-amount manual refund is needed within 24h, vary the amount by a cent or
    // resolve it through an amendment so it gets a distinct key.
    const amountCents = Math.round(amount * 100);
    const refund = await stripe.refunds.create(
      {
        payment_intent: order.stripePaymentIntentId,
        amount: amountCents, // Stripe uses cents
        reason: 'requested_by_customer',
        metadata: {
          orderId: id,
          orderNumber: String(order.orderNumber),
          reason: reason || 'Order amendment refund',
        },
      },
      { idempotencyKey: `order-refund-${id}-${amendmentId ?? 'manual'}-${amountCents}` }
    );

    // Create refund record in DB and update financial status
    await createRefund(id, amount, reason || 'Order amendment refund');

    // Update the refund record with the Stripe refund ID
    const dbRefund = await prisma.refund.findFirst({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    });
    if (dbRefund) {
      await prisma.refund.update({
        where: { id: dbRefund.id },
        data: {
          stripeRefundId: refund.id,
          processedBy: 'admin',
          processedAt: new Date(),
        },
      });
    }

    // Update OrderAmendment resolution if linked
    if (amendmentId) {
      await prisma.orderAmendment.update({
        where: { id: amendmentId },
        data: {
          resolution: 'REFUNDED',
          refundId: dbRefund?.id || null,
          resolvedAt: new Date(),
        },
      });
    }

    // Send refund email
    try {
      await sendRefundProcessedEmail(
        order.customerEmail,
        order.customerName,
        order.orderNumber,
        amount,
        reason || 'Order amendment'
      );
    } catch (emailError) {
      console.error('[Refund API] Failed to send refund email:', emailError);
    }

    return NextResponse.json({
      success: true,
      data: {
        stripeRefundId: refund.id,
        amount,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error('[Refund API] Error:', error);

    // Handle Stripe-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string };
      return NextResponse.json(
        { success: false, error: `Stripe error: ${stripeError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}
