/**
 * Email completeness validation — shared by server lead-capture and the
 * browser-side capture widgets.
 *
 * WHY THIS EXISTS (and why it is its own module, not part of leadCapture.ts):
 * the lead widgets fire a capture on every typing pause, so a visitor typing
 * `anzolahathorne@gmail.com` used to persist a fresh Lead row for `an@`,
 * `anz@`, `anzo@`, … — ~10–21 undeliverable fragments per real person. Those
 * fragments also fed the abandoned-quote follow-up enqueue, which would
 * hard-bounce and torch info@partyondelivery.com deliverability.
 *
 * The guard: only treat a string as an email once it is a *syntactically
 * complete* address (local@domain.tld). This module is intentionally pure —
 * no Prisma, no React, no 'use client' — so both server routes and client
 * components can import it without dragging the database client into the
 * browser bundle. leadCapture.ts imports Prisma, so the helper cannot live
 * there.
 */

/**
 * Matches `local@domain.tld` after trim/lowercase: a local part with no
 * spaces or `@`, an `@`, a domain with no spaces or `@`, a dot, and a TLD of
 * at least two non-space/non-@ characters. Deliberately conservative — it
 * rejects mid-typing fragments (`an@`, `@gmail.com`, `a@b`, `a@b.c`) while
 * accepting real addresses. It is a completeness gate, not a full RFC 5322
 * validator (delivery is the real test of validity).
 */
const COMPLETE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Normalize a candidate email to a trimmed, lowercased address, or return
 * null if it is missing or not a complete address. Use this anywhere a Lead
 * row is keyed/created on email so fragments never anchor a lead.
 */
export function normalizeEmail(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return COMPLETE_EMAIL_RE.test(trimmed) ? trimmed : null;
}

/**
 * True when `value` is a syntactically complete email. Client-safe gate for
 * the capture widgets — use before attaching `identify.email` or firing an
 * email-specific capture so partial keystrokes stay funnel-only.
 */
export function isCompleteEmail(value?: string | null): boolean {
  return normalizeEmail(value) !== null;
}
