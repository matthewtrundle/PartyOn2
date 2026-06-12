/**
 * Shared types for the ops Orders page and its extracted components.
 *
 * `Order` mirrors the per-order shape returned by GET /api/v1/admin/orders.
 * Keep in sync with src/app/api/v1/admin/orders/route.ts serialization.
 */

export interface OrderCustomer {
  id: string;
  email: string;
  name: string;
}

export interface GroupOrderInfo {
  id: string;
  shareCode: string;
  name: string;
  status: string;
}

export interface OrderItemBundleComponent {
  title: string;
  variantTitle: string | null;
  quantity: number;
}

export interface OrderLineItem {
  quantity: number;
  title: string;
  productId?: string;
  bundleComponents?: OrderItemBundleComponent[];
}

export interface Order {
  id: string;
  orderNumber: number;
  status: string;
  financialStatus: string;
  fulfillmentStatus: string;
  customer: OrderCustomer;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  deliveryPhone: string | null;
  deliveryInstructions: string | null;
  customerNote: string | null;
  internalNote: string | null;
  subtotal: number;
  discountCode: string | null;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
  deliveryDate: string;
  deliveryTime: string;
  deliveryType: string;
  createdAt: string;
  groupOrderId: string | null;
  groupOrder: GroupOrderInfo | null;
  affiliate: { id: string; code: string; businessName: string; contactName: string; phone: string | null } | null;
  dashboardSource: { id: string; shareCode: string; name: string; hostName: string } | null;
  deliveryAddress: Record<string, string> | string | null;
  items: OrderLineItem[];
  reviewRequestSentAt: string | null;
}

export interface OrdersData {
  orders: Order[];
  pagination: { page: number; limit: number; total: number; pages: number };
  filters: {
    statuses: string[];
    financialStatuses: string[];
    fulfillmentStatuses: string[];
    deliveryTypes: string[];
  };
  summary: {
    total: number;
    /** Sum of paid, non-cancelled order totals over the last 30 calendar days. */
    last30Revenue: number;
    /** Same metric for the 30 days before that — used to compute the % delta. */
    prior30Revenue: number;
    /** Percent change vs prior 30 days. `null` means no comparable baseline (first month w/ revenue). */
    revenueChangePct: number | null;
    /** Count of paid orders in the last 30 days. */
    last30Orders: number;
    todayOrders: number;
    todayRevenue: number;
    pendingFulfillment: number;
  };
}

/**
 * Per-item pick/pack state. Keys are the order item title, or
 * `${itemTitle}::${bundleComponentTitle}` for bundle components.
 * DO NOT change key construction — keys are persisted server-side
 * (OrderItemPickState) and drive inventory transitions.
 */
export interface ItemCheckEntry {
  inStock: boolean;
  packed: boolean;
  shortBy?: number;
}

export interface ItemChecks {
  [itemKey: string]: ItemCheckEntry;
}

/** One aggregated row of the shortage list modal/export. */
export interface ShortageRow {
  title: string;
  quantity: number;
  orderNumbers: number[];
}
