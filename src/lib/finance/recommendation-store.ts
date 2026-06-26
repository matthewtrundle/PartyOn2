/**
 * Persistence for FinanceRecommendation. Mirrors
 * src/lib/operations/recommendation-store.ts in shape:
 *  - upserts by dedupeKey (one open rec per signal+target)
 *  - refreshes evidence + bumps severity when the same signal re-detects worse
 *  - exposes appendActionLog for inline-action audit trails
 *  - markStatus validates transitions via shared lifecycle.ts
 */

import { prisma } from '@/lib/database/client';
import type { Prisma, FinanceRecommendation } from '@prisma/client';
import type { RecommendationStatus as SharedStatus } from '@/lib/recommendations/lifecycle';
import { isValidTransition } from '@/lib/recommendations/lifecycle';
import {
  buildDedupeKey,
  isHigherSeverity,
  type ActionLogEntry,
  type FinanceRecommendationInput,
  type FinanceSeverity,
} from './types';
import { evaluateSuppression } from './dismiss-suppression';

export interface UpsertSummary {
  created: number;
  updated: number;
  skipped: number;
  reopened: number;
  suppressed: number;
}

export async function upsertRecommendations(
  recs: FinanceRecommendationInput[]
): Promise<UpsertSummary> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let reopened = 0;
  let suppressed = 0;

  for (const rec of recs) {
    const dedupeKey = rec.dedupeKey ?? buildDedupeKey(rec.signalKind, rec.targetEntityId);
    const existing = await prisma.financeRecommendation.findUnique({
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
      await prisma.financeRecommendation.create({
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
      const decision = evaluateSuppression(existing, rec.severity);
      if (decision.action === 'skip') {
        skipped += 1;
        continue;
      }
      if (decision.action === 'suppress') {
        suppressed += 1;
        continue;
      }
      await prisma.financeRecommendation.update({
        where: { id: existing.id },
        data: {
          status: 'open',
          severity: decision.nextSeverity,
          title: rec.title,
          evidence: rec.evidence as unknown as Prisma.InputJsonValue,
          actionPayload: rec.actionPayload as unknown as Prisma.InputJsonValue,
          dismissReason: null,
          snoozeUntil: null,
        },
      });
      reopened += 1;
      continue;
    }

    // Open rec already exists — refresh fields. Only raise severity.
    const existingSeverity = existing.severity as FinanceSeverity;
    const nextSeverity = isHigherSeverity(rec.severity, existingSeverity)
      ? rec.severity
      : existingSeverity;

    await prisma.financeRecommendation.update({
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

export async function markStatus(
  id: string,
  status: SharedStatus,
  opts?: { dismissReason?: string; snoozeUntil?: Date | null }
): Promise<FinanceRecommendation> {
  const current = await prisma.financeRecommendation.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!current) throw new Error(`FinanceRecommendation ${id} not found`);

  const from = current.status as SharedStatus;
  if (!isValidTransition(from, status)) {
    throw new Error(`Invalid transition: ${from} → ${status}`);
  }

  const data: Prisma.FinanceRecommendationUpdateInput = { status };
  if (status === 'shipped') data.shippedAt = new Date();
  if (opts?.dismissReason !== undefined) data.dismissReason = opts.dismissReason;
  if (opts?.snoozeUntil !== undefined) data.snoozeUntil = opts.snoozeUntil;
  if (status === 'open') {
    data.dismissReason = null;
    data.snoozeUntil = null;
  }

  return prisma.financeRecommendation.update({ where: { id }, data });
}

export async function appendActionLog(
  id: string,
  entry: ActionLogEntry
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.financeRecommendation.findUnique({
      where: { id },
      select: { actionLog: true },
    });
    if (!row) throw new Error(`FinanceRecommendation ${id} not found`);
    const log = Array.isArray(row.actionLog) ? (row.actionLog as unknown as ActionLogEntry[]) : [];
    log.push(entry);
    await tx.financeRecommendation.update({
      where: { id },
      data: { actionLog: log as unknown as Prisma.InputJsonValue },
    });
  });
}

export async function getActiveByDedupeKey(
  dedupeKey: string
): Promise<FinanceRecommendation | null> {
  return prisma.financeRecommendation.findUnique({ where: { dedupeKey } });
}

export async function findRecentResolved(
  dedupeKey: string,
  days = 30
): Promise<FinanceRecommendation | null> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.financeRecommendation.findFirst({
    where: {
      dedupeKey,
      status: { in: ['snoozed', 'rejected', 'invalidated'] },
      updatedAt: { gte: cutoff },
    },
    orderBy: { updatedAt: 'desc' },
  });
}
