/**
 * Admin Orders API
 * GET /api/v1/admin/orders - List all orders with search, filter, pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { getOrdersSummaryStats } from '@/lib/ops/orders-stats';
import { OrderStatus, FinancialStatus, FulfillmentStatus, DeliveryType, Prisma } from '@prisma/client';

interface OrderListParams {
  search?: string;
  status?: OrderStatus;
  financialStatus?: FinancialStatus;
  fulfillmentStatus?: FulfillmentStatus;
  deliveryType?: DeliveryType;
  groupType?: 'all' | 'regular' | 'group';
  groupOrderId?: string;
  groupOrderV2Id?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  reviewSent?: 'sent' | 'unsent';
  sortBy?: 'orderNumber' | 'createdAt' | 'total' | 'deliveryDate' | 'groupOrderV2Id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params: OrderListParams = {
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') as OrderStatus) || undefined,
      financialStatus: (searchParams.get('financialStatus') as FinancialStatus) || undefined,
      fulfillmentStatus: (searchParams.get('fulfillmentStatus') as FulfillmentStatus) || undefined,
      deliveryType: (searchParams.get('deliveryType') as DeliveryType) || undefined,
      groupType: (searchParams.get('groupType') as 'all' | 'regular' | 'group') || undefined,
      groupOrderId: searchParams.get('groupOrderId') || undefined,
      groupOrderV2Id: searchParams.get('groupOrderV2Id') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      reviewSent: (searchParams.get('reviewSent') as 'sent' | 'unsent') || undefined,
      sortBy: (searchParams.get('sortBy') as OrderListParams['sortBy']) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
    };

    // Build where clause
    const where: Prisma.OrderWhereInput = {};

    if (params.search) {
      const searchNum = parseInt(params.search);
      where.OR = [
        { customerEmail: { contains: params.search, mode: 'insensitive' } },
        { customerName: { contains: params.search, mode: 'insensitive' } },
        ...(isNaN(searchNum) ? [] : [{ orderNumber: searchNum }]),
      ];
    }

    if (params.status) where.status = params.status;
    if (params.financialStatus) where.financialStatus = params.financialStatus;
    if (params.fulfillmentStatus) where.fulfillmentStatus = params.fulfillmentStatus;
    if (params.deliveryType) where.deliveryType = params.deliveryType;
    if (params.customerId) where.customerId = params.customerId;

    // Review-request filter — "unsent" implies the order must already be DELIVERED
    // (the only orders eligible to receive a review request).
    if (params.reviewSent === 'unsent') {
      where.reviewRequestSentAt = null;
      where.fulfillmentStatus = FulfillmentStatus.DELIVERED;
    } else if (params.reviewSent === 'sent') {
      where.reviewRequestSentAt = { not: null };
    }

    // Group order filtering
    if (params.groupType === 'regular') {
      where.groupOrderId = null;
    } else if (params.groupType === 'group') {
      where.groupOrderId = { not: null };
    }
    if (params.groupOrderId) {
      where.groupOrderId = params.groupOrderId;
    }
    if (params.groupOrderV2Id) {
      where.groupOrderV2Id = params.groupOrderV2Id;
    }

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom);
      if (params.dateTo) where.createdAt.lte = new Date(params.dateTo);
    }

    // Build orderBy
    // "groupOrderV2Id" sort clusters sibling orders together
    const orderBy: Prisma.OrderOrderByWithRelationInput | Prisma.OrderOrderByWithRelationInput[] =
      params.sortBy === 'groupOrderV2Id'
        ? [
            { groupOrderV2Id: (params.sortOrder || 'asc') as 'asc' | 'desc' },
            { createdAt: 'asc' },
          ]
        : {
            [params.sortBy || 'createdAt']: params.sortOrder || 'desc',
          };

    // Get total count
    const total = await prisma.order.count({ where });

    // Get orders
    const orders = await prisma.order.findMany({
      where,
      orderBy,
      skip: ((params.page || 1) - 1) * (params.limit || 20),
      take: params.limit || 20,
      include: {
        customer: {
          select: { id: true, email: true, firstName: true, lastName: true, phone: true },
        },
        items: {
          include: {
            product: { select: { id: true, title: true } },
          },
        },
        groupOrder: {
          select: { id: true, shareCode: true, name: true, status: true },
        },
        groupOrderV2: {
          select: { id: true, shareCode: true, name: true, hostName: true },
        },
        affiliate: {
          select: { id: true, code: true, businessName: true, contactName: true, phone: true },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    // Fetch bundle components for all product IDs across all orders
    const allProductIds = orders.flatMap((o) => o.items.map((i) => i.product.id));
    const uniqueProductIds = [...new Set(allProductIds)];
    const allBundleComponents = uniqueProductIds.length > 0
      ? await prisma.bundleComponent.findMany({
          where: { bundleProductId: { in: uniqueProductIds } },
          include: {
            componentProduct: { select: { title: true } },
            componentVariant: { select: { title: true } },
          },
        })
      : [];

    const bundleMap = new Map<string, { title: string; variantTitle: string | null; quantity: number }[]>();
    for (const bc of allBundleComponents) {
      const existing = bundleMap.get(bc.bundleProductId) || [];
      existing.push({
        title: bc.componentProduct.title,
        variantTitle: bc.componentVariant?.title || null,
        quantity: bc.quantity,
      });
      bundleMap.set(bc.bundleProductId, existing);
    }

    // Transform orders
    const transformedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      financialStatus: order.financialStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      customer: {
        id: order.customer.id,
        email: order.customer.email,
        name: [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ') || order.customerEmail,
      },
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone || order.customer.phone || null,
      deliveryPhone: order.deliveryPhone || null,
      deliveryInstructions: order.deliveryInstructions || null,
      customerNote: order.customerNote || null,
      internalNote: order.internalNote || null,
      subtotal: Number(order.subtotal),
      discountCode: order.discountCode,
      discountAmount: Number(order.discountAmount),
      taxAmount: Number(order.taxAmount),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      itemCount: order._count.items,
      deliveryDate: order.deliveryDate.toISOString(),
      deliveryTime: order.deliveryTime,
      deliveryType: order.deliveryType,
      createdAt: order.createdAt.toISOString(),
      deliveryAddress: order.deliveryAddress as Record<string, string> | null,
      items: order.items.map(i => ({
        quantity: i.quantity,
        title: i.title || i.product.title,
        productId: i.product.id,
        bundleComponents: bundleMap.get(i.product.id) || [],
      })),
      // Group order info
      groupOrderId: order.groupOrderId,
      groupOrder: order.groupOrder ? {
        id: order.groupOrder.id,
        shareCode: order.groupOrder.shareCode,
        name: order.groupOrder.name,
        status: order.groupOrder.status,
      } : null,
      affiliate: order.affiliate ? {
        id: order.affiliate.id,
        code: order.affiliate.code,
        businessName: order.affiliate.businessName,
        contactName: order.affiliate.contactName,
        phone: order.affiliate.phone,
      } : null,
      dashboardSource: order.groupOrderV2
        ? {
            id: order.groupOrderV2.id,
            shareCode: order.groupOrderV2.shareCode,
            name: order.groupOrderV2.name,
            hostName: order.groupOrderV2.hostName,
          }
        : null,
      reviewRequestSentAt: order.reviewRequestSentAt?.toISOString() || null,
    }));

    // Get summary stats (shared with /api/ops/orders-view)
    const summary = await getOrdersSummaryStats();

    return NextResponse.json({
      success: true,
      data: {
        orders: transformedOrders,
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          total,
          pages: Math.ceil(total / (params.limit || 20)),
        },
        filters: {
          statuses: Object.values(OrderStatus),
          financialStatuses: Object.values(FinancialStatus),
          fulfillmentStatuses: Object.values(FulfillmentStatus),
          deliveryTypes: Object.values(DeliveryType),
        },
        summary,
      },
    });
  } catch (error) {
    console.error('[Admin Orders API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
