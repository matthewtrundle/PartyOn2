/**
 * Order Return API
 * POST /api/v1/admin/orders/[id]/return
 * Process a return: refund via Stripe, restore inventory, update order items
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
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

// We store/transmit the reason prefixed as `Return: ${reason}`. Stripe caps a
// metadata value at 500 chars, so the raw reason must leave room for that
// 8-char prefix — cap at 450 for a clean safety margin (no real return reason
// approaches this).
const REASON_MAX = 450;

/**
 * Request body contract. Only `orderItemId` + a positive whole `returnQuantity`
 * are read per line; any extra price/product/variant fields are stripped and
 * ignored (the server is the sole source of those values — and stripping rather
 * than rejecting keeps a stale cached client working right after a deploy).
 */
const ReturnRequestSchema = z.object({
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        returnQuantity: z.number().int().positive(),
      }),
    )
    .min(1, 'No items specified for return'),
  reason: z.string().max(REASON_MAX).optional(),
});

/** A return line after validation, carrying canonical server-side values. */
interface ValidatedReturn {
  orderItemId: string;
  productId: string;
  variantId: string | null;
  returnQuantity: number;
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

/** Thrown inside the locked transaction when a concurrent return already
 * consumed the returnable quantity of a line. Surfaced to the caller as 409. */
class ConcurrentReturnError extends Error {
  constructor(public readonly orderItemId: string) {
    super(`Concurrent return conflict on order item ${orderItemId}`);
    this.name = 'ConcurrentReturnError';
  }
}

/** Thrown inside the locked transaction when the refund would exceed the
 * Stripe-authoritative cap (re-checked under the lock). Surfaced as 400. */
class RefundCapError extends Error {
  constructor(public readonly amount: number, public readonly cap: number) {
    super('Return refund exceeds maximum refundable');
    this.name = 'RefundCapError';
  }
}

type StripeRefund = Awaited<ReturnType<typeof stripe.refunds.create>>;

/** Stripe refunds can take a beat; allow the locked transaction enough time to
 * cover the round-trip without tripping Prisma's default 5s transaction limit. */
const RETURN_TX_TIMEOUT_MS = 25_000;

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    // Parse the body defensively: a malformed/empty body makes request.json()
    // throw, which should be a 400 (bad input), not a 500.
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const parsed = ReturnRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid return request' },
        { status: 400 }
      );
    }
    const { items, reason } = parsed.data;

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
    const paymentIntentId = order.stripePaymentIntentId;

    // Validate each return item. The refund is computed ONLY from the stored
    // OrderItem.price (server source of truth) — never from any price in the
    // request body — so an inflated client value cannot enlarge the refund.
    let totalRefundAmount = 0;
    const validatedReturns: ValidatedReturn[] = [];
    const seenOrderItemIds = new Set<string>();
    for (const returnItem of items) {
      // Reject a line that names the same order item twice: each pass reads the
      // same `refundedQuantity` from the in-memory order, so duplicates would
      // both clear the max-returnable check and stack into an over-refund.
      if (seenOrderItemIds.has(returnItem.orderItemId)) {
        return NextResponse.json(
          { success: false, error: `Order item ${returnItem.orderItemId} listed more than once` },
          { status: 400 }
        );
      }
      seenOrderItemIds.add(returnItem.orderItemId);

      const orderItem = order.items.find((oi) => oi.id === returnItem.orderItemId);
      if (!orderItem) {
        return NextResponse.json(
          { success: false, error: `Order item ${returnItem.orderItemId} not found` },
          { status: 400 }
        );
      }

      const maxReturnable = orderItem.quantity - orderItem.refundedQuantity;
      if (returnItem.returnQuantity > maxReturnable) {
        return NextResponse.json(
          { success: false, error: `Cannot return ${returnItem.returnQuantity} of ${orderItem.title} (max returnable: ${maxReturnable})` },
          { status: 400 }
        );
      }

      totalRefundAmount += returnItem.returnQuantity * Number(orderItem.price);
      validatedReturns.push({
        orderItemId: orderItem.id,
        productId: orderItem.productId,
        variantId: orderItem.variantId,
        returnQuantity: returnItem.returnQuantity,
      });
    }

    // Round to avoid floating point issues
    totalRefundAmount = Math.round(totalRefundAmount * 100) / 100;

    // Prior refunds from the snapshot. getMaxRefundable below takes the larger
    // of this and Stripe's actual refunded total, so a stale value here can only
    // make the cap MORE conservative, never looser.
    const totalPriorRefunds = order.refunds.reduce(
      (sum, r) => sum + Number(r.amount),
      0
    );

    // Idempotency key = order + the exact set of returned items, so a retry
    // after the Stripe refund succeeded but a DB write failed replays the same
    // refund instead of double-refunding.
    const returnFingerprint = createHash('sha1')
      .update(items.map((it) => `${it.orderItemId}:${it.returnQuantity}`).sort().join(','))
      .digest('hex');

    // Everything money-or-quantity-critical happens in ONE transaction that
    // holds a row lock on this order's items across the Stripe call. That makes
    // the critical section atomic (a mid-way failure rolls the DB writes back;
    // the idempotency key replays Stripe on retry) AND serializes concurrent
    // returns for the same order: a second request blocks on the lock, then
    // re-reads the fresh refundedQuantity and bails out if its line was already
    // consumed — so no two returns can ever over-refund a line.
    //
    // The lock is held across ~1-3 Stripe round-trips. This is an admin-only,
    // low-volume endpoint intentionally serialized per order; it is not built
    // for bulk concurrent returns of the same order.
    let stripeRefund: StripeRefund;
    try {
      stripeRefund = await prisma.$transaction<StripeRefund>(async (tx: TransactionClient) => {
        // Lock all of this order's item rows, in a stable order (prevents
        // deadlock between concurrent returns), for the transaction's duration.
        const lockedItems = await tx.$queryRaw<{ id: string; quantity: number; refunded_quantity: number }[]>(
          Prisma.sql`SELECT id, quantity, refunded_quantity FROM order_items WHERE order_id = ${id} ORDER BY id FOR UPDATE`
        );

        // Re-validate each line against the CURRENT refundedQuantity (not the
        // pre-lock snapshot). A line another request already consumed fails here
        // and rolls the whole transaction back before any money moves.
        for (const r of validatedReturns) {
          const fresh = lockedItems.find((row) => row.id === r.orderItemId);
          if (!fresh || r.returnQuantity > fresh.quantity - fresh.refunded_quantity) {
            throw new ConcurrentReturnError(r.orderItemId);
          }
        }

        // Re-check the money cap under the lock (Stripe-authoritative) so two
        // concurrent returns of different lines can't both slip past it.
        const maxRefundable = await getMaxRefundable(paymentIntentId, totalPriorRefunds);
        if (totalRefundAmount > maxRefundable) {
          throw new RefundCapError(totalRefundAmount, maxRefundable);
        }

        // Issue the refund, then apply all DB writes atomically with it.
        const refund = await stripe.refunds.create(
          {
            payment_intent: paymentIntentId,
            amount: Math.round(totalRefundAmount * 100), // Stripe uses cents
            reason: 'requested_by_customer',
            metadata: {
              orderId: id,
              orderNumber: String(order.orderNumber),
              reason: reason ? `Return: ${reason}` : 'Return: items returned',
              type: 'return',
            },
          },
          { idempotencyKey: `order-return-${id}-${returnFingerprint}` }
        );

        // Update refundedQuantity and restore inventory.
        // For fulfilled orders: restore inventoryQuantity (stock back on shelf)
        // For unfulfilled orders: release committedQuantity instead (after the tx)
        const isFulfilled = order.fulfillmentStatus === 'DELIVERED';
        for (const r of validatedReturns) {
          await tx.orderItem.update({
            where: { id: r.orderItemId },
            data: { refundedQuantity: { increment: r.returnQuantity } },
          });
          if (isFulfilled) {
            // Order was delivered — restore physical stock
            await restoreInventoryForReturnItem(
              tx,
              r.productId,
              r.variantId,
              r.returnQuantity,
              order.orderNumber,
              order.id,
            );
          }
          // If not fulfilled, committedQuantity is released after the transaction
        }

        // Create refund record
        await tx.refund.create({
          data: {
            orderId: id,
            stripeRefundId: refund.id,
            amount: new Prisma.Decimal(totalRefundAmount),
            reason: reason ? `Return: ${reason}` : 'Return: items returned',
            status: 'SUCCEEDED',
            processedBy: 'admin',
            processedAt: new Date(),
          },
        });

        // Check if fully refunded
        const newTotalRefunded = totalPriorRefunds + totalRefundAmount;
        const newFinancialStatus = newTotalRefunded >= Number(order.total) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        await tx.order.update({
          where: { id },
          data: { financialStatus: newFinancialStatus },
        });

        return refund;
      }, { timeout: RETURN_TX_TIMEOUT_MS });
    } catch (err) {
      if (err instanceof ConcurrentReturnError) {
        return NextResponse.json(
          { success: false, error: 'This order was just modified by another request. Please reload and try again.' },
          { status: 409 }
        );
      }
      if (err instanceof RefundCapError) {
        return NextResponse.json(
          { success: false, error: `Return refund ($${err.amount.toFixed(2)}) exceeds maximum refundable ($${err.cap.toFixed(2)})` },
          { status: 400 }
        );
      }
      throw err;
    }

    // For unfulfilled orders, release committed inventory outside transaction.
    // The refund + refundedQuantity are already durably committed; a failure here
    // only leaves committedQuantity slightly inflated (under-available, safe
    // direction) — log with the orderId so it can be reconciled.
    if (order.fulfillmentStatus !== 'DELIVERED') {
      try {
        await releaseCommittedInventory(id);
      } catch (err) {
        console.error(`[Return API] Failed to release committed inventory for order ${id}:`, err);
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

    const totalItemsReturned = validatedReturns.reduce((sum, i) => sum + i.returnQuantity, 0);

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
