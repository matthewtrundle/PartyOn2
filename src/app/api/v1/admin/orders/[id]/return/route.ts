/**
 * Order Return API
 * POST /api/v1/admin/orders/[id]/return
 * Process a return: refund via Stripe, restore inventory, update order items
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { stripe } from '@/lib/stripe/client';
import { getMaxRefundable } from '@/lib/stripe/refund-utils';
import { sendRefundProcessedEmail } from '@/lib/email/email-service';
import { Prisma } from '@prisma/client';
import { releaseCommittedInventory } from '@/lib/inventory/services/order-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ReturnItem {
  orderItemId: string;
  productId: string;
  variantId: string | null;
  returnQuantity: number;
  unitPrice: number;
}

type TransactionClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Restore inventory for a returned item.
 * Mirrors decrementInventoryForOrderItem but increments instead.
 */
async function restoreInventoryForReturnItem(
  tx: TransactionClient,
  productId: string,
  variantId: string | null,
  returnQuantity: number,
  orderNumber: number,
  orderId: string,
): Promise<void> {
  // Check if this product is a bundle
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: {
      isBundle: true,
      bundleComponents: {
        select: {
          componentProductId: true,
          componentVariantId: true,
          quantity: true,
        },
      },
    },
  });

  if (product?.isBundle && product.bundleComponents.length > 0) {
    // Bundle: increment each component's inventory
    for (const component of product.bundleComponents) {
      const incrementQty = component.quantity * returnQuantity;

      let componentVariant;
      if (component.componentVariantId) {
        componentVariant = await tx.productVariant.findUnique({
          where: { id: component.componentVariantId },
          select: { id: true, inventoryQuantity: true },
        });
      } else {
        componentVariant = await tx.productVariant.findFirst({
          where: { productId: component.componentProductId },
          select: { id: true, inventoryQuantity: true },
        });
      }

      if (componentVariant) {
        await tx.productVariant.update({
          where: { id: componentVariant.id },
          data: { inventoryQuantity: { increment: incrementQty } },
        });

        await tx.inventoryMovement.create({
          data: {
            variantId: componentVariant.id,
            type: 'RETURN',
            quantity: incrementQty,
            previousQuantity: componentVariant.inventoryQuantity,
            newQuantity: componentVariant.inventoryQuantity + incrementQty,
            reason: `Return from Order #${orderNumber} (bundle component)`,
            referenceId: orderId,
            referenceType: 'Order',
          },
        });
      }
    }
  } else {
    // Regular product: increment variant directly
    let variant;
    if (variantId) {
      variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, inventoryQuantity: true },
      });
    } else {
      variant = await tx.productVariant.findFirst({
        where: { productId },
        select: { id: true, inventoryQuantity: true },
      });
    }

    if (variant) {
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { inventoryQuantity: { increment: returnQuantity } },
      });

      await tx.inventoryMovement.create({
        data: {
          variantId: variant.id,
          type: 'RETURN',
          quantity: returnQuantity,
          previousQuantity: variant.inventoryQuantity,
          newQuantity: variant.inventoryQuantity + returnQuantity,
          reason: `Return from Order #${orderNumber}`,
          referenceId: orderId,
          referenceType: 'Order',
        },
      });
    }
  }
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
    const { items, reason } = body as {
      items: ReturnItem[];
      reason?: string;
    };

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items specified for return' },
        { status: 400 }
      );
    }

    // Load order with items and existing refunds
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
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
        { success: false, error: 'No Stripe payment found for this order. Cannot process return.' },
        { status: 400 }
      );
    }

    // Validate each return item
    let totalRefundAmount = 0;
    for (const returnItem of items) {
      const orderItem = order.items.find((oi) => oi.id === returnItem.orderItemId);
      if (!orderItem) {
        return NextResponse.json(
          { success: false, error: `Order item ${returnItem.orderItemId} not found` },
          { status: 400 }
        );
      }

      const maxReturnable = orderItem.quantity - orderItem.refundedQuantity;
      if (returnItem.returnQuantity <= 0) {
        return NextResponse.json(
          { success: false, error: `Return quantity must be greater than 0 for ${orderItem.title}` },
          { status: 400 }
        );
      }
      if (returnItem.returnQuantity > maxReturnable) {
        return NextResponse.json(
          { success: false, error: `Cannot return ${returnItem.returnQuantity} of ${orderItem.title} (max returnable: ${maxReturnable})` },
          { status: 400 }
        );
      }

      totalRefundAmount += returnItem.returnQuantity * returnItem.unitPrice;
    }

    // Round to avoid floating point issues
    totalRefundAmount = Math.round(totalRefundAmount * 100) / 100;

    // Cap is based on what Stripe actually captured, not order.total —
    // order.total gets rewritten by OrderAmendment when items are added/removed.
    const totalPriorRefunds = order.refunds.reduce(
      (sum, r) => sum + Number(r.amount),
      0
    );
    const maxRefundable = await getMaxRefundable(order.stripePaymentIntentId, totalPriorRefunds);

    if (totalRefundAmount > maxRefundable) {
      return NextResponse.json({
        success: false,
        error: `Return refund ($${totalRefundAmount.toFixed(2)}) exceeds maximum refundable ($${maxRefundable.toFixed(2)})`,
      }, { status: 400 });
    }

    // Process Stripe refund first (can't roll back if it succeeds)
    const stripeRefund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount: Math.round(totalRefundAmount * 100), // Stripe uses cents
      reason: 'requested_by_customer',
      metadata: {
        orderId: id,
        orderNumber: String(order.orderNumber),
        reason: reason ? `Return: ${reason}` : 'Return: items returned',
        type: 'return',
      },
    });

    // DB transaction for all writes
    await prisma.$transaction(async (tx: TransactionClient) => {
      // Update refundedQuantity on each returned item and restore inventory
      // For fulfilled orders: restore inventoryQuantity (stock back on shelf)
      // For unfulfilled orders: release committedQuantity instead
      const isFulfilled = order.fulfillmentStatus === 'DELIVERED';

      for (const returnItem of items) {
        await tx.orderItem.update({
          where: { id: returnItem.orderItemId },
          data: {
            refundedQuantity: { increment: returnItem.returnQuantity },
          },
        });

        if (isFulfilled) {
          // Order was delivered — restore physical stock
          await restoreInventoryForReturnItem(
            tx,
            returnItem.productId,
            returnItem.variantId,
            returnItem.returnQuantity,
            order.orderNumber,
            order.id,
          );
        }
        // If not fulfilled, committedQuantity will be released after the transaction
      }

      // Create refund record
      await tx.refund.create({
        data: {
          orderId: id,
          stripeRefundId: stripeRefund.id,
          amount: new Prisma.Decimal(totalRefundAmount),
          reason: reason ? `Return: ${reason}` : 'Return: items returned',
          status: 'SUCCEEDED',
          processedBy: 'admin',
          processedAt: new Date(),
        },
      });

      // Check if fully refunded
      const newTotalRefunded = totalPriorRefunds + totalRefundAmount;
      const orderTotal = Number(order.total);
      const newFinancialStatus = newTotalRefunded >= orderTotal ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

      await tx.order.update({
        where: { id },
        data: { financialStatus: newFinancialStatus },
      });
    });

    // For unfulfilled orders, release committed inventory outside transaction
    if (order.fulfillmentStatus !== 'DELIVERED') {
      try {
        await releaseCommittedInventory(id);
      } catch (err) {
        console.error('[Return API] Failed to release committed inventory:', err);
      }
    }

    // Send refund email (non-blocking)
    try {
      await sendRefundProcessedEmail(
        order.customerEmail,
        order.customerName,
        order.orderNumber,
        totalRefundAmount,
        reason ? `Return: ${reason}` : 'Return: items returned'
      );
    } catch (emailError) {
      console.error('[Return API] Failed to send refund email:', emailError);
    }

    const totalItemsReturned = items.reduce((sum, i) => sum + i.returnQuantity, 0);

    return NextResponse.json({
      success: true,
      data: {
        stripeRefundId: stripeRefund.id,
        amount: totalRefundAmount,
        itemsReturned: totalItemsReturned,
        status: stripeRefund.status,
      },
    });
  } catch (error) {
    console.error('[Return API] Error:', error);

    // Handle Stripe-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string };
      return NextResponse.json(
        { success: false, error: `Stripe error: ${stripeError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process return' },
      { status: 500 }
    );
  }
}
