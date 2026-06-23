/**
 * Product availability rules — the two layers that stop a DRAFT/ARCHIVED product from being sold:
 *   1. cascadeVariantAvailabilityForStatus — when a product goes non-ACTIVE, its variants go off-sale.
 *   2. assertVariantsPurchasable — checkout-time guard that refuses non-ACTIVE / off-sale items.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  cascadeVariantAvailabilityForStatus,
  assertVariantsPurchasable,
  isNonPurchasableStatus,
  ProductNotPurchasableError,
} from '@/lib/products/availability';

// A fake transaction client exposing just the productVariant methods the helpers touch.
function fakeTx(opts: {
  updateManyCount?: number;
  findManyResult?: Array<{
    id: string;
    availableForSale: boolean;
    product: { id: string; status: string; title: string };
  }>;
}) {
  const updateMany = vi.fn().mockResolvedValue({ count: opts.updateManyCount ?? 0 });
  const findMany = vi.fn().mockResolvedValue(opts.findManyResult ?? []);
  const tx = { productVariant: { updateMany, findMany } };
  return { tx: tx as never, updateMany, findMany };
}

describe('isNonPurchasableStatus', () => {
  it('is true for DRAFT and ARCHIVED, false for ACTIVE / null / undefined', () => {
    expect(isNonPurchasableStatus('DRAFT')).toBe(true);
    expect(isNonPurchasableStatus('ARCHIVED')).toBe(true);
    expect(isNonPurchasableStatus('ACTIVE')).toBe(false);
    expect(isNonPurchasableStatus(null)).toBe(false);
    expect(isNonPurchasableStatus(undefined)).toBe(false);
  });
});

describe('cascadeVariantAvailabilityForStatus', () => {
  it('flips still-available variants off-sale for DRAFT', async () => {
    const { tx, updateMany } = fakeTx({ updateManyCount: 3 });
    const count = await cascadeVariantAvailabilityForStatus(tx, 'prod-1', 'DRAFT');
    expect(count).toBe(3);
    expect(updateMany).toHaveBeenCalledWith({
      where: { productId: 'prod-1', availableForSale: true },
      data: { availableForSale: false },
    });
  });

  it('flips still-available variants off-sale for ARCHIVED', async () => {
    const { tx, updateMany } = fakeTx({ updateManyCount: 1 });
    const count = await cascadeVariantAvailabilityForStatus(tx, 'prod-2', 'ARCHIVED');
    expect(count).toBe(1);
    expect(updateMany).toHaveBeenCalledOnce();
  });

  it('does NOT touch variants for ACTIVE (re-activation is deliberate, never auto-re-enabled)', async () => {
    const { tx, updateMany } = fakeTx({});
    const count = await cascadeVariantAvailabilityForStatus(tx, 'prod-3', 'ACTIVE');
    expect(count).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('is a no-op when status is undefined (status not being changed)', async () => {
    const { tx, updateMany } = fakeTx({});
    const count = await cascadeVariantAvailabilityForStatus(tx, 'prod-4', undefined);
    expect(count).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe('assertVariantsPurchasable', () => {
  it('resolves when every item is an ACTIVE product with an available variant', async () => {
    const { tx, findMany } = fakeTx({
      findManyResult: [
        { id: 'v1', availableForSale: true, product: { id: 'p1', status: 'ACTIVE', title: 'Beer' } },
        { id: 'v2', availableForSale: true, product: { id: 'p2', status: 'ACTIVE', title: 'Wine' } },
      ],
    });
    await expect(
      assertVariantsPurchasable(tx, [
        { productId: 'p1', variantId: 'v1', title: 'Beer' },
        { productId: 'p2', variantId: 'v2', title: 'Wine' },
      ])
    ).resolves.toBeUndefined();
    // De-duplicates variant ids when querying.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['v1', 'v2'] } } })
    );
  });

  it('does not even query for an empty item list', async () => {
    const { tx, findMany } = fakeTx({});
    await expect(assertVariantsPurchasable(tx, [])).resolves.toBeUndefined();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('rejects a DRAFT product', async () => {
    const { tx } = fakeTx({
      findManyResult: [
        { id: 'v1', availableForSale: true, product: { id: 'p1', status: 'DRAFT', title: 'Bloody Mary Mix' } },
      ],
    });
    await expect(
      assertVariantsPurchasable(tx, [{ productId: 'p1', variantId: 'v1', title: 'Bloody Mary Mix' }])
    ).rejects.toBeInstanceOf(ProductNotPurchasableError);
  });

  it('rejects an ARCHIVED product', async () => {
    const { tx } = fakeTx({
      findManyResult: [
        { id: 'v1', availableForSale: true, product: { id: 'p1', status: 'ARCHIVED', title: 'Old Vodka' } },
      ],
    });
    await expect(
      assertVariantsPurchasable(tx, [{ productId: 'p1', variantId: 'v1', title: 'Old Vodka' }])
    ).rejects.toThrow(/Old Vodka/);
  });

  it('rejects an ACTIVE product whose variant is not availableForSale', async () => {
    const { tx } = fakeTx({
      findManyResult: [
        { id: 'v1', availableForSale: false, product: { id: 'p1', status: 'ACTIVE', title: 'Sold Out IPA' } },
      ],
    });
    await expect(
      assertVariantsPurchasable(tx, [{ productId: 'p1', variantId: 'v1', title: 'Sold Out IPA' }])
    ).rejects.toThrow(/no longer available/);
  });

  it('rejects a variant that no longer exists in the catalog', async () => {
    const { tx } = fakeTx({ findManyResult: [] });
    await expect(
      assertVariantsPurchasable(tx, [{ productId: 'p1', variantId: 'ghost', title: 'Ghost' }])
    ).rejects.toThrow(/no longer exists/);
  });

  it('lists every offending item (not just the first) so the caller can surface all of them', async () => {
    const { tx } = fakeTx({
      findManyResult: [
        { id: 'ok', availableForSale: true, product: { id: 'pok', status: 'ACTIVE', title: 'Fine' } },
        { id: 'draft', availableForSale: true, product: { id: 'pd', status: 'DRAFT', title: 'Drafted' } },
        { id: 'off', availableForSale: false, product: { id: 'po', status: 'ACTIVE', title: 'OffSale' } },
      ],
    });
    let caught: ProductNotPurchasableError | null = null;
    try {
      await assertVariantsPurchasable(tx, [
        { productId: 'pok', variantId: 'ok', title: 'Fine' },
        { productId: 'pd', variantId: 'draft', title: 'Drafted' },
        { productId: 'po', variantId: 'off', title: 'OffSale' },
      ]);
    } catch (err) {
      caught = err as ProductNotPurchasableError;
    }
    expect(caught).toBeInstanceOf(ProductNotPurchasableError);
    expect(caught!.reasons).toHaveLength(2);
    expect(caught!.reasons.join(' ')).toContain('Drafted');
    expect(caught!.reasons.join(' ')).toContain('OffSale');
    expect(caught!.reasons.join(' ')).not.toContain('Fine');
  });
});
