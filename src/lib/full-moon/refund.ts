/**
 * Full Moon Party — full-refund helper for one ticket order.
 *
 * Reuses the same Stripe-authoritative plumbing as the admin refund route so
 * retries can never double-refund:
 *  - getMaxRefundable() caps the refund at (Stripe-captured − prior refunds),
 *    taking the LARGER of the DB sum and Stripe's actual refunded total.
 *  - A deterministic idempotency key means a replayed request returns the same
 *    Stripe refund instead of issuing new money.
 *  - createRefund() writes the DB Refund row and recomputes financialStatus
 *    (→ REFUNDED once fully refunded).
 *
 * Money-safety notes:
 *  - $0 comps (host/VIP) are skipped — nothing was charged.
 *  - An order already fully refunded returns 'skipped-already-refunded' (cap ≤ 0),
 *    so re-running the batch is safe.
 *  - Stripe is the source of truth; this never trusts Order.total for the cap.
 */
import { prisma } from '@/lib/database/client';
import { stripe } from '@/lib/stripe/client';
import { getMaxRefundable } from '@/lib/stripe/refund-utils';
import { createRefund } from '@/lib/inventory/services/order-service';
import { sendFullMoonRefundEmail } from '@/lib/email/email-service';
import { TICKET_PRODUCT_HANDLE } from '@/components/full-moon/event';

export type FullMoonRefundStatus =
  | 'refunded'
  | 'would-refund'
  | 'skipped-already-refunded'
  | 'skipped-no-payment'
  | 'skipped-comp'
  | 'skipped-mixed-order'
  | 'error';

export interface FullMoonRefundOutcome {
  orderId: string;
  orderNumber: number;
  name: string;
  email: string;
  status: FullMoonRefundStatus;
  /** Amount still refundable per Stripe, in dollars. */
  maxRefundable: number;
  /** Amount actually refunded (apply) or that would be refunded (dry-run). */
  amount: number;
  stripeRefundId?: string;
  emailSent?: boolean;
  error?: string;
}

export const DEFAULT_FULL_MOON_REFUND_REASON = 'Full Moon Party postponed — minimum not met';

export interface RefundFullMoonOptions {
  /** false = dry-run (no Stripe/DB writes, no email); true = execute. */
  apply: boolean;
  /** Refund reason stamped on Stripe + the DB Refund row. */
  reason?: string;
  /** Send the buyer the roll-forward email on a successful refund (default true). */
  sendEmail?: boolean;
}

/**
 * Refund one Full Moon ticket order in full (its entire remaining refundable
 * amount). Idempotent and dry-run-safe. Loads the order fresh so a mid-run
 * re-read always reflects the latest DB state.
 */
export async function refundFullMoonOrder(
  orderId: string,
  opts: RefundFullMoonOptions,
): Promise<FullMoonRefundOutcome> {
  const reason = opts.reason ?? DEFAULT_FULL_MOON_REFUND_REASON;

  const [order, ticketProduct] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: { refunds: true, items: { select: { productId: true, totalPrice: true } } },
    }),
    prisma.product.findUnique({ where: { handle: TICKET_PRODUCT_HANDLE }, select: { id: true } }),
  ]);
  if (!order) {
    return {
      orderId,
      orderNumber: 0,
      name: '',
      email: '',
      status: 'error',
      maxRefundable: 0,
      amount: 0,
      error: 'Order not found',
    };
  }

  const base = {
    orderId,
    orderNumber: order.orderNumber,
    name: order.customerName,
    email: order.customerEmail,
  };

  // Refuse to refund an order that bundles anything other than the ticket
  // product — refunding the whole PaymentIntent would over-refund non-ticket
  // dollars. Ticket orders are ticket-only by construction; a mixed order is
  // unexpected and must be handled by hand, never blind-refunded.
  const hasNonTicketItem = !ticketProduct || order.items.some((it) => it.productId !== ticketProduct.id);
  if (hasNonTicketItem) {
    return { ...base, status: 'skipped-mixed-order', maxRefundable: 0, amount: 0 };
  }

  // Nothing charged — a $0 comp / host row (defined by $0, not the note, so a
  // genuinely-paid order can never be silently skipped over a stray tag).
  if (Number(order.total) === 0) {
    return { ...base, status: 'skipped-comp', maxRefundable: 0, amount: 0 };
  }
  if (!order.stripePaymentIntentId) {
    return { ...base, status: 'skipped-no-payment', maxRefundable: 0, amount: 0 };
  }

  try {
    const priorRefunds = order.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const maxRefundable = await getMaxRefundable(order.stripePaymentIntentId, priorRefunds);

    // Already fully refunded — safe to re-run.
    if (maxRefundable <= 0) {
      return { ...base, status: 'skipped-already-refunded', maxRefundable: 0, amount: 0 };
    }

    if (!opts.apply) {
      return { ...base, status: 'would-refund', maxRefundable, amount: maxRefundable };
    }

    const amountCents = Math.round(maxRefundable * 100);
    const refund = await stripe.refunds.create(
      {
        payment_intent: order.stripePaymentIntentId,
        amount: amountCents,
        reason: 'requested_by_customer',
        metadata: { orderId, orderNumber: String(order.orderNumber), reason },
      },
      // Scoped to (order, amount) so a retried run replays the SAME refund
      // instead of issuing new money.
      { idempotencyKey: `fm-batch-refund-${orderId}-${amountCents}` },
    );

    // Write + stamp the DB Refund row; createRefund recomputes financialStatus
    // (→ REFUNDED once the full captured amount is refunded).
    const refundRowId = await createRefund(orderId, maxRefundable, reason);
    await prisma.refund.update({
      where: { id: refundRowId },
      data: { stripeRefundId: refund.id, processedBy: 'batch-refund', processedAt: new Date() },
    });

    let emailSent = false;
    if (opts.sendEmail !== false) {
      try {
        await sendFullMoonRefundEmail(order.customerEmail, order.customerName, order.orderNumber, maxRefundable);
        emailSent = true;
      } catch (emailError) {
        console.error(
          `[FullMoon Refund] email failed for order #${order.orderNumber}:`,
          emailError instanceof Error ? emailError.message : emailError,
        );
      }
    }

    return { ...base, status: 'refunded', maxRefundable, amount: maxRefundable, stripeRefundId: refund.id, emailSent };
  } catch (error) {
    return {
      ...base,
      status: 'error',
      maxRefundable: 0,
      amount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
