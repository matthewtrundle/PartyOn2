/**
 * Persistence for OperationsRecommendation.
 *
 * Mirrors src/lib/analytics/recommendation-store.ts in shape but:
 *  - upserts by dedupeKey (one open rec per signal+target)
 *  - refreshes evidence + bumps severity when the same signal re-detects worse
 *  - exposes appendActionLog for the rec-card inline-action audit trail
 */

import { prisma } from '@/lib/database/client';
import type { Prisma, OperationsRecommendation } from '@prisma/client';
import type { RecommendationStatus as SharedStatus } from '@/lib/recommendations/lifecycle';
import { isValidTransition } from '@/lib/recommendations/lifecycle';
import {
  buildDedupeKey,
  isHigherSeverity,
  type ActionLogEntry,
  type OperationsRecommendationInput,
  type OpsSeverity,
} from './types';
import { evaluateSuppression } from './dismiss-suppression';

export interface UpsertSummary {
  created: number;
  updated: number;
  skipped: number;
  reopened: number;
  suppressed: number;
}

/**
 * Bulk upsert with dedupe. If an open rec with the same dedupeKey exists,
 * refresh evidence + actionPayload + title and bump severity if worse. If a
 * non-open rec exists with the same dedupeKey, skip — the operator already
 * acted; we'll revisit if/when it gets re-opened.
 */
export async function upsertRecommendations(
  recs: OperationsRecommendationInput[]
): Promise<UpsertSummary> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let reopened = 0;
  let suppressed = 0;

  for (const rec of recs) {
    const dedupeKey = rec.dedupeKey ?? buildDedupeKey(rec.signalKind, rec.targetEntityId);
    const existing = await prisma.operationsRecommendation.findUnique({
      where: { dedupeKey },
      select: {
        id: true,
        status: true,
        severity: true,
        updatedAt: true,
        snoozeUntil: true,
        actionLog: true,
      },
    });

    if (!existing) {
      await prisma.operationsRecommendation.create({
        data: {
          dedupeKey,
          signalKind: rec.signalKind,
          severity: rec.severity,
          title: rec.title,
          evidence: rec.evidence as unknown as Prisma.InputJsonValue,
          targetEntityType: rec.targetEntityType,
          targetEntityId: rec.targetEntityId,
          actionPayload: rec.actionPayload as unknown as Prisma.InputJsonValue,
          source: rec.source ?? 'auto-snapshot',
          status: 'open',
        },
      });
      created += 1;
      continue;
    }

    if (existing.status !== 'open') {
      // Non-open rec: ask the dismiss-feedback heuristic whether the detector
      // should re-emit (knocked-down severity), suppress entirely, or wait.
      const decision = evaluateSuppression(existing, rec.severity);
      if (decision.action === 'skip') {
        skipped += 1;
        continue;
      }
      if (decision.action === 'suppress') {
        suppressed += 1;
        continue;
      }
      // Re-open: reset to open at the heuristic-decided severity, refresh
      // evidence + payload + title. Preserve the actionLog so dismissal
      // history compounds across re-emissions.
      await prisma.operationsRecommendation.update({
        where: { id: existing.id },
        data: {
          status: 'open',
          severity: decision.nextSeverity,
          title: rec.title,
          evidence: rec.evidence as unknown as Prisma.InputJsonValue,
          actionPayload: rec.actionPayload as unknown as Prisma.InputJsonValue,
          // Re-opening clears the prior dismiss reason / snooze window per
          // markStatus convention; the dismissCount lives in actionLog.
          dismissReason: null,
          snoozeUntil: null,
        },
      });
      reopened += 1;
      continue;
    }

    // Open rec already exists — refresh fields. Only raise severity, never lower
    // (the operator may want to see the worst the heuristic has seen).
    const existingSeverity = existing.severity as OpsSeverity;
    const nextSeverity = isHigherSeverity(rec.severity, existingSeverity)
      ? rec.severity
      : existingSeverity;

    await prisma.operationsRecommendation.update({
      where: { id: existing.id },
      data: {
        severity: nextSeverity,
        title: rec.title,
        evidence: rec.evidence as unknown as Prisma.InputJsonValue,
        actionPayload: rec.actionPayload as unknown as Prisma.InputJsonValue,
      },
    });
    updated += 1;
  }

  return { created, updated, skipped, reopened, suppressed };
}

/**
 * Set status with shared lifecycle validation. Pass dismissReason when
 * transitioning to rejected/invalidated; pass snoozeUntil when transitioning
 * to snoozed. shippedAt auto-stamped on transition to shipped.
 */
export async function markStatus(
  id: string,
  status: SharedStatus,
  opts?: { dismissReason?: string; snoozeUntil?: Date | null }
): Promise<OperationsRecommendation> {
  const current = await prisma.operationsRecommendation.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!current) throw new Error(`OperationsRecommendation ${id} not found`);

  const from = current.status as SharedStatus;
  if (!isValidTransition(from, status)) {
    throw new Error(`Invalid transition: ${from} → ${status}`);
  }

  const data: Prisma.OperationsRecommendationUpdateInput = { status };
  if (status === 'shipped') data.shippedAt = new Date();
  if (opts?.dismissReason !== undefined) data.dismissReason = opts.dismissReason;
  if (opts?.snoozeUntil !== undefined) data.snoozeUntil = opts.snoozeUntil;
  // Re-opening clears prior dismissal context.
  if (status === 'open') {
    data.dismissReason = null;
    data.snoozeUntil = null;
  }

  return prisma.operationsRecommendation.update({ where: { id }, data });
}

/**
 * Append an action-log entry. Read-modify-write inside `$transaction`.
 *
 * Concurrency note: Postgres doesn't row-lock until the UPDATE statement, so
 * two simultaneous appends on the same rec can both read the same baseline
 * and the later UPDATE wins (lost-update). Acceptable here because the
 * action log is driven by a single operator clicking inline buttons one at
 * a time — concurrent appends on the same rec aren't a realistic workflow.
 * If this assumption stops holding, swap the read-modify-write for an
 * atomic `jsonb_set(action_log, '{<idx>}', $1, true)` via $executeRawUnsafe
 * or a SELECT … FOR UPDATE inside the transaction.
 */
export async function appendActionLog(
  id: string,
  entry: ActionLogEntry
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.operationsRecommendation.findUnique({
      where: { id },
      select: { actionLog: true },
    });
    if (!row) throw new Error(`OperationsRecommendation ${id} not found`);
    const log = Array.isArray(row.actionLog) ? (row.actionLog as unknown as ActionLogEntry[]) : [];
    log.push(entry);
    await tx.operationsRecommendation.update({
      where: { id },
      data: { actionLog: log as unknown as Prisma.InputJsonValue },
    });
  });
}

export async function getActiveByDedupeKey(
  dedupeKey: string
): Promise<OperationsRecommendation | null> {
  return prisma.operationsRecommendation.findUnique({ where: { dedupeKey } });
}

/**
 * Look up recently-resolved recs for a dedupeKey (within `days` calendar
 * days). Used by generators to suppress noise from snoozed/rejected signals.
 */
export async function findRecentResolved(
  dedupeKey: string,
  days = 30
): Promise<OperationsRecommendation | null> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.operationsRecommendation.findFirst({
    where: {
      dedupeKey,
      status: { in: ['snoozed', 'rejected', 'invalidated'] },
      updatedAt: { gte: cutoff },
    },
    orderBy: { updatedAt: 'desc' },
  });
}
