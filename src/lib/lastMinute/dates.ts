/**
 * Last-minute date helpers — single source of truth for "is this
 * delivery date today or tomorrow in Austin time?"
 *
 * Why timezone-aware: a customer in NYC submitting at 1am their local
 * time on Tuesday is still on Monday in Austin (UTC-6/UTC-5). We
 * normalize to America/Chicago before comparing so the customer's
 * "tomorrow" matches the ops team's "tomorrow."
 *
 * Used by:
 *   - PackageBuilderModal.tsx (modal flips last-minute mode locally)
 *   - /api/v1/quote/start/route.ts (server stamps GroupOrderV2)
 *   - /api/v1/chat/submit/route.ts (chat reply tells the user)
 *   - lib/group-orders-v2/service.ts (recomputes flag on tab edit)
 *
 * Before this helper existed, each of those sites had its own slightly-
 * different copy of `picked.getTime() === today.getTime()` and they
 * disagreed at DST boundaries + cross-midnight UTC submissions.
 */

const TZ = 'America/Chicago';

/**
 * Returns the date portion (YYYY-MM-DD) of a Date in Austin time.
 * Independent of the host server's timezone.
 */
function austinDateString(d: Date): string {
  // en-CA gives ISO-style YYYY-MM-DD output.
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

/**
 * Coerce a Date | YYYY-MM-DD string into an Austin date-only string.
 * Returns null if the input can't be parsed.
 */
function coerceToAustinDateString(input: Date | string): string | null {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return austinDateString(input);
  }
  if (typeof input === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return null;
    return austinDateString(d);
  }
  return null;
}

/**
 * Is the given delivery date "today" or "tomorrow" in Austin time?
 *
 * Accepts:
 *   - `YYYY-MM-DD` string (preferred — already date-only, no TZ ambiguity)
 *   - `Date` object (any time/zone — we normalize to Austin first)
 *
 * Returns false for null / invalid / past dates / 2+ days out.
 */
export function isLastMinuteDate(input: Date | string | null | undefined): boolean {
  if (input == null) return false;
  const pickedDate = coerceToAustinDateString(input);
  if (!pickedDate) return false;

  const now = new Date();
  const today = austinDateString(now);
  const tomorrowMs = now.getTime() + 24 * 60 * 60 * 1000;
  const tomorrow = austinDateString(new Date(tomorrowMs));

  return pickedDate === today || pickedDate === tomorrow;
}
