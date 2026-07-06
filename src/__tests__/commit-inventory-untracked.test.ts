/**
 * commitInventoryForOrderItem — untracked variants must not accumulate committed stock.
 *
 * Commit fires at payment; release only fires at fulfillment, and
 * fulfillVariantInventory skips trackInventory=false variants. If commit did NOT
 * apply the same skip, evergreen items (cocktail kits, mixers, fresh produce)
 * would build up phantom committed units forever and instantly block checkout
 * the moment trackInventory is flipped back on (the 2026-06-24 cocktail-kit
 * incident). These tests prove commit mirrors fulfillment's skip.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/database/client', () => ({
  prisma: {},
}));

import { commitInventoryForOrderItem } from '@/lib/inventory/services/order-service';

const mockVariantUpdate = vi.fn().mockResolvedValue({});
const mockMovementCreate = vi.fn().mockResolvedValue({});

/** Fake transaction client: one product, one variant, controllable trackInventory. */
function fakeTx(args: {
  isBundle?: boolean;
  bundleComponents?: { componentProductId: string; componentVariantId: string | null; quantity: number }[];
  variant: { id: string; committedQuantity: number; trackInventory: boolean } | null;
}): Parameters<typeof commitInventoryForOrderItem>[0] {
  return {
    product: {
      findUnique: vi.fn().mockResolvedValue({
        isBundle: args.isBundle ?? false,
        bundleComponents: args.bundleComponents ?? [],
      }),
    },
    productVariant: {
      findUnique: vi.fn().mockResolvedValue(args.variant),
      findFirst: vi.fn().mockResolvedValue(args.variant),
      update: mockVariantUpdate,
    },
    inventoryMovement: {
      create: mockMovementCreate,
    },
  } as unknown as Parameters<typeof commitInventoryForOrderItem>[0];
}

describe('commitInventoryForOrderItem — trackInventory guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('commits a tracked variant: increments committedQuantity and writes a COMMITTED movement', async () => {
    const tx = fakeTx({ variant: { id: 'v1', committedQuantity: 3, trackInventory: true } });

    await commitInventoryForOrderItem(tx, 'p1', 'v1', 2, 1001, 'order-1');

    expect(mockVariantUpdate).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { committedQuantity: { increment: 2 } },
    });
    expect(mockMovementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        variantId: 'v1',
        type: 'COMMITTED',
        quantity: 2,
        previousQuantity: 3,
        newQuantity: 5,
      }),
    });
  });

  it('skips an untracked variant entirely: no increment, no movement row', async () => {
    const tx = fakeTx({ variant: { id: 'v-evergreen', committedQuantity: 94, trackInventory: false } });

    await commitInventoryForOrderItem(tx, 'p1', 'v-evergreen', 5, 1002, 'order-2');

    expect(mockVariantUpdate).not.toHaveBeenCalled();
    expect(mockMovementCreate).not.toHaveBeenCalled();
  });

  it('skips untracked bundle components too (explicit componentVariantId branch)', async () => {
    const tx = fakeTx({
      isBundle: true,
      bundleComponents: [{ componentProductId: 'cp1', componentVariantId: 'cv1', quantity: 3 }],
      variant: { id: 'cv1', committedQuantity: 10, trackInventory: false },
    });

    await commitInventoryForOrderItem(tx, 'bundle-1', 'unused', 2, 1003, 'order-3');

    expect(mockVariantUpdate).not.toHaveBeenCalled();
    expect(mockMovementCreate).not.toHaveBeenCalled();
  });

  it('skips untracked bundle components resolved via findFirst (no componentVariantId)', async () => {
    const tx = fakeTx({
      isBundle: true,
      bundleComponents: [{ componentProductId: 'cp1', componentVariantId: null, quantity: 1 }],
      variant: { id: 'cv1', committedQuantity: 0, trackInventory: false },
    });

    await commitInventoryForOrderItem(tx, 'bundle-1', 'unused', 4, 1004, 'order-4');

    expect(mockVariantUpdate).not.toHaveBeenCalled();
    expect(mockMovementCreate).not.toHaveBeenCalled();
  });

  it('still commits tracked bundle components (multiplied by component quantity)', async () => {
    const tx = fakeTx({
      isBundle: true,
      bundleComponents: [{ componentProductId: 'cp1', componentVariantId: 'cv1', quantity: 3 }],
      variant: { id: 'cv1', committedQuantity: 1, trackInventory: true },
    });

    await commitInventoryForOrderItem(tx, 'bundle-1', 'unused', 2, 1005, 'order-5');

    expect(mockVariantUpdate).toHaveBeenCalledWith({
      where: { id: 'cv1' },
      data: { committedQuantity: { increment: 6 } },
    });
    expect(mockMovementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        variantId: 'cv1',
        type: 'COMMITTED',
        quantity: 6,
        previousQuantity: 1,
        newQuantity: 7,
      }),
    });
  });

  it('does nothing when the variant does not exist', async () => {
    const tx = fakeTx({ variant: null });

    await commitInventoryForOrderItem(tx, 'p1', 'v-missing', 1, 1006, 'order-6');

    expect(mockVariantUpdate).not.toHaveBeenCalled();
    expect(mockMovementCreate).not.toHaveBeenCalled();
  });
});
