/** Delivery utility functions */

import { isInDeliveryArea, getMinimumOrder } from '@/lib/delivery/rates';

/**
 * Normalize a delivery date to noon UTC to prevent timezone display issues.
 * Dates stored as midnight UTC (00:00) display as the previous day in US timezones.
 */
export function normalizeDeliveryDate(date: Date | string): Date {
  const d = new Date(date);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

export function getEarliestDeliveryDate(): Date {
  // 48-hour standard ordering window (matches /faqs, terms, and landing copy).
  const date = new Date();
  date.setHours(date.getHours() + 48);
  return date;
}

export function formatDeliveryDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

// Zone data lives in src/lib/delivery/rates.ts (the source of truth per
// ADR-0002) — these wrappers exist for legacy callers and must not carry
// their own zip lists or amounts.
export function isValidDeliveryArea(zipCode: string): boolean {
  return isInDeliveryArea(zipCode);
}

export function getOrderMinimum(zipCode: string): number {
  return getMinimumOrder(zipCode);
}
