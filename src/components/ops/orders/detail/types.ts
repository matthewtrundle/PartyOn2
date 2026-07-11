/**
 * Types for the order detail page (/ops/orders/[id]) and its extracted
 * view cards. Shapes mirror the GET /api/v1/admin/orders/[id] payload.
 */

export interface OrderItem {
  id: string;
  product: { id: string; title: string; handle: string };
  variant: { id: string; title: string; sku: string } | null;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  refundedQuantity: number;
  price: number;
  total: number;
  imageUrl?: string | null;
  bundleComponents?: { title: string; variantTitle: string | null; quantity: number }[];
}

export interface Amendment {
  id: string;
  type: string;
  changes: {
    added: { title: string; quantity: number; price: number }[];
    removed: { title: string; quantity: number; price: number }[];
    modified: { title: string; oldQuantity: number; newQuantity: number; price: number }[];
    deliveryFeeChange: { from: number; to: number } | null;
  };
  previousTotal: number;
  newTotal: number;
  amountDelta: number;
  resolution: string;
  draftOrderId: string | null;
  refundId: string | null;
  notes: string | null;
  processedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  financialStatus: string;
  fulfillmentStatus: string;
  cruiseType: 'DISCO' | 'PRIVATE' | null;
  cruiseBoat: string | null;
  customer: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
  };
  customerSnapshot: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  items: OrderItem[];
  pricing: {
    subtotal: number;
    discountCode: string | null;
    discountAmount: number;
    taxAmount: number;
    deliveryFee: number;
    tipAmount: number;
    total: number;
  };
  delivery: {
    date: string;
    time: string;
    type: string;
    address: {
      address1: string;
      address2: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
    phone: string | null;
    instructions: string | null;
  };
  payment: {
    stripePaymentIntentId: string | null;
    stripeCheckoutSessionId: string | null;
    stripeChargeId: string | null;
  };
  shopify: {
    orderId: string | null;
    orderNumber: string | null;
  };
  groupOrder: {
    id: string | null;
    isGroupOrder: boolean;
    name: string | null;
    shareCode: string | null;
    status: string | null;
    siblingOrders: {
      id: string;
      orderNumber: string;
      customerName: string;
      total: number;
      status: string;
    }[];
  };
  groupOrderV2: {
    id: string;
    isGroupOrder: boolean;
    name: string;
    shareCode: string;
    hostName: string;
    siblingOrders: {
      id: string;
      orderNumber: string;
      customerName: string;
      total: number;
      status: string;
      fulfillmentStatus: string;
    }[];
  } | null;
  affiliate: {
    id: string;
    code: string;
    businessName: string;
    contactName: string;
    phone: string | null;
  } | null;
  amendments: Amendment[];
  notes: {
    customer: string | null;
    internal: string | null;
  };
  createdAt: string;
  updatedAt: string;
  navigation: {
    previousOrderId: string | null;
    nextOrderId: string | null;
  };
  reviewRequestSentAt: string | null;
  refunds: {
    totalRefunded: number;
    count: number;
    stripeCapturedAmount: number | null;
    items: { amount: number; createdAt: string }[];
  };
}
