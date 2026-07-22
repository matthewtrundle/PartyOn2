/**
 * Premiere Credit automation — pure decision logic.
 *
 * Given a parsed row (and, for the duplicate guard, its DB siblings), decide
 * what to do. No IO here — grant-service does the minting/sending and feeds
 * this module the sibling data it needs. Unit-tested.
 */

import { z } from 'zod';
import { extractLastName, normalizeName } from './parse';
import type { ParsedCreditRow, RowAction } from './types';

/** Amounts strictly above this are minted but HELD for operator approval. */
export const HOLD_THRESHOLD_USD = 300;

/**
 * Amounts strictly above this are held with a distinct reason — a backstop
 * against a garbage cell (e.g. a locale mis-parse) minting a huge credit.
 */
export const SANITY_CAP_USD = 1000;

/** Max new rows minted per cron tick — guards against a bad bulk paste. */
export const PER_RUN_CAP = 20;

/** Unambiguous code alphabet for the collision suffix (no I/L/O/0/1). */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const emailSchema = z.string().trim().email();

/** True when the string is a syntactically valid email. */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return emailSchema.safeParse(email).success;
}

/**
 * Decide the action for a parsed row, based only on the row itself:
 *   - no valid email        → needs-contact (never mint an unreachable code)
 *   - amount > sanity cap    → mint, held (sanity-cap)
 *   - amount > hold threshold → mint, held (over-threshold)
 *   - otherwise              → mint, not held
 *
 * The duplicate guard (same person + booking, different amount) needs DB state
 * and is applied separately by grant-service via `isPossibleDuplicate`.
 */
export function planRowAction(row: ParsedCreditRow): RowAction {
  if (!isValidEmail(row.email)) return { kind: 'needs-contact' };
  if (row.amount > SANITY_CAP_USD) return { kind: 'mint', hold: true, holdReason: 'sanity-cap' };
  if (row.amount > HOLD_THRESHOLD_USD) return { kind: 'mint', hold: true, holdReason: 'over-threshold' };
  return { kind: 'mint', hold: false };
}

/**
 * The deterministic discount code base, matching Premiere's existing
 * convention: LASTNAME + amount digits (e.g. $336.21 → "LEBLANC33621",
 * $125.26 → "HARADEN12526"). Falls back to the normalized full name (letters
 * only) when there is no distinct last name. Never returns an empty string.
 */
export function generateCodeBase(clientName: string, amount: number): string {
  const digits = amount.toFixed(2).replace('.', '');
  let last = extractLastName(clientName);
  if (!last) last = normalizeName(clientName).toUpperCase().replace(/[^A-Z]/g, '');
  if (!last) last = 'PODCREDIT';
  return `${last}${digits}`;
}

/**
 * Duplicate guard: given the candidate and any existing grants that share its
 * normalized client name + booking date, return true when at least one has a
 * DIFFERENT source key (i.e. a different amount for the same person+booking).
 * That is the ambiguous case we never auto-mint on — grant-service holds it.
 * An existing grant with the SAME source key is the idempotent re-run, not a
 * duplicate.
 */
export function isPossibleDuplicate(
  candidate: ParsedCreditRow,
  siblings: Array<{ sourceKey: string }>,
): boolean {
  return siblings.some((s) => s.sourceKey !== candidate.sourceKey);
}
