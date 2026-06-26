/**
 * Charge snapshot — single source of truth for "what Stripe actually charged".
 *
 * The fulfillment Order's items used to be rebuilt by re-reading the cart/drafts at
 * webhook time, which let items added/removed AFTER the Stripe session was created drift
 * away from what was charged (items added shipped free; items removed stayed billed).
 *
 * Fix: at session-creation we persist the exact PRODUCT line items priced into the Stripe
 * charge (the snapshot), and at order-creation we build OrderItems from THAT snapshot —
 * never from a re-read. To guarantee the snapshot *is* what's charged, both the Stripe
 * `line_items` and the persisted snapshot are produced from this one module, so they cannot
 * drift. `assertOrderItemsMatchCharge` is a tripwire that hard-fails if they ever do.
 *
 * Invariant: an Order's OrderItems must always equal the product line items Stripe charged.
 *
 * Scope: PRODUCTS ONLY. Tax, tip, and delivery are separate Stripe line items and are NOT
 * part of the snapshot (they are not OrderItems).
 */

import type Stripe from 'stripe';
import { Prisma, type PrismaClient } from '@prisma/client';
import { snapshotItemCost } from '@/lib/analytics/margin-service';

type Tx = Prisma.TransactionClient | PrismaClient;

/** A cart item / draft item that can be priced into a Stripe charge. */
export interface ChargeableItem {
  productId: string;
  variantId: string;
  title: string;
  variantTitle?: string | null;
  sku?: string | null;
  /** Unit price in DOLLARS (Decimal, number, or anything with toString — e.g. Prisma.Decimal). */
  price: Prisma.Decimal | number | string | { toString(): string };
  quantity: number;
}

/** One immutable product line as it was priced into the Stripe charge. Unit price in CENTS. */
export interface ChargedLineItem {
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  unitPriceCents: number;
  quantity: number;
}

/** OrderItem.create payload built from a charged line (orderId is added by the caller). */
export interface OrderItemSnapshotCreate {
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  price: Prisma.Decimal;
  quantity: number;
  totalPrice: Prisma.Decimal;
  unitCost: Prisma.Decimal | null;
  totalCost: Prisma.Decimal | null;
}

/** Minimal shape the guard needs — satisfied by both built payloads and persisted OrderItem rows. */
interface GuardOrderItem {
  productId: string;
  variantId: string;
  price: Prisma.Decimal | number | string;
  quantity: number;
  totalPrice: Prisma.Decimal | number | string;
}

/** Thrown when OrderItems diverge from the charged snapshot. Caught by the webhook so Stripe retries. */
export class ChargeReconciliationError extends Error {
  constructor(
    message: string,
    public readonly details: { diffs: string[]; itemsTotalCents: number; chargedTotalCents: number }
  ) {
    super(message);
    this.name = 'ChargeReconciliationError';
  }
}

/** Convert a dollar price (Decimal/number/string) to integer cents, matching Stripe's unit_amount. */
function toCents(price: ChargeableItem['price']): number {
  const asNumber =
    typeof price === 'object' && price !== null ? Number(price.toString()) : Number(price);
  return Math.round(asNumber * 100);
}

/**
 * Map cart/draft items to the immutable charged-line snapshot. PRODUCTS ONLY.
 * This is the exact set of product lines that must also be sent to Stripe (via
 * {@link chargedLineItemToStripe}), so the snapshot literally equals the charge.
 */
export function buildChargedLineItems(items: ChargeableItem[]): ChargedLineItem[] {
  return items.map((it) => ({
    productId: it.productId,
    variantId: it.variantId,
    title: it.title,
    variantTitle: it.variantTitle ?? null,
    sku: it.sku ?? null,
    unitPriceCents: toCents(it.price),
    quantity: it.quantity,
  }));
}

/**
 * Map one charged line to a Stripe Checkout product line item. Both checkout builders route
 * their product lines through this so the snapshot and the Stripe charge cannot diverge.
 */
export function chargedLineItemToStripe(
  li: ChargedLineItem
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    price_data: {
      currency: 'usd',
      product_data: {
        name: li.title,
        description:
          li.variantTitle && li.variantTitle !== 'Default Title' ? li.variantTitle : undefined,
        metadata: {
          productId: li.productId,
          variantId: li.variantId,
          ...(li.sku ? { sku: li.sku } : {}),
        },
      },
      unit_amount: li.unitPriceCents,
    },
    quantity: li.quantity,
  };
}

/** Total cents of the charged PRODUCT lines (excludes tax/tip/delivery, which are not in the snapshot). */
export function chargedProductsTotalCents(snapshot: ChargedLineItem[]): number {
  return snapshot.reduce((sum, li) => sum + li.unitPriceCents * li.quantity, 0);
}

/**
 * Read a persisted `charged_line_items` JSON column back into typed snapshot lines.
 * Returns null when the column is empty (carts/payments created before this feature shipped),
 * which signals callers to use their legacy fallback source + warn.
 */
