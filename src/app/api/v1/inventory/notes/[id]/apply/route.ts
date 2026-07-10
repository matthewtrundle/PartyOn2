import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adjustInventory } from '@/lib/inventory/services/inventory-service';
import { requireOpsAuth } from '@/lib/auth/ops-session';

interface ApplyAdjustment {
  productId: string;
  variantId?: string;
  quantity: number;
  action: 'add' | 'remove' | 'set';
}

/**
 * POST /api/v1/inventory/notes/[id]/apply
 * Apply confirmed adjustments from a parsed note.
 * Body: { adjustments: ApplyAdjustment[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { adjustments } = body as { adjustments: ApplyAdjustment[] };

    if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Adjustments array is required' },
        { status: 400 }
      );
    }

    // Load the note
    const note = await prisma.inventoryNote.findUnique({ where: { id } });
    if (!note) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }

    if (note.status === 'processed') {
      return NextResponse.json(
        { success: false, error: 'Note has already been processed' },
        { status: 400 }
      );
    }

    const results = [];

    for (const adj of adjustments) {
      // Convert action to quantity delta
      let quantity: number;
      if (adj.action === 'add') {
        quantity = Math.abs(adj.quantity);
      } else if (adj.action === 'remove') {
        quantity = -Math.abs(adj.quantity);
      } else {
        // 'set' - calculate delta from current ProductVariant.inventoryQuantity
        let currentQty = 0;
        if (adj.variantId) {
          const variant = await prisma.productVariant.findUnique({
            where: { id: adj.variantId },
            select: { inventoryQuantity: true },
          });
          currentQty = variant?.inventoryQuantity ?? 0;
        } else {
          const variant = await prisma.productVariant.findFirst({
            where: { productId: adj.productId },
            select: { inventoryQuantity: true },
          });
          currentQty = variant?.inventoryQuantity ?? 0;
        }
        quantity = adj.quantity - currentQty;
      }

      const result = await adjustInventory({
        productId: adj.productId,
        variantId: adj.variantId,
        quantity,
        reason: `Inventory note: ${note.content.substring(0, 100)}`,
        type: 'ADJUSTMENT',
      });

      results.push({
        productId: adj.productId,
        variantId: adj.variantId,
        previousQuantity: result.previousQuantity,
        newQuantity: result.newQuantity,
      });
    }

    // Mark note as processed
    await prisma.inventoryNote.update({
      where: { id },
      data: { status: 'processed' },
    });

    return NextResponse.json({
      success: true,
      data: { noteId: id, results },
    });
  } catch (error) {
    console.error('Failed to apply inventory note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply adjustments' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/inventory/notes/[id]/apply
 * Dismiss a note without applying (mark as dismissed)
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    const note = await prisma.inventoryNote.findUnique({ where: { id } });
    if (!note) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }

    await prisma.inventoryNote.update({
      where: { id },
      data: { status: 'dismissed' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to dismiss inventory note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to dismiss note' },
      { status: 500 }
    );
  }
}
