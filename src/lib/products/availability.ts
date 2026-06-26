/**
 * Product availability rules — keeps "is this product purchasable?" in one place.
 *
 * Background (the bug this closes): setting a product to DRAFT or ARCHIVED in the admin used
 * to leave its variants' `availableForSale` flag untouched. The browse catalog hides non-ACTIVE
 * products (it filters `status: 'ACTIVE'`), but cart and checkout key off the variant flag — so
 * a drafted/archived product stayed purchasable through a direct/shared product link or a cart it
 * was added to while still active.
 *
 * Two layers use this module:
 *   1. WRITE layer — {@link cascadeVariantAvailabilityForStatus}: whenever a product moves to a
 *      non-ACTIVE status, flip its variants' availableForSale to false in the same transaction.
 *   2. CHECKOUT layer — {@link assertVariantsPurchasable}: defense-in-depth that re-reads product
 *      status from the DB at purchase time and refuses any line item whose product isn't ACTIVE
 *      (or whose variant isn't availableForSale), even if a stale flag slipped through.
 */

import { Prisma, ProductStatus, type PrismaClient } from '@prisma/client';

type Tx = Prisma.TransactionClient | PrismaClient;

/** Product statuses whose variants must never be purchasable. */
export const NON_PURCHASABLE_STATUSES: ProductStatus[] = [
  ProductStatus.DRAFT,
  ProductStatus.ARCHIVED,
];

/** True when this status means the product (and all its variants) must be off-sale. */
export function isNonPurchasableStatus(
  status: ProductStatus | string | null | undefined
): boolean {
  return status === ProductStatus.DRAFT || status === ProductStatus.ARCHIVED;
}

/**
 * Cascade a product's status onto its variants' availability.
 *
 * When a product is moving to DRAFT or ARCHIVED, flip every variant that is still
 * `availableForSale: true` to false within the given transaction so it can't be bought via a
 * stale cart or a direct/shared product link. Returns how many variants were flipped.
 *
 * Re-activating (status === ACTIVE) intentionally does NOT force availableForSale back to true:
 * turning a product back on should be a deliberate, separate action so we never silently re-list
 * a variant an operator meant to keep hidden. Calling this with ACTIVE (or undefined) is a no-op.
 */
export async function cascadeVariantAvailabilityForStatus(
  tx: Tx,
  productId: string,
  newStatus: ProductStatus | string | null | undefined
): Promise<number> {
  if (!isNonPurchasableStatus(newStatus)) return 0;
  const { count } = await tx.productVariant.updateMany({
    where: { productId, availableForSale: true },
    data: { availableForSale: false },
  });
  return count;
}

/** One line item to validate at purchase time. `title` is only used for error messages. */
export interface PurchasabilityItem {
  productId: string;
  variantId: string;
  title?: string | null;
}

/**
 * Thrown by {@link assertVariantsPurchasable} when one or more items are no longer sellable.
 * `reasons` lists each offending item so the caller can surface an actionable message.
 */
export class ProductNotPurchasableError extends Error {
  constructor(public readonly reasons: string[]) {
    super(`One or more items are no longer available for purchase: ${reasons.join('; ')}`);
    this.name = 'ProductNotPurchasableError';
  }
}

/**
 * Defense-in-depth: verify every item references an ACTIVE product whose variant is
 * `availableForSale`. Re-reads state from the DB (NOT the cart/draft snapshot, which can carry a
 * stale flag) so a since-drafted/archived product can't slip a line item through checkout.
 *
 * Throws {@link ProductNotPurchasableError} listing every offending item. No-ops on an empty list.
 */
export async function assertVariantsPurchasable(
  tx: Tx,
  items: PurchasabilityItem[]
): Promise<void> {
  if (items.length === 0) return;

  const variantIds = [...new Set(items.map((i) => i.variantId))];
  const variants = await tx.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      availableForSale: true,
      product: { select: { id: true, status: true, title: true } },
    },
  });
  const byVariantId = new Map(variants.map((v) => [v.id, v]));

  const reasons: string[] = [];
  for (const item of items) {
    const variant = byVariantId.get(item.variantId);
    const label = item.title || variant?.product.title || item.variantId;
    if (!variant) {
      reasons.push(`${label}: product no longer exists`);
      continue;
    }
    // Either gate failing means the same thing to the customer: not for sale.
    if (variant.product.status !== ProductStatus.ACTIVE || !variant.availableForSale) {
      reasons.push(`${label}: no longer available for purchase`);
    }
  }

  if (reasons.length > 0) throw new ProductNotPurchasableError(reasons);
}
