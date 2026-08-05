/**
 * _abandoned-carts-lib.mjs — pure helpers for the abandoned-cart export.
 *
 * Separated from the DB/IO script so the classification logic (what counts as
 * dead, who to exclude, is-it-contactable, cart math) is unit-testable without
 * a database. No Prisma, no env, no side effects here.
 */

/** Sum a dashboard's draft cart items → dollars. Column is `price` (per-unit). */
export function cartValue(draftItems) {
  if (!Array.isArray(draftItems)) return 0;
  return draftItems.reduce((sum, it) => {
    const qty = Number(it?.quantity) || 0;
    const price = Number(it?.price) || 0;
    return sum + qty * price;
  }, 0);
}

/**
 * A cart is DEAD (unrecoverable) if the group was cancelled, or its delivery
 * date has already passed. Delivery dates are stored at noon UTC, whose UTC
 * calendar day equals the Central calendar day, so a plain YYYY-MM-DD string
 * compare against today's Central date is correct.
 *
 * @param {string} groupStatus       GroupOrderV2Status
 * @param {Date|string|null} latestDeliveryDate  latest tab deliveryDate (nullable)
 * @param {string} todayCentralISO   today's date in Central as 'YYYY-MM-DD'
 */
export function classifyDead(groupStatus, latestDeliveryDate, todayCentralISO) {
  if (groupStatus === 'CANCELLED') return { dead: true, reason: 'group-cancelled' };
  if (latestDeliveryDate != null) {
    const d =
      latestDeliveryDate instanceof Date
        ? latestDeliveryDate.toISOString().slice(0, 10)
        : String(latestDeliveryDate).slice(0, 10);
    if (d && d < todayCentralISO) return { dead: true, reason: `delivery-past-${d}` };
  }
  return { dead: false, reason: null };
}

const OWN_EMAIL_PATTERNS = [
  /@partyondelivery\.com$/i,
  // OUR OWN plus-addressed test aliases only — NOT a bare `/\+/`, which would
  // wrongly exclude real customers who use plus-addressing (jane+party@gmail).
  /^(allan|brian|test|qa|dev)\+/i,
  /\btest\b/i,
  /@example\.(com|org|net)$/i,
  /@test\./i,
];

/**
 * Should this dashboard be EXCLUDED from the worked list?
 *   - source INTERNAL (our own scaffolding)
 *   - our own / test email addresses
 *   - host email belongs to an outbound-prospecting Lead (we solicited them,
 *     they're not an inbound abandoned cart) — passed in as a Set
 *
 * @param {{source:string, email:string|null}} row
 * @param {Set<string>} outreachEmails  lowercased emails from PARTNER_OUTREACH leads
 */
export function classifyExcluded(row, outreachEmails) {
  if (row.source === 'INTERNAL') return { excluded: true, reason: 'source-internal' };
  const email = (row.email || '').trim().toLowerCase();
  if (email && OWN_EMAIL_PATTERNS.some((re) => re.test(email))) {
    return { excluded: true, reason: 'own-or-test-address' };
  }
  if (email && outreachEmails instanceof Set && outreachEmails.has(email)) {
    return { excluded: true, reason: 'partner-outreach-prospect' };
  }
  return { excluded: false, reason: null };
}

/** A minimally-valid email (for contactability bucketing, not RFC-perfect). */
export function isUsableEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** How can we reach this host: 'email' > 'phone' > 'none'. */
export function contactability({ email, phone }) {
  if (isUsableEmail(email)) return 'email';
  if (phone && String(phone).replace(/\D/g, '').length >= 10) return 'phone';
  return 'none';
}

/**
 * Is a dashboard RECOVERABLE — worth putting on the worked list?
 * Alive (not dead), not excluded, and reachable (has email or phone).
 */
export function isRecoverable({ dead, excluded, contact }) {
  return !dead && !excluded && contact !== 'none';
}

/** Age of a cart in whole days from createdAt to now. */
export function ageDays(createdAt, nowMs) {
  const created = createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
  if (!Number.isFinite(created)) return null;
  return Math.max(0, Math.floor((nowMs - created) / 86_400_000));
}

/**
 * CSV-escape a single field. Two jobs:
 *   1. RFC-4180 quoting (quote + double up quotes if it contains , " or newline).
 *   2. Formula-injection defense: host names/emails are customer-controlled, so
 *      a value starting with = + - @ (or a tab/CR that Excel treats the same)
 *      is prefixed with a single quote so the spreadsheet renders it as text
 *      instead of executing it as a formula when the operator opens the CSV.
 */
export function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
