/**
 * addDraftItem availability guard.
 *
 * addDraftItem is the shared service function behind BOTH the dashboard add-item endpoint
 * (POST /api/v2/group-orders/[code]/tabs/[tabId]/items) and the /quote/start pre-loader, so the
 * guard here covers both surfaces: a DRAFT/ARCHIVED product (or an off-sale variant) can never be
 * added to a tab.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSubOrderFindUnique = vi.fn();
const mockProductVariantFindMany = vi.fn();
const mockDraftCartItemFindUnique = vi.fn();
const mockDraftCartItemCreate = vi.fn();
const mockDraftCartItemUpdate = vi.fn();

vi.mock('@/lib/database/client', () => ({
  prisma: {
    subOrder: { findUnique: (...a: unknown[]) => mockSubOrderFindUnique(...a) },
    productVariant: { findMany: (...a: unknown[]) => mockProductVariantFindMany(...a) },
    draftCartItem: {
      findUnique: (...a: unknown[]) => mockDraftCartItemFindUnique(...a),
      create: (...a: unknown[]) => mockDraftCartItemCreate(...a),
      update: (...a: unknown[]) => mockDraftCartItemUpdate(...a),
    },
  },
}));

import { addDraftItem } from '@/lib/group-orders-v2/service';
import { ProductNotPurchasableError } from '@/lib/products/availability';

// An OPEN tab whose order deadline is far in the future.
const OPEN_TAB = { id: 'tab-1', status: 'OPEN', orderDeadline: new Date('2999-01-01') };

const ITEM_INPUT = {
  participantId: 'part-1',
  productId: 'p1',
  variantId: 'v1',
  title: 'Beer',
  price: 10,
  quantity: 2,
};

describe('addDraftItem availability guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubOrderFindUnique.mockResolvedValue(OPEN_TAB);
  });

  it('adds the item when the product is ACTIVE and the variant is available', async () => {
    mockProductVariantFindMany.mockResolvedValue([
      { id: 'v1', availableForSale: true, product: { id: 'p1', status: 'ACTIVE', title: 'Beer' } },
    ]);
    mockDraftCartItemFindUnique.mockResolvedValue(null);
    mockDraftCartItemCreate.mockResolvedValue({
      id: 'draft-1',
      productId: 'p1',
      variantId: 'v1',
      title: 'Beer',
      variantTitle: null,
      price: 10,
      imageUrl: null,
      quantity: 2,
      addedBy: { id: 'part-1', guestName: 'Host', isHost: true },
      product: { handle: 'beer' },
    });

    const result = await addDraftItem('tab-1', ITEM_INPUT);

    expect(result.id).toBe('draft-1');
    expect(mockDraftCartItemCreate).toHaveBeenCalledOnce();
  });

  it('rejects a DRAFT product and never writes a draft item', async () => {
    mockProductVariantFindMany.mockResolvedValue([
      { id: 'v1', availableForSale: true, product: { id: 'p1', status: 'DRAFT', title: 'Bloody Mary Mix' } },
    ]);

    await expect(addDraftItem('tab-1', ITEM_INPUT)).rejects.toBeInstanceOf(ProductNotPurchasableError);
    expect(mockDraftCartItemCreate).not.toHaveBeenCalled();
    expect(mockDraftCartItemUpdate).not.toHaveBeenCalled();
  });

  it('rejects an ARCHIVED product', async () => {
    mockProductVariantFindMany.mockResolvedValue([
      { id: 'v1', availableForSale: true, product: { id: 'p1', status: 'ARCHIVED', title: 'Old Vodka' } },
    ]);
    await expect(addDraftItem('tab-1', ITEM_INPUT)).rejects.toThrow(/no longer available/);
    expect(mockDraftCartItemCreate).not.toHaveBeenCalled();
  });

  it('rejects an ACTIVE product whose variant is no longer available for sale', async () => {
    mockProductVariantFindMany.mockResolvedValue([
      { id: 'v1', availableForSale: false, product: { id: 'p1', status: 'ACTIVE', title: 'Sold Out IPA' } },
    ]);
    await expect(addDraftItem('tab-1', ITEM_INPUT)).rejects.toBeInstanceOf(ProductNotPurchasableError);
    expect(mockDraftCartItemCreate).not.toHaveBeenCalled();
  });
});
