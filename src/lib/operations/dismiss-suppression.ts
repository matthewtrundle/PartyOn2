/**
 * Dismiss-feedback heuristic — implements §5d of the buildout doc.
 *
 *   "If the operator dismisses 'Repeated shorts on variant Z' three times in
 *    a row with reason 'intentional buffer,' the heuristic stops flagging
 *    that variant. This is built in from day one — not a Phase-2 addition —
 *    because noise tolerance is what makes or breaks a triage queue."
 *
 * Today this surfaces a recommendation back into the operator's triage
 * queue at a quieter severity after a single dismissal, and stops emitting
 * entirely once the dismissal count crosses the threshold.
 *
 * Implementation strategy (no schema change required):
 *
 *  - Dismissal events are already appended to `OperationsRecommendation.actionLog`
 *    by the `/api/admin/recommendations/[id]/dismiss` handler (Phase 1C).
 *  - When the detector tries to re-emit a rec with the same dedupeKey, we
 *    count those actionLog entries. The first time the existing non-open rec
 *    has aged out (default 30 days since the operator last touched it), we
 *    allow re-emission — but knock the severity down by one tier, or skip
 *    entirely once the count crosses SUPPRESSION_THRESHOLD.
 */

import { knockDownSeverity, type ActionLogEntry, type OpsSeverity } from './types';

/** Number of dismissals after which the detector stops emitting altogether. */
export const SUPPRESSION_THRESHOLD = 3;

/** Days a resolved (rejected/invalidated/snoozed) rec must sit before re-emission is considered. */
export const REEMISSION_AGE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ExistingRec = {
  id: string;
  status: string;
  severity: string;
  updatedAt?: Date | null;
  snoozeUntil?: Date | null;
  actionLog?: unknown;
};

export type SuppressionDecision =
  | { action: 'skip'; reason: 'still-active-snooze' | 'recent-dismissal' }
  | { action: 'suppress'; reason: 'threshold-reached'; dismissCount: number }
  | { action: 'reopen'; nextSeverity: OpsSeverity; dismissCount: number };

/** Count `actionKind === 'dismiss'` entries on a rec's actionLog. */
export function countDismissals(actionLog: unknown): number {
  if (!Array.isArray(actionLog)) return 0;
  let n = 0;
  for (const raw of actionLog) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Partial<ActionLogEntry>;
    if (entry.actionKind === 'dismiss') n += 1;
  }
  return n;
}

/**
 * Pure decision: given the existing non-open rec + the detector's requested
 * severity, return whether to skip, suppress, or re-open. The caller applies
 * the side effect (update existing row or skip the upsert).
 *
 * `now` is injectable for testing.
 */
export function evaluateSuppression(
  existing: ExistingRec,
  requestedSeverity: OpsSeverity,
  now: Date = new Date()
): SuppressionDecision {
  // Active snooze is sacred. Don't second-guess a snoozeUntil window.
  if (existing.status === 'snoozed' && existing.snoozeUntil && existing.snoozeUntil > now) {
    return { action: 'skip', reason: 'still-active-snooze' };
  }

  const updatedAt = existing.updatedAt ?? null;
  const agedOut =
    updatedAt instanceof Date &&
    updatedAt.getTime() < now.getTime() - REEMISSION_AGE_DAYS * DAY_MS;
  if (!agedOut) {
    return { action: 'skip', reason: 'recent-dismissal' };
  }

  const dismissCount = countDismissals(existing.actionLog);
  if (dismissCount >= SUPPRESSION_THRESHOLD) {
    return { action: 'suppress', reason: 'threshold-reached', dismissCount };
  }

  // Re-open with knocked-down severity per noise tolerance — the operator
  // already saw this once and chose to dismiss it. The detector wants to
  // surface it again because it persists, but not as loudly.
  const nextSeverity = dismissCount > 0 ? knockDownSeverity(requestedSeverity) : requestedSeverity;
  return { action: 'reopen', nextSeverity, dismissCount };
}
