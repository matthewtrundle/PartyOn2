/**
 * Admin Single Order API
 * GET /api/v1/admin/orders/[id] - Get order details
 * PUT /api/v1/admin/orders/[id] - Update order status
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { OrderStatus, FinancialStatus, FulfillmentStatus } from '@prisma/client';
import { linkOrderToAffiliate, voidCommissionForOrder } from '@/lib/affiliates/commission-engine';
import { fulfillInventoryForOrder } from '@/lib/inventory/services/order-service';
import { getStripeCapturedAmount } from '@/lib/stripe/refund-utils';
import { isBoatAddress } from '@/lib/ops/boat-address';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                handle: true,
                images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
              },
            },
            variant: {
              select: { id: true, title: true, sku: true },
            },
          },
        },
        affiliate: {
          select: {
            id: true,
            code: true,
            businessName: true,
            contactName: true,
            phone: true,
          },
        },
        amendments: {
          orderBy: { createdAt: 'desc' },
        },
        groupOrder: {
          select: {
            id: true,
            name: true,
            shareCode: true,
            status: true,
          },
        },
        groupOrderV2: {
          select: {
            id: true,
            name: true,
            shareCode: true,
            hostName: true,
          },
        },
        refunds: {
          select: { id: true, amount: true, createdAt: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Find previous and next orders sorted by delivery date ascending, then order number
    const [previousOrder, nextOrder] = await Promise.all([
      prisma.order.findFirst({
        where: {
          OR: [
            { deliveryDate: { lt: order.deliveryDate } },
            {
              deliveryDate: order.deliveryDate,
              orderNumber: { lt: order.orderNumber },
            },
          ],
        },
        orderBy: [{ deliveryDate: 'desc' }, { orderNumber: 'desc' }],
        select: { id: true },
      }),
      prisma.order.findFirst({
        where: {
          OR: [
            { deliveryDate: { gt: order.deliveryDate } },
            {
              deliveryDate: order.deliveryDate,
              orderNumber: { gt: order.orderNumber },
            },
          ],
        },
        orderBy: [{ deliveryDate: 'asc' }, { orderNumber: 'asc' }],
        select: { id: true },
      }),
    ]);

    // Parse delivery address
    const deliveryAddress = order.deliveryAddress as {
      address1?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };

    // Fetch bundle components for any bundle products in this order
    const productIds = order.items.map((item) => item.product.id);
    const bundleComponents = await prisma.bundleComponent.findMany({
      where: { bundleProductId: { in: productIds } },
      include: {
        componentProduct: { select: { title: true } },
        componentVariant: { select: { title: true } },
      },
    });

    // Group by bundle product ID
    const bundleMap = new Map<string, typeof bundleComponents>();
    for (const bc of bundleComponents) {
      const existing = bundleMap.get(bc.bundleProductId) || [];
      existing.push(bc);
      bundleMap.set(bc.bundleProductId, existing);
    }

    // Fetch sibling orders if this is a group order
    let siblingOrders: { id: string; orderNumber: string; customerName: string; total: number; status: string }[] = [];
    if (order.groupOrderId) {
      const siblings = await prisma.order.findMany({
        where: {
          groupOrderId: order.groupOrderId,
          id: { not: order.id }, // Exclude current order
        },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
          status: true,
        },
        orderBy: { orderNumber: 'asc' },
      });
      siblingOrders = siblings.map((s) => ({
        id: s.id,
        orderNumber: String(s.orderNumber),
        customerName: s.customerName || 'Guest',
        total: Number(s.total),
        status: String(s.status),
      }));
    }

    // Fetch V2 sibling orders (orders from the same Group Dashboard)
    let siblingOrdersV2: {
      id: string;
      orderNumber: string;
      customerName: string;
      total: number;
      status: string;
      fulfillmentStatus: string;
    }[] = [];
    if (order.groupOrderV2Id) {
      const siblingsV2 = await prisma.order.findMany({
        where: {
          groupOrderV2Id: order.groupOrderV2Id,
          id: { not: order.id },
        },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
          status: true,
          fulfillmentStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      siblingOrdersV2 = siblingsV2.map((s) => ({
        id: s.id,
        orderNumber: String(s.orderNumber),
        customerName: s.customerName || 'Guest',
        total: Number(s.total),
        status: String(s.status),
        fulfillmentStatus: String(s.fulfillmentStatus),
      }));
    }

    // Cruise type for the boat manifest. Shown ONLY when BOTH are true: the
    // delivery is going to the boat (marina address) AND the order is matched
    // on the boat manifest (DSC tab → disco, PVT → private). A guest booked on
    // a cruise another day whose THIS order ships elsewhere is not a cruise, so
    // there is deliberately no webhook-source fallback here. null = not a cruise.
    const goingToBoat = isBoatAddress(deliveryAddress.address1);
    const scheduleMatch = goingToBoat
      ? await prisma.scheduleOrderMatch.findFirst({
          where: { orderId: id, status: { in: ['matched', 'needs_review'] } },
          orderBy: { matchConfidence: 'desc' },
          select: { schedule: { select: { sheetTab: true, boat: true } } },
        })
      : null;
    const matchedTab = scheduleMatch?.schedule?.sheetTab?.toUpperCase() ?? '';
    let cruiseType: 'DISCO' | 'PRIVATE' | null = null;
    if (matchedTab.includes('DSC')) cruiseType = 'DISCO';
    else if (matchedTab.includes('PVT')) cruiseType = 'PRIVATE';
    const cruiseBoat = cruiseType ? scheduleMatch?.schedule?.boat ?? null : null;

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        financialStatus: order.financialStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        cruiseType,
        cruiseBoat,
        customer: {
          id: order.customer.id,
          email: order.customer.email,
          name: [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ') || order.customerEmail,
          phone: order.customer.phone,
        },
        customerSnapshot: {
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
        },
        items: order.items.map((item) => ({
          id: item.id,
          product: {
            id: item.product.id,
            title: item.product.title,
            handle: item.product.handle,
          },
          variant: item.variant ? {
            id: item.variant.id,
            title: item.variant.title,
            sku: item.variant.sku,
          } : null,
          title: item.title,
          variantTitle: item.variantTitle,
          sku: item.sku,
          quantity: item.quantity,
          refundedQuantity: item.refundedQuantity || 0,
          price: Number(item.price),
          total: Number(item.totalPrice),
          imageUrl: item.product.images[0]?.url || null,
          bundleComponents: (bundleMap.get(item.product.id) || []).map((bc) => ({
            title: bc.componentProduct.title,
            variantTitle: bc.componentVariant?.title || null,
            quantity: bc.quantity,
          })),
        })),
        pricing: {
          subtotal: Number(order.subtotal),
          discountCode: order.discountCode,
          discountAmount: Number(order.discountAmount),
          taxAmount: Number(order.taxAmount),
          deliveryFee: Number(order.deliveryFee),
          tipAmount: Number(order.tipAmount),
          total: Number(order.total),
        },
        delivery: {
          date: order.deliveryDate.toISOString(),
          time: order.deliveryTime,
          type: order.deliveryType,
          address: {
            address1: deliveryAddress.address1 || '',
            address2: deliveryAddress.address2 || '',
            city: deliveryAddress.city || '',
            state: deliveryAddress.state || '',
            zip: deliveryAddress.zip || '',
            country: deliveryAddress.country || 'US',
          },
          phone: order.deliveryPhone,
          instructions: order.deliveryInstructions,
        },
        payment: {
          stripePaymentIntentId: order.stripePaymentIntentId,
          stripeCheckoutSessionId: order.stripeCheckoutSessionId,
          stripeChargeId: order.stripeChargeId,
        },
        shopify: {
          orderId: order.shopifyOrderId,
          orderNumber: order.shopifyOrderNumber,
        },
        affiliate: order.affiliate ? {
          id: order.affiliate.id,
          code: order.affiliate.code,
          businessName: order.affiliate.businessName,
          contactName: order.affiliate.contactName,
          phone: order.affiliate.phone,
        } : null,
        groupOrder: {
          id: order.groupOrderId,
          isGroupOrder: !!order.groupOrderId,
          name: order.groupOrder?.name || null,
          shareCode: order.groupOrder?.shareCode || null,
          status: order.groupOrder?.status || null,
          siblingOrders,
        },
        groupOrderV2: order.groupOrderV2
          ? {
              id: order.groupOrderV2.id,
              isGroupOrder: true,
              name: order.groupOrderV2.name,
              shareCode: order.groupOrderV2.shareCode,
              hostName: order.groupOrderV2.hostName,
              siblingOrders: siblingOrdersV2,
            }
          : null,
        amendments: order.amendments.map((a) => ({
          id: a.id,
          type: a.type,
          changes: a.changes,
          previousTotal: Number(a.previousTotal),
          newTotal: Number(a.newTotal),
          amountDelta: Number(a.amountDelta),
          resolution: a.resolution,
          draftOrderId: a.draftOrderId,
          refundId: a.refundId,
          notes: a.notes,
          processedBy: a.processedBy,
          createdAt: a.createdAt.toISOString(),
          resolvedAt: a.resolvedAt?.toISOString() || null,
        })),
        notes: {
          customer: order.customerNote,
          internal: order.internalNote,
        },
        reviewRequestSentAt: order.reviewRequestSentAt?.toISOString() || null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        navigation: {
          previousOrderId: previousOrder?.id || null,
          nextOrderId: nextOrder?.id || null,
        },
        refunds: {
          totalRefunded: order.refunds.reduce((sum, r) => sum + Number(r.amount), 0),
          count: order.refunds.length,
          // Stripe-captured amount, not order.total — order.total gets rewritten by amendments.
          stripeCapturedAmount: order.stripePaymentIntentId
            ? await getStripeCapturedAmount(order.stripePaymentIntentId).catch(() => null)
            : null,
          // Per-refund rows so the client can net an amendment's refund prefill
          // against refunds recorded after the amendment was created. The id
          // lets the client skip refunds an amendment already claims.
          items: order.refunds.map((r) => ({
            id: r.id,
            amount: Number(r.amount),
            createdAt: r.createdAt.toISOString(),
          })),
        },
      },
    });
  } catch (error) {
    console.error('[Admin Order API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.order.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Update status fields
    if (body.status && Object.values(OrderStatus).includes(body.status)) {
      updateData.status = body.status;
    }
    if (body.financialStatus && Object.values(FinancialStatus).includes(body.financialStatus)) {
      updateData.financialStatus = body.financialStatus;
    }
    if (body.fulfillmentStatus && Object.values(FulfillmentStatus).includes(body.fulfillmentStatus)) {
      updateData.fulfillmentStatus = body.fulfillmentStatus;

      // Auto-update order status based on fulfillment
      if (body.fulfillmentStatus === 'DELIVERED') {
        updateData.status = 'DELIVERED';
      }
    }

    // Fulfill inventory when transitioning to DELIVERED
    if (body.fulfillmentStatus === 'DELIVERED' && existing.fulfillmentStatus !== 'DELIVERED') {
      try {
        await fulfillInventoryForOrder(id);
      } catch (err) {
        console.error(`[Admin Order API] Failed to fulfill inventory for order ${id}:`, err);
      }
    }

    // Update notes
    if (body.internalNote !== undefined) {
      updateData.internalNote = body.internalNote;
    }
    if (body.customerNote !== undefined) {
      updateData.customerNote = body.customerNote;
    }

    // Update customer info
    if (body.customerName !== undefined) {
      updateData.customerName = body.customerName;
    }

    // Update delivery details
    if (body.deliveryDate !== undefined) {
      const d = new Date(body.deliveryDate);
      d.setUTCHours(12, 0, 0, 0);
      updateData.deliveryDate = d;
    }
    if (body.deliveryTime !== undefined) {
      updateData.deliveryTime = body.deliveryTime;
    }
    if (body.deliveryPhone !== undefined) {
      updateData.deliveryPhone = body.deliveryPhone;
    }
    if (body.deliveryInstructions !== undefined) {
      updateData.deliveryInstructions = body.deliveryInstructions || null;
    }
    if (body.deliveryAddress !== undefined) {
      updateData.deliveryAddress = body.deliveryAddress;
    }

    // Link affiliate to order (manual attribution)
    if (body.linkAffiliateCode) {
      const commission = await linkOrderToAffiliate(
        {
          id: existing.id,
          subtotal: existing.subtotal,
          discountAmount: existing.discountAmount,
          customerEmail: existing.customerEmail,
        },
        body.linkAffiliateCode
      );
      if (!commission) {
        return NextResponse.json(
          { success: false, error: 'Affiliate code not found or inactive' },
          { status: 400 }
        );
      }
    }

    // Remove affiliate from order
    if (body.unlinkAffiliate) {
      await voidCommissionForOrder(existing.id, 'admin_removed');
      updateData.affiliateId = null;
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        affiliate: {
          select: { id: true, code: true, businessName: true, contactName: true, phone: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        financialStatus: order.financialStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        affiliate: order.affiliate ? {
          id: order.affiliate.id,
          code: order.affiliate.code,
          businessName: order.affiliate.businessName,
          contactName: order.affiliate.contactName,
          phone: order.affiliate.phone,
        } : null,
        updatedAt: order.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Admin Order API] Error updating:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
