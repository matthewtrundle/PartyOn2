/**
 * Admin Orders API
 * Fetches recent orders from Shopify for the staff portal
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';

export const dynamic = 'force-dynamic';

const SHOPIFY_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;

interface ShopifyLineItem {
  title: string;
  quantity: number;
  price: string;
}

interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  fulfillment_status: string | null;
  financial_status: string;
  total_price: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  } | null;
  shipping_address: {
    address1: string;
    address2: string | null;
    city: string;
    province: string;
    zip: string;
    phone: string | null;
  } | null;
  line_items: ShopifyLineItem[];
  note: string | null;
  note_attributes: Array<{ name: string; value: string }>;
  tags: string;
}

export interface OrderForDisplay {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  fulfillmentStatus: string;
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryTime: string;
  items: Array<{ title: string; quantity: number }>;
  notes: string;
  internalStatus?: string;
}

/**
 * GET /api/admin/orders
 * Fetches recent orders from Shopify
 */
export async function GET(request: NextRequest) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  if (!SHOPIFY_DOMAIN || !SHOPIFY_ADMIN_TOKEN) {
    return NextResponse.json(
      { success: false, error: 'Shopify not configured' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get('limit') || '50';
  const status = searchParams.get('status') || 'any';

  try {
    const url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders.json?status=${status}&limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    const orders: ShopifyOrder[] = data.orders || [];

    // Transform orders for display
    const ordersForDisplay: OrderForDisplay[] = orders.map((order) => {
      // Extract delivery info from note_attributes
      const noteAttributes = order.note_attributes || [];
      const deliveryDate = noteAttributes.find(
        (attr) => attr.name === 'Delivery Date'
      )?.value || '';
      const deliveryTime = noteAttributes.find(
        (attr) => attr.name === 'Delivery Time'
      )?.value || '';

      // Format address
      const addr = order.shipping_address;
      const deliveryAddress = addr
        ? `${addr.address1}${addr.address2 ? ', ' + addr.address2 : ''}, ${addr.city}, ${addr.province} ${addr.zip}`
        : 'No address';

      // Get customer info
      const customer = order.customer;
      const customerName = customer
        ? `${customer.first_name} ${customer.last_name}`.trim()
        : 'Guest';
      const customerPhone = customer?.phone || addr?.phone || '';

      return {
        id: String(order.id),
        orderNumber: order.name,
        createdAt: order.created_at,
        status: order.financial_status,
        fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
        total: parseFloat(order.total_price),
        customerName,
        customerEmail: customer?.email || '',
        customerPhone,
        deliveryAddress,
        deliveryDate,
        deliveryTime,
        items: order.line_items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
        })),
        notes: order.note || '',
      };
    });

    return NextResponse.json({
      success: true,
      orders: ordersForDisplay,
    });
  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
      },
      { status: 500 }
    );
  }
}
