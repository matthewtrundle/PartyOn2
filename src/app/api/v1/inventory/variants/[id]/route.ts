/**
 * PATCH /api/v1/inventory/variants/[id]
 * Inline edits from the inventory page.
 *   { quantity: number }     → set absolute on-hand stock (writes inventoryQuantity, creates audit movement)
 *   { committed: number }    → set committed/allocated qty directly (writes committedQuantity, no audit trail)
 *   { available: number }    → set available; resolved to inventoryQuantity = available + committed (audit'd)
 *   { costPerUnit: number }  → set per-selling-unit cost on the variant
 * Any combination may be provided. Conflicting quantity inputs are resolved in this order:
 * `quantity` > `available` > (committed-only). Only one stock-related write happens per call.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { adjustInventory } from '@/lib/inventory/services/inventory-service';
import { requireOpsAuth } from '@/lib/auth/ops-session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  let body: {
    quantity?: number | null;
    committed?: number | null;
    available?: number | null;
    costPerUnit?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id },
    select: {
      id: true,
      productId: true,
      inventoryQuantity: true,
      committedQuantity: true,
      costPerUnit: true,
    },
  });
  if (!variant) {
    return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 });
  }

  // Apply committed first so the available→quantity translation uses the new committed.
  let nextCommitted = variant.committedQuantity;
  if (body.committed !== undefined && body.committed !== null) {
    nextCommitted = Math.max(0, Math.floor(Number(body.committed)));
    if (nextCommitted !== variant.committedQuantity) {
      await prisma.productVariant.update({
        where: { id },
        data: { committedQuantity: nextCommitted },
      });
    }
  }

  // Resolve target inventoryQuantity (precedence: explicit quantity > available + committed)
  let targetQuantity: number | null = null;
  if (body.quantity !== undefined && body.quantity !== null) {
    targetQuantity = Math.max(0, Math.floor(Number(body.quantity)));
  } else if (body.available !== undefined && body.available !== null) {
    targetQuantity = Math.max(0, Math.floor(Number(body.available)) + nextCommitted);
  }

  if (targetQuantity !== null) {
    const delta = targetQuantity - variant.inventoryQuantity;
    if (delta !== 0) {
      await adjustInventory({
        productId: variant.productId,
        variantId: variant.id,
        quantity: delta,
        reason: 'Manual edit from inventory page',
        type: 'ADJUSTMENT',
      });
    }
  }

  if (body.costPerUnit !== undefined) {
    if (body.costPerUnit === null || Number.isNaN(Number(body.costPerUnit))) {
      await prisma.productVariant.update({
        where: { id },
        data: { costPerUnit: null },
      });
    } else {
      const cost = Math.max(0, Number(body.costPerUnit));
      await prisma.productVariant.update({
        where: { id },
        data: { costPerUnit: new Prisma.Decimal(cost) },
      });
    }
  }

  return NextResponse.json({ success: true });
}
