import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  order: { findUnique: vi.fn() },
  orderItemPickState: { findMany: vi.fn() },
  inventoryMovement: { findFirst: vi.fn(), create: vi.fn() },
  productVariant: { findUnique: vi.fn(), update: vi.fn() },
  orderItem: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));

import { reconcilePackForOrder } from '../reconcile-pack';

function orderItemRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'oi_1',
    title: 'Tito Vodka 750ml',
    variantId: 'v_tito',
    quantity: 6,
    product: { title: 'Tito Vodka', isBundle: false, bundleComponents: [] },
    ...over,
  };
}

beforeEach(() => {
  Object.values(prismaMock).forEach((m) => {
    if (typeof m === 'object') {
      Object.values(m).forEach((fn) => {
        if (typeof fn === 'function' && 'mockReset' in fn) (fn as { mockReset: () => void }).mockReset();
      });
    } else if (typeof m === 'function' && 'mockReset' in m) {
      (m as { mockReset: () => void }).mockReset();
    }
  });
  prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => Promise<unknown>) =>
    cb(prismaMock)
  );
});

describe('reconcilePackForOrder', () => {
  it('throws when the order does not exist', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    await expect(reconcilePackForOrder('missing')).rejects.toThrow(/not found/);
  });

  it('returns 0 reconciled when no pick rows are packed', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: 'o1' });
    prismaMock.orderItemPickState.findMany.mockResolvedValue([]);
    const result = await reconcilePackForOrder('o1');
    expect(result).toEqual({ orderId: 'o1', packedLines: 0, alreadyReconciled: 0, reconciled: 0, skipped: [] });
  });

  it('skips a pick row when a pack-flavored movement already exists', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: 'o1' });
    prismaMock.orderItemPickState.findMany.mockResolvedValue([
      { itemKey: 'Tito Vodka 750ml', shortBy: 0 },
    ]);
    prismaMock.orderItem.findMany.mockResolvedValue([orderItemRow()]);
    prismaMock.productVariant.findUnique.mockResolvedValue({ trackInventory: true });
    prismaMock.inventoryMovement.findFirst.mockResolvedValue({ id: 'mv_existing' });

    const result = await reconcilePackForOrder('o1');
    expect(result.alreadyReconciled).toBe(1);
    expect(result.reconciled).toBe(0);
    expect(prismaMock.inventoryMovement.create).not.toHaveBeenCalled();
    expect(prismaMock.productVariant.update).not.toHaveBeenCalled();
  });

  it('writes the decrement + audit movement when no pack movement exists', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: 'o1' });
    prismaMock.orderItemPickState.findMany.mockResolvedValue([
      { itemKey: 'Tito Vodka 750ml', shortBy: 0 },
    ]);
    prismaMock.orderItem.findMany.mockResolvedValue([orderItemRow()]);
    // productVariant.findUnique is called 3 times in this path:
    //   1. reconcile-pack's own resolver lookup → trackInventory
    //   2. applyPickInventoryTransition's internal resolver → trackInventory
    //   3. applyPickInventoryTransition's variant-inventory read → quantities
    prismaMock.productVariant.findUnique
      .mockResolvedValueOnce({ trackInventory: true })
      .mockResolvedValueOnce({ trackInventory: true })
      .mockResolvedValueOnce({ id: 'v_tito', inventoryQuantity: 30, committedQuantity: 12 });
    prismaMock.inventoryMovement.findFirst.mockResolvedValue(null);
    prismaMock.productVariant.update.mockResolvedValue({});
    prismaMock.inventoryMovement.create.mockResolvedValue({ id: 'mv_new' });

    const result = await reconcilePackForOrder('o1');
    expect(result.reconciled).toBe(1);
    expect(result.alreadyReconciled).toBe(0);
    expect(prismaMock.productVariant.update).toHaveBeenCalled();
    expect(prismaMock.inventoryMovement.create).toHaveBeenCalled();
    const created = prismaMock.inventoryMovement.create.mock.calls[0][0] as { data: { reason: string; quantity: number; referenceId: string } };
    expect(created.data.reason).toBe('pack');
    expect(created.data.referenceId).toBe('o1');
    expect(created.data.quantity).toBe(-6);
  });

  it('is idempotent — a follow-up call with the same orderId is a no-op', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: 'o1' });
    prismaMock.orderItemPickState.findMany.mockResolvedValue([
      { itemKey: 'Tito Vodka 750ml', shortBy: 0 },
    ]);
    prismaMock.orderItem.findMany.mockResolvedValue([orderItemRow()]);
    prismaMock.productVariant.findUnique.mockResolvedValue({ trackInventory: true });
    // First call: no existing movement → reconcile runs.
    // Second call: movement now exists → skip.
    prismaMock.inventoryMovement.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'mv_existing' });
    // findUnique sequence: (1) first call's reconcile resolver, (2) first
    // call's applier resolver, (3) first call's variant inventory read,
    // (4) second call's reconcile resolver.
    prismaMock.productVariant.findUnique
      .mockResolvedValueOnce({ trackInventory: true })
      .mockResolvedValueOnce({ trackInventory: true })
      .mockResolvedValueOnce({ id: 'v_tito', inventoryQuantity: 30, committedQuantity: 12 })
      .mockResolvedValueOnce({ trackInventory: true });

    const first = await reconcilePackForOrder('o1');
    expect(first.reconciled).toBe(1);
    prismaMock.inventoryMovement.create.mockClear();
    prismaMock.productVariant.update.mockClear();

    const second = await reconcilePackForOrder('o1');
    expect(second.alreadyReconciled).toBe(1);
    expect(second.reconciled).toBe(0);
    expect(prismaMock.inventoryMovement.create).not.toHaveBeenCalled();
    expect(prismaMock.productVariant.update).not.toHaveBeenCalled();
  });

  it('records skipped rows when the variant is untracked', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: 'o1' });
    prismaMock.orderItemPickState.findMany.mockResolvedValue([
      { itemKey: 'Custom item', shortBy: 0 },
    ]);
    prismaMock.orderItem.findMany.mockResolvedValue([orderItemRow({ title: 'Custom item' })]);
    prismaMock.productVariant.findUnique.mockResolvedValue({ trackInventory: false });

    const result = await reconcilePackForOrder('o1');
    expect(result.reconciled).toBe(0);
    expect(result.skipped).toEqual([{ itemKey: 'Custom item', reason: 'untracked-variant' }]);
  });
});
