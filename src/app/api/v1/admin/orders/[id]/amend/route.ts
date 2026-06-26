/**
 * Order Amendment API
 * POST /api/v1/admin/orders/[id]/amend
 * Preview or confirm amendments to a paid order
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { Prisma } from '@prisma/client';
import { createDraftOrder } from '@/lib/draft-orders';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface AmendedItem {
  productId: string;
  variantId: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  isNew?: boolean;
  isCustom?: boolean;
}

interface AmendRequest {
  action: 'preview' | 'confirm';
  items: AmendedItem[];
  deliveryFee: number;
  notes?: string;
}

const TAX_RATE = 0.0825;

function computeAmounts(items: AmendedItem[], deliveryFee: number, discountAmount: number) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * TAX_RATE * 100) / 100;
  const total = taxableAmount + taxAmount + deliveryFee;
  return { subtotal, taxAmount, total };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body: AmendRequest = await request.json();
    const { action, items, deliveryFee, notes } = body;

    if (!action || !items || deliveryFee === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: action, items, deliveryFee' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, title: true } },
            variant: { select: { id: true, title: true, sku: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      return NextResponse.json(
        { success: false, error: 'Cannot amend a cancelled or refunded order' },
        { status: 400 }
      );
    }

    // Check for unpaid amendment invoices
    const unpaidAmendments = await prisma.orderAmendment.findMany({
      where: {
        orderId: id,
        resolution: { in: ['PENDING', 'INVOICE_SENT'] },
        amountDelta: { gt: 0 },
      },
    });

    if (unpaidAmendments.length > 0 && action === 'confirm') {
      return NextResponse.json({
        success: false,
        error: 'There is an unpaid amendment invoice for this order. Please resolve it before creating another.',
        unpaidAmendmentId: unpaidAmendments[0].id,
      }, { status: 400 });
    }

    const discountAmount = Number(order.discountAmount);
    const oldDeliveryFee = Number(order.deliveryFee);
    const oldSubtotal = Number(order.subtotal);
    const oldTaxAmount = Number(order.taxAmount);
    const oldTipAmount = Number(order.tipAmount);
    // Exclude tip from oldTotal so the delta comparison is apples-to-apples
    // (computeAmounts does not include tip in newTotal)
    const oldTotal = Number(order.total) - oldTipAmount;

    // Build diff
    const originalItemMap = new Map(
      order.items.map(item => [
        `${item.productId}-${item.variantId}`,
        {
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          title: item.title,
          variantTitle: item.variantTitle,
          quantity: item.quantity,
          price: Number(item.price),
          fulfilledQuantity: item.fulfilledQuantity,
        },
      ])
    );

    const newItemMap = new Map(
      items.map(item => [
        `${item.productId}-${item.variantId}`,
        item,
      ])
    );

    const added: AmendedItem[] = [];
    const removed: { productId: string; variantId: string; title: string; variantTitle?: string; quantity: number; price: number; fulfilledQuantity: number }[] = [];
    const modified: { productId: string; variantId: string; title: string; oldQuantity: number; newQuantity: number; price: number }[] = [];

    // Find added and modified
    for (const [key, newItem] of newItemMap) {
      const original = originalItemMap.get(key);
      if (!original) {
        added.push(newItem);
      } else if (original.quantity !== newItem.quantity) {
        modified.push({
          productId: newItem.productId,
          variantId: newItem.variantId,
          title: newItem.title,
          oldQuantity: original.quantity,
          newQuantity: newItem.quantity,
          price: newItem.price,
        });
      }
    }

    // Find removed
    for (const [key, original] of originalItemMap) {
      if (!newItemMap.has(key)) {
        removed.push({
          productId: original.productId,
          variantId: original.variantId,
          title: original.title,
          variantTitle: original.variantTitle || undefined,
          quantity: original.quantity,
          price: original.price,
          fulfilledQuantity: original.fulfilledQuantity,
        });
      }
    }

    const deliveryFeeChanged = deliveryFee !== oldDeliveryFee;

    // Determine amendment type
    let amendmentType: 'ITEMS_ADDED' | 'ITEMS_REMOVED' | 'DELIVERY_FEE_CHANGED' | 'MIXED';
    const hasItemChanges = added.length > 0 || removed.length > 0 || modified.length > 0;
    if (hasItemChanges && deliveryFeeChanged) {
      amendmentType = 'MIXED';
    } else if (added.length > 0 && removed.length === 0 && modified.length === 0) {
      amendmentType = 'ITEMS_ADDED';
    } else if (removed.length > 0 && added.length === 0) {
      amendmentType = 'ITEMS_REMOVED';
    } else if (deliveryFeeChanged && !hasItemChanges) {
      amendmentType = 'DELIVERY_FEE_CHANGED';
    } else {
      amendmentType = 'MIXED';
    }

    // Calculate new amounts
    const { subtotal: newSubtotal, taxAmount: newTaxAmount, total: newTotal } = computeAmounts(items, deliveryFee, discountAmount);
    const amountDelta = Math.round((newTotal - oldTotal) * 100) / 100;

    const changes = {
      added,
      removed,
      modified,
      deliveryFeeChange: deliveryFeeChanged ? { from: oldDeliveryFee, to: deliveryFee } : null,
    };

    const preview = {
      previousTotal: oldTotal + oldTipAmount,
      newTotal: newTotal + oldTipAmount,
      amountDelta,
      previousSubtotal: oldSubtotal,
      newSubtotal,
      previousTax: oldTaxAmount,
      newTax: newTaxAmount,
      previousDeliveryFee: oldDeliveryFee,
      newDeliveryFee: deliveryFee,
      tipAmount: oldTipAmount,
      discountAmount,
      changes,
      amendmentType,
      warnings: [] as string[],
    };

    // Add warnings
    for (const item of removed) {
      if (item.fulfilledQuantity > 0) {
        preview.warnings.push(`"${item.title}" has ${item.fulfilledQuantity} fulfilled unit(s). Removing it will not undo fulfillment.`);
      }
    }

    if (action === 'preview') {
      return NextResponse.json({ success: true, data: preview });
    }

    // === CONFIRM: Apply changes ===

    await prisma.$transaction(async (tx) => {
      // 1. Delete removed items
      for (const item of removed) {
        const original = order.items.find(
          i => i.productId === item.productId && i.variantId === item.variantId
        );
        if (original) {
          await tx.orderItem.delete({ where: { id: original.id } });
        }
      }

      // 2. Update modified items
      for (const item of modified) {
        const original = order.items.find(
          i => i.productId === item.productId && i.variantId === item.variantId
        );
        if (original) {
          await tx.orderItem.update({
            where: { id: original.id },
            data: {
              quantity: item.newQuantity,
              totalPrice: new Prisma.Decimal(item.price * item.newQuantity),
            },
          });
        }
      }

      // 3. Create new items
      for (const item of added) {
        await tx.orderItem.create({
          data: {
            orderId: id,
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            variantTitle: item.variantTitle || null,
            price: new Prisma.Decimal(item.price),
            quantity: item.quantity,
            totalPrice: new Prisma.Decimal(item.price * item.quantity),
          },
        });
      }

      // 4. Update order totals (preserve tip in the stored total)
      await tx.order.update({
        where: { id },
        data: {
          subtotal: new Prisma.Decimal(newSubtotal),
          taxAmount: new Prisma.Decimal(newTaxAmount),
          deliveryFee: new Prisma.Decimal(deliveryFee),
          total: new Prisma.Decimal(newTotal + oldTipAmount),
        },
      });
    });

    // 5. Create OrderAmendment record
    let resolution: 'PENDING' | 'WAIVED' = 'PENDING';
    let draftOrderId: string | null = null;

    if (amountDelta === 0) {
      resolution = 'WAIVED';
    } else if (amountDelta > 0) {
      // Create amendment invoice (DraftOrder) for the delta
      const deliveryAddress = order.deliveryAddress as {
        address1?: string;
        city?: string;
        state?: string;
        zip?: string;
      };

      const draftItems = added.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        title: item.title,
        variantTitle: item.variantTitle,
        quantity: item.quantity,
        price: item.price,
        imageUrl: item.imageUrl,
      }));

      // For modified items with increased quantity, add the delta
      for (const item of modified) {
        if (item.newQuantity > item.oldQuantity) {
          draftItems.push({
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            variantTitle: undefined,
            quantity: item.newQuantity - item.oldQuantity,
            price: item.price,
            imageUrl: undefined,
          });
        }
      }

      // Calculate the amendment invoice amounts
      const amendmentSubtotal = draftItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const deliveryFeeDelta = deliveryFeeChanged ? Math.max(0, deliveryFee - oldDeliveryFee) : 0;
      const amendmentTax = Math.round(amendmentSubtotal * TAX_RATE * 100) / 100;

      const draftOrder = await createDraftOrder({
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        customerPhone: order.customerPhone || undefined,
        deliveryAddress: deliveryAddress.address1 || '',
        deliveryCity: deliveryAddress.city || 'Austin',
        deliveryState: deliveryAddress.state || 'TX',
        deliveryZip: deliveryAddress.zip || '',
        deliveryDate: order.deliveryDate,
        deliveryTime: order.deliveryTime,
        deliveryNotes: order.deliveryInstructions || undefined,
        items: draftItems,
        subtotal: amendmentSubtotal,
        taxAmount: amendmentTax,
        deliveryFee: deliveryFeeDelta,
        createdBy: 'admin',
        adminNotes: `Amendment invoice for order #${order.orderNumber}. ${notes || ''}`.trim(),
      });

      // Set amendmentForOrderId on the draft order
      await prisma.draftOrder.update({
        where: { id: draftOrder.id },
        data: { amendmentForOrderId: id },
      });

      draftOrderId = draftOrder.id;
    }

    const amendment = await prisma.orderAmendment.create({
      data: {
        orderId: id,
        type: amendmentType,
        changes: changes as unknown as Prisma.InputJsonValue,
        previousTotal: new Prisma.Decimal(oldTotal + oldTipAmount),
        newTotal: new Prisma.Decimal(newTotal + oldTipAmount),
        amountDelta: new Prisma.Decimal(amountDelta),
        resolution,
        draftOrderId,
        notes,
        processedBy: 'admin',
        resolvedAt: resolution === 'WAIVED' ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        amendment: {
          id: amendment.id,
          type: amendment.type,
          amountDelta,
          resolution: amendment.resolution,
          draftOrderId: amendment.draftOrderId,
        },
        preview,
      },
    });
  } catch (error) {
    console.error('[Amend Order API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process amendment' },
      { status: 500 }
    );
  }
}
