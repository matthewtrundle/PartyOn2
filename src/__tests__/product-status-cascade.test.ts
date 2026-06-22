/**
 * Product status → variant availability cascade at the service layer.
 *
 * Proves that drafting or archiving a product (updateProduct / deleteProduct) takes its variants
 * off-sale in the SAME transaction — closing the leak where a non-ACTIVE product stayed
 * purchasable via a stale cart or a direct/shared product link.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock tx client the service runs inside $transaction.
const mockTxProductUpdate = vi.fn().mockResolvedValue({ id: 'prod-1', variants: [] });
const mockTxVariantUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
const mockTx = {
  product: { update: (...a: unknown[]) => mockTxProductUpdate(...a) },
  productVariant: { updateMany: (...a: unknown[]) => mockTxVariantUpdateMany(...a) },
};

vi.mock('@/lib/database/client', () => ({
  prisma: {
    // Run the callback with our mock tx so we can assert what the cascade did.
    $transaction: (cb: (tx: unknown) => unknown) => cb(mockTx),
  },
}));

import { updateProduct, deleteProduct } from '@/lib/inventory/services/product-service';

const OFF_SALE_CASCADE = {
  where: { productId: 'prod-1', availableForSale: true },
  data: { availableForSale: false },
};

describe('updateProduct status cascade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTxProductUpdate.mockResolvedValue({ id: 'prod-1', variants: [] });
    mockTxVariantUpdateMany.mockResolvedValue({ count: 2 });
  });

  it('flips variants off-sale when status is set to DRAFT', async () => {
    await updateProduct({ id: 'prod-1', status: 'DRAFT' });
    expect(mockTxVariantUpdateMany).toHaveBeenCalledWith(OFF_SALE_CASCADE);
  });

  it('flips variants off-sale when status is set to ARCHIVED', async () => {
    await updateProduct({ id: 'prod-1', status: 'ARCHIVED' });
    expect(mockTxVariantUpdateMany).toHaveBeenCalledWith(OFF_SALE_CASCADE);
  });

  it('does NOT touch variant availability when status is set to ACTIVE', async () => {
    await updateProduct({ id: 'prod-1', status: 'ACTIVE' });
    expect(mockTxVariantUpdateMany).not.toHaveBeenCalled();
  });

  it('does NOT touch variant availability when status is not part of the update', async () => {
    await updateProduct({ id: 'prod-1', title: 'New title' });
    expect(mockTxVariantUpdateMany).not.toHaveBeenCalled();
    expect(mockTxProductUpdate).toHaveBeenCalledOnce();
  });
});

describe('deleteProduct (soft delete / archive) cascade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTxProductUpdate.mockResolvedValue({ id: 'prod-1' });
    mockTxVariantUpdateMany.mockResolvedValue({ count: 2 });
  });

  it('archives the product AND flips its variants off-sale', async () => {
    await deleteProduct('prod-1');
    expect(mockTxProductUpdate).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { status: 'ARCHIVED' },
    });
    expect(mockTxVariantUpdateMany).toHaveBeenCalledWith(OFF_SALE_CASCADE);
  });
});
