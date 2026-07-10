/**
 * Formatting helpers and status color maps for the ops Orders page.
 * Extracted verbatim from src/app/ops/orders/page.tsx (Phase 1).
 *
 * All delivery-date formatting uses timeZone:'UTC' on purpose:
 * Order.deliveryDate is stored as a UTC-midnight date, so local-time
 * formatting would shift evening orders a day in Austin.
 */

import type { OrderCardData } from '@/lib/ops/orders-view-data';
import { isBoatAddress } from '@/lib/ops/boat-address';

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

/**
 * Start time of a delivery-time string as minutes since midnight, for
 * chronological sorting. Handles "4:30 PM" and ranges like "4:30 PM - 5:00 PM"
 * (uses the start). Blank / "TBD" / unparseable sort to the end.
 */
export function deliveryTimeMinutes(timeStr: string): number {
  if (!timeStr) return Number.MAX_SAFE_INTEGER;
  const m = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!m) return Number.MAX_SAFE_INTEGER;
  let hour = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const isPM = m[3].toUpperCase() === 'PM';
  if (isPM && hour !== 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  return hour * 60 + min;
}

/**
 * Very subtle AM/PM/EVE accent for the collapsed-day tiles — a left-border
 * color class, mirroring timeOfDayPill's buckets. Unknown / TBD reads neutral.
 */
export function timeOfDayAccent(timeStr: string): string {
  switch (timeOfDayPill(timeStr).label) {
    case 'AM':
      return 'border-l-amber-400';
    case 'PM':
      return 'border-l-sky-400';
    case 'EVE':
      return 'border-l-indigo-500';
    default:
      return 'border-l-gray-300';
  }
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

/**
 * Cruise label (DISCO / PRIVATE) for a cooler card — shown ONLY when BOTH are
 * true: the delivery is going to the boat (marina address) AND the order is
 * matched on the boat manifest. So a guest booked on a cruise another day,
 * whose THIS order ships elsewhere, gets no cruise label. Returns null when it
 * is not a qualified cruise delivery.
 */
export function cruiseLabelForCard(card: OrderCardData): 'DISCO' | 'PRIVATE' | null {
  if (!card.manifestMatch) return null;
  if (!isBoatAddress(card.address)) return null;
  return card.shortType === 'DISCO' || card.shortType === 'PRIVATE'
    ? card.shortType
    : null;
}
