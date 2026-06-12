/**
 * Formatting helpers and status color maps for the ops Orders page.
 * Extracted verbatim from src/app/ops/orders/page.tsx (Phase 1).
 *
 * All delivery-date formatting uses timeZone:'UTC' on purpose:
 * Order.deliveryDate is stored as a UTC-midnight date, so local-time
 * formatting would shift evening orders a day in Austin.
 */

/** Format a number as USD currency. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/** "Jun 11, 2026" — UTC so stored delivery dates don't shift. */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "Jun 11, 3:00 PM" — UTC so stored delivery dates don't shift. */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/** Format delivery address from JSON object or plain string. */
export function formatAddress(addr: Record<string, string> | string | null): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const parts = [addr.address1, addr.address2, addr.city, addr.state || addr.province, addr.zip].filter(Boolean);
  return parts.join(', ');
}

/** Badge classes for Order.status values. */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200 shadow-sm';
    case 'PENDING':
      return 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border border-yellow-200 shadow-sm';
    case 'CANCELLED':
      return 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200 shadow-sm';
    case 'COMPLETED':
    case 'DELIVERED':
      return 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 shadow-sm';
    case 'PROCESSING':
    case 'OUT_FOR_DELIVERY':
      return 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border border-purple-200 shadow-sm';
    default:
      return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200 shadow-sm';
  }
}

/** Badge classes for Order.fulfillmentStatus values. */
export function getFulfillmentColor(status: string): string {
  switch (status) {
    case 'FULFILLED':
    case 'DELIVERED':
      return 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200 shadow-sm';
    case 'UNFULFILLED':
      return 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border border-orange-200 shadow-sm';
    case 'PARTIAL':
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY':
      return 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border border-yellow-200 shadow-sm';
    default:
      return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200 shadow-sm';
  }
}

/** Badge classes for legacy GroupOrder.status values. */
export function getGroupStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200 shadow-sm';
    case 'LOCKED':
      return 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 shadow-sm';
    case 'COMPLETED':
      return 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border border-purple-200 shadow-sm';
    case 'CANCELLED':
      return 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200 shadow-sm';
    case 'CLOSED':
      return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 border border-gray-300 shadow-sm';
    default:
      return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200 shadow-sm';
  }
}
