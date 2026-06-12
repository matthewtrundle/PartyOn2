/**
 * Dismiss-feedback heuristic for the Finance Director — mirrors the Ops
 * implementation. Stops re-emitting a signal after the operator dismisses
 * it N times in a row; re-surfaces at knocked-down severity in between.
 */

import { knockDownSeverity, type ActionLogEntry, type FinanceSeverity } from './types';

export const SUPPRESSION_THRESHOLD = 3;
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
  | { action: 'reopen'; nextSeverity: FinanceSeverity; dismissCount: number };

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

export function evaluateSuppression(
  existing: ExistingRec,
  requestedSeverity: FinanceSeverity,
  now: Date = new Date()
): SuppressionDecision {
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

  const nextSeverity =
    dismissCount > 0 ? knockDownSeverity(requestedSeverity) : requestedSeverity;
  return { action: 'reopen', nextSeverity, dismissCount };
}