export function parseChargedLineItems(value: Prisma.JsonValue | null | undefined): ChargedLineItem[] | null {
  if (!value || !Array.isArray(value)) return null;
  const out: ChargedLineItem[] = [];
  for (const raw of value as unknown[]) {
    if (!raw || typeof raw !== 'object') return null;
    const li = raw as Record<string, unknown>;
    if (typeof li.productId !== 'string' || typeof li.variantId !== 'string') return null;
    out.push({
      productId: li.productId,
      variantId: li.variantId,
      title: typeof li.title === 'string' ? li.title : '',
      variantTitle: typeof li.variantTitle === 'string' ? li.variantTitle : null,
      sku: typeof li.sku === 'string' ? li.sku : null,
      unitPriceCents: Number(li.unitPriceCents) || 0,
      quantity: Number(li.quantity) || 0,
    });
  }
  return out.length > 0 ? out : null;
}

/**
 * Build OrderItem.create payloads from the charged snapshot, attaching COGS via the existing
 * {@link snapshotItemCost} so margin behavior is unchanged. The returned payloads omit orderId;
 * the solo path adds it, the group/cron paths nest them under `order.create({ items: { create } })`.
 */
export async function snapshotToOrderItemCreates(
  tx: Tx,
  snapshot: ChargedLineItem[]
): Promise<OrderItemSnapshotCreate[]> {
  const out: OrderItemSnapshotCreate[] = [];
  for (const li of snapshot) {
    const { unitCost, totalCost } = await snapshotItemCost(tx, li.variantId, li.quantity);
    out.push({
      productId: li.productId,
      variantId: li.variantId,
      title: li.title,
      variantTitle: li.variantTitle,
      sku: li.sku,
      price: new Prisma.Decimal(li.unitPriceCents).div(100),
      quantity: li.quantity,
      totalPrice: new Prisma.Decimal(li.unitPriceCents).mul(li.quantity).div(100),
      unitCost,
      totalCost,
    });
  }
  return out;
}

/**
 * Defense-in-depth guard: assert the OrderItems about to be persisted match the charged
 * snapshot (per-line qty + unit price, and the total, within `epsilonCents`). Throws
 * {@link ChargeReconciliationError} on mismatch so the webhook fails and Stripe retries rather
 * than committing a wrong order. Set `CHARGE_GUARD_MODE=warn` to log instead of throw (e.g. a
 * cautious first deploy). No-ops happily in the snapshot-built happy path.
 */
export function assertOrderItemsMatchCharge(
  orderItems: GuardOrderItem[],
  snapshot: ChargedLineItem[],
  opts: { epsilonCents?: number } = {}
): void {
  const epsilon = opts.epsilonCents ?? 1;
  const chargedTotalCents = chargedProductsTotalCents(snapshot);
  const itemsTotalCents = orderItems.reduce(
    (sum, oi) => sum + Math.round(Number(oi.totalPrice) * 100),
    0
  );

  const key = (x: { productId: string; variantId: string }): string => `${x.productId}::${x.variantId}`;
  const snapByKey = new Map(snapshot.map((li) => [key(li), li] as const));
  const itemsByKey = new Map(orderItems.map((oi) => [key(oi), oi] as const));
  const diffs: string[] = [];

  if (Math.abs(itemsTotalCents - chargedTotalCents) > epsilon) {
    diffs.push(`product total ${itemsTotalCents}¢ vs charged ${chargedTotalCents}¢`);
  }
  for (const [k, li] of snapByKey) {
    const oi = itemsByKey.get(k);
    if (!oi) {
      diffs.push(`charged line "${li.title}" (${k}) missing from OrderItems`);
      continue;
    }
    if (oi.quantity !== li.quantity) {
      diffs.push(`qty mismatch "${li.title}": order ${oi.quantity} vs charged ${li.quantity}`);
    }
    const oiUnitCents = Math.round(Number(oi.price) * 100);
    if (Math.abs(oiUnitCents - li.unitPriceCents) > epsilon) {
      diffs.push(`unit-price mismatch "${li.title}": order ${oiUnitCents}¢ vs charged ${li.unitPriceCents}¢`);
    }
  }
  for (const k of itemsByKey.keys()) {
    if (!snapByKey.has(k)) {
      diffs.push(`OrderItem (${k}) was not in the Stripe charge`);
    }
  }

  if (diffs.length === 0) return;

  const message = `OrderItems do not match the Stripe charge snapshot: ${diffs.join('; ')}`;
  if (process.env.CHARGE_GUARD_MODE === 'warn') {
    console.warn(`[charge-snapshot] GUARD WARN — ${message}`);
    return;
  }
  throw new ChargeReconciliationError(message, { diffs, itemsTotalCents, chargedTotalCents });
}
