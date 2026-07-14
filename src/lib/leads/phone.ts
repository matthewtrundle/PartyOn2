/**
 * Phone normalization shared by lead capture, the Lead Flow pipeline, and
 * order matching. Prisma-free so client bundles can import it.
 */

/**
 * Normalize a phone to its digits (keeps a leading +). Returns null when the
 * value has fewer than 7 digits — too short to be a real phone.
 */
export function normPhone(v?: string | null): string | null {
  if (!v) return null;
  const digits = v.replace(/[^\d+]/g, '');
  return digits.length >= 7 ? digits : null;
}

/**
 * Last 10 digits of a phone, for matching Order.customerPhone (stored
 * as-typed). Mirrors the `idx_orders_customer_phone_last10` expression index
 * (2026-07-04-crm-lookup-phone-indexes.sql) so lookups stay indexed.
 */
export function phoneLast10(v?: string | null): string | null {
  if (!v) return null;
  const digits = v.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits.slice(-10);
}
