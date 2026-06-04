/**
 * Reconcile pack → inventory for a single order.
 *
 * Surfaced by drift signal #2 (`pick-inventory-lag`) when an order has packed
 * pick-state rows but no matching pack-flavored `InventoryMovement`. The
 * Operations Director rec card's "Reconcile pick → inventory" button calls
 * this through the unified [id]/execute dispatcher.
 *
 * **Idempotent.** For each packed `OrderItemPickState` row we ask: has the
 * decrement already been written? (i.e. is there an `InventoryMovement` with
 * `referenceId = orderId`, the same `variantId`, and a pack-flavored
 * `reason`?). If yes, skip. If no, run the same
 * `applyPickInventoryTransition` path the picker UI uses, with `prev =
 * { packed:false, shortBy:0 }` so it computes the full forward delta.
 *
 * Re-running on a fully reconciled order returns `{ reconciled: 0 }` with no
 * inventory change.
 */

import { prisma } from '@/lib/database/client';
import {
  applyPickInventoryTransition,
  resolvePickInventoryTarget,
} from '@/lib/inventory/services/pick-inventory-service';

const PACK_REASONS = ['pack', 'pack-short-adjust'] as const;

export interface ReconcilePackResult {
  orderId: string;
  packedLines: number;
  alreadyReconciled: number;
  reconciled: number;
  skipped: Array<{ itemKey: string; reason: string }>;
}

export async function reconcilePackForOrder(orderId: string): Promise<ReconcilePackResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const picks = await tx.orderItemPickState.findMany({
      where: { orderId, packed: true },
      select: { itemKey: true, shortBy: true },
    });

    let reconciled = 0;
    let alreadyReconciled = 0;
    const skipped: Array<{ itemKey: string; reason: string }> = [];

    for (const pick of picks) {
      const target = await resolvePickInventoryTarget(tx, orderId, pick.itemKey);
      if (!target || !target.trackInventory) {
        skipped.push({ itemKey: pick.itemKey, reason: target ? 'untracked-variant' : 'no-target' });
        continue;
      }

      const existing = await tx.inventoryMovement.findFirst({
        where: {
          referenceId: orderId,
          variantId: target.variantId,
          reason: { in: PACK_REASONS as unknown as string[] },
        },
        select: { id: true },
      });
      if (existing) {
        alreadyReconciled += 1;
        continue;
      }

      await applyPickInventoryTransition(tx, {
        orderId,
        itemKey: pick.itemKey,
        prev: { packed: false, shortBy: 0 },
        next: { packed: true, shortBy: pick.shortBy },
      });
      reconciled += 1;
    }

    return {
      orderId,
      packedLines: picks.length,
      alreadyReconciled,
      reconciled,
      skipped,
    };
  });
}

