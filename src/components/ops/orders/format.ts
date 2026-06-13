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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Wednesday, Jun 11" from a YYYY-MM-DD key (UTC-noon trick avoids tz shift). */
export function fmtDateLong(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${DAY_NAMES[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Wed 6/11" from a YYYY-MM-DD key. */
export function fmtDateShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${DAY_SHORT[d.getUTCDay()]} ${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** "$123.45" — compact money for cooler cards (matches weekly checklist). */
export function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

export interface TimePill {
  label: 'AM' | 'PM' | 'EVE' | 'TBD' | '?';
  cls: string;
}

/** AM/PM/EVE pill classification from a delivery-time string. */
export function timeOfDayPill(timeStr: string): TimePill {
  if (!timeStr || timeStr === 'TBD') {
    return { label: 'TBD', cls: 'bg-gray-200 text-gray-700' };
  }
  const m = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!m) return { label: '?', cls: 'bg-gray-200 text-gray-700' };
  let hour = parseInt(m[1], 10);
  const isPM = m[3].toUpperCase() === 'PM';
  if (isPM && hour !== 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  if (hour < 12) return { label: 'AM', cls: 'bg-amber-200 text-amber-900' };
  if (hour < 17) return { label: 'PM', cls: 'bg-sky-200 text-sky-900' };
  return { label: 'EVE', cls: 'bg-indigo-900 text-white' };
}

/** Disco/Private/House tag colors (matches weekly checklist). */
export function typeTagClasses(t: 'DISCO' | 'PRIVATE' | 'HOUSE'): { label: string; cls: string; labelCls: string } {
  if (t === 'DISCO') {
    return {
      label: 'Disco',
      cls: 'bg-orange-500 text-white ring-1 ring-inset ring-orange-700',
      labelCls: 'text-orange-700',
    };
  }
  if (t === 'PRIVATE') {
    return {
      label: 'Private',
      cls: 'bg-teal-600 text-white ring-1 ring-inset ring-teal-800',
      labelCls: 'text-teal-700',
    };
  }
  return {
    label: 'House',
    cls: 'bg-emerald-800 text-white ring-1 ring-inset ring-emerald-900',
    labelCls: 'text-emerald-800',
  };
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
