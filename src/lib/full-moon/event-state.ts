/**
 * Full Moon Party event state — the "postponed" toggle behind the public
 * threshold widget.
 *
 * Stored as a boolean row in the existing `feature_flags` table (key
 * `full_moon_postponed`) so no schema change is needed. When true, the event
 * has been rolled forward (short of the minimum at the deadline) and the widget
 * shows its "Postponed" state. Set by the deadline cron or an operator; reset to
 * resume selling.
 *
 * The widget's own state vocabulary is 'working' | 'met' | 'cancelled', where
 * 'cancelled' renders as "Postponed" (rolled forward, tickets refunded). We keep
 * that vocabulary here so the count endpoint can hand the widget a state string
 * it already understands.
 */
import { prisma } from '@/lib/database/client';
import { FEATURE_FLAGS } from '@/lib/features/feature-flags';

/** Public threshold-widget state. 'cancelled' === postponed / rolled forward. */
export type FullMoonState = 'working' | 'met' | 'cancelled';

/**
 * Whether the event is currently marked postponed/cancelled. Reads the flag
 * directly (bypassing the rollout-percentage feature-flag evaluation and its
 * cache) so a flip is reflected immediately. Fails open to `false` (keep
 * selling) so a DB hiccup never falsely tells buyers the event is off.
 */
export async function isFullMoonPostponed(): Promise<boolean> {
  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { key: FEATURE_FLAGS.FULL_MOON_POSTPONED },
      select: { enabled: true },
    });
    return flag?.enabled === true;
  } catch (error) {
    console.error('[FullMoon State] read failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Set (or clear) the postponed flag. Idempotent — safe to call repeatedly.
 * @param postponed true to postpone/cancel, false to resume selling.
 * @param by short actor label for the audit description (e.g. 'deadline-cron').
 */
export async function setFullMoonPostponed(postponed: boolean, by = 'system'): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { key: FEATURE_FLAGS.FULL_MOON_POSTPONED },
    update: {
      enabled: postponed,
      rolloutPercentage: postponed ? 100 : 0,
      description: `Full Moon ${postponed ? 'postponed' : 'selling'} — set by ${by}`,
    },
    create: {
      key: FEATURE_FLAGS.FULL_MOON_POSTPONED,
      enabled: postponed,
      rolloutPercentage: postponed ? 100 : 0,
      description: `Full Moon ${postponed ? 'postponed' : 'selling'} — set by ${by}`,
    },
  });
}

/**
 * Derive the public widget state from the sold count and the postponed flag.
 * Pure so it can be unit-tested. Postponed wins; otherwise the minimum being
 * met flips 'working' → 'met'.
 */
export function deriveFullMoonState(sold: number, minimum: number, postponed: boolean): FullMoonState {
  if (postponed) return 'cancelled';
  return sold >= minimum ? 'met' : 'working';
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC ms of the deadline: `deadlineDays` before the event date. */
export function deadlineTimestamp(isoDate: string, deadlineDays: number): number {
  return Date.parse(`${isoDate}T00:00:00Z`) - deadlineDays * DAY_MS;
}

/** UTC ms of the end of the event day. */
export function eventEndTimestamp(isoDate: string): number {
  return Date.parse(`${isoDate}T23:59:59Z`);
}

export type DeadlineWindow = 'not-yet' | 'in-window' | 'past-event';

/**
 * Where `nowMs` falls relative to the deadline window. The deadline cron only
 * acts while 'in-window' (past the deadline, on or before the event day). Pure.
 */
export function deadlineWindow(nowMs: number, isoDate: string, deadlineDays: number): DeadlineWindow {
  if (nowMs < deadlineTimestamp(isoDate, deadlineDays)) return 'not-yet';
  if (nowMs > eventEndTimestamp(isoDate)) return 'past-event';
  return 'in-window';
}
