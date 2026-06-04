/**
 * Mutation helpers for the unified [id] recommendation routes.
 *
 * These centralize the "load rec, update status, log action" plumbing so
 * each endpoint handler stays under 50 lines. Marketing/SEO live in
 * `recommendation_items`; Operations lives in `operations_recommendations`
 * — `findRecommendationLocation` tells us which table this id belongs to.
 */

import { prisma } from '@/lib/database/client';
import type { Prisma } from '@prisma/client';
import { appendActionLog } from '@/lib/operations/recommendation-store';
import { mirrorOperationsRecommendation } from '@/lib/operations/recommendation-mirror';
import { buildActionLogEntry } from './unified-list';
import type { ActionLogEntry } from '@/lib/operations/types';
import type { RecommendationStatus } from './lifecycle';
import { isValidTransition } from './lifecycle';

export type RecLocation = 'ops' | 'marketing-seo';

export interface StatusUpdate {
  status: RecommendationStatus;
  dismissReason?: string;
  snoozeUntil?: Date | null;
  notes?: string;
}

/**
 * Apply a status update to whichever table holds this rec. Ops gets the full
 * column set; Marketing reuses `notes` for dismiss reason (no native column
 * — see RecommendationItem in prisma/schema.prisma).
 */
export async function applyStatusUpdate(
  id: string,
  location: RecLocation,
  currentStatus: RecommendationStatus,
  update: StatusUpdate
): Promise<void> {
  if (!isValidTransition(currentStatus, update.status)) {
    throw new Error(`Invalid transition: ${currentStatus} → ${update.status}`);
  }

  if (location === 'ops') {
    const data: Prisma.OperationsRecommendationUpdateInput = { status: update.status };
    if (update.status === 'shipped') data.shippedAt = new Date();
    if (update.dismissReason !== undefined) data.dismissReason = update.dismissReason;
    if (update.snoozeUntil !== undefined) data.snoozeUntil = update.snoozeUntil;
    if (update.status === 'open') {
      data.dismissReason = null;
      data.snoozeUntil = null;
    }
    const updated = await prisma.operationsRecommendation.update({ where: { id }, data });
    // Mirror to GitHub so the next `sync:operations` picks up the change in
    // the operator's vault. Fail-soft — never blocks the DB update.
    void mirrorOperationsRecommendation(updated, {
      date: new Date().toISOString().slice(0, 10),
      fromStatus: currentStatus,
      toStatus: update.status,
      notes: update.dismissReason ?? update.notes,
      actor: 'operator',
    }).catch((err) => {
      console.warn('[ops-rec-mirror] non-fatal:', err instanceof Error ? err.message : err);
    });
    return;
  }

  const data: Prisma.RecommendationItemUpdateInput = { status: update.status };
  if (update.status === 'shipped') data.shippedAt = new Date();
  // Marketing has no native dismissReason / snoozeUntil; fold reason into notes
  // so the operator's "why" survives. The existing Marketing triage page also
  // writes free-text into `notes`, so this keeps the audit trail consistent.
  if (update.dismissReason && !update.notes) data.notes = update.dismissReason;
  if (update.notes !== undefined) data.notes = update.notes;
  await prisma.recommendationItem.update({ where: { id }, data });
}

/**
 * Append an entry to the rec's action log. Only Operations recs have a
 * dedicated `actionLog` JSON column — for Marketing we no-op (the existing
 * status-history surface plus the notes column already cover the audit
 * trail). The unified card's audit narrative still works because the
 * navigation event was visible to the operator who clicked it.
 */
export async function logAction(
  id: string,
  location: RecLocation,
  entry: Omit<ActionLogEntry, 'timestamp'>
): Promise<void> {
  if (location !== 'ops') return;
  const built = buildActionLogEntry({
    actionKind: entry.actionKind ?? 'unknown',
    actionLabel: entry.actionLabel,
    result: entry.result,
    errorMessage: entry.errorMessage,
  });
  await appendActionLog(id, built);
}
