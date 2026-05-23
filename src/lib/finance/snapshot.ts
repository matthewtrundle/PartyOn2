/**
 * FinanceSnapshot writer + reader — Phase 1C.
 *
 * Wraps the FinanceSnapshot model behind a tiny service surface so the
 * cron, the admin read API, and (eventually) the Director's briefing
 * payload all go through the same shape. Payload type lives in
 * `./pl-calculation.ts`.
 */

import { prisma } from '@/lib/database/client';
import type { PlSnapshotPayload } from './pl-calculation';

export interface StoredFinanceSnapshot {
  id: string;
  snapshotDate: string; // YYYY-MM-DD
  payload: PlSnapshotPayload;
  createdAt: string;
}

/**
 * Idempotent write: if a snapshot already exists for the given date we
 * overwrite the payload in place (the cron may re-run after a backfill
 * or after Stripe fee snapshots catch up).
 */
export async function writeFinanceSnapshot(
  payload: PlSnapshotPayload
): Promise<StoredFinanceSnapshot> {
  const snapshotDate = new Date(`${payload.date}T00:00:00Z`);
  const existing = await prisma.financeSnapshot.findFirst({
    where: { snapshotDate },
    orderBy: { createdAt: 'desc' },
  });
  let row;
  if (existing) {
    row = await prisma.financeSnapshot.update({
      where: { id: existing.id },
      data: { payload: payload as unknown as object },
    });
  } else {
    row = await prisma.financeSnapshot.create({
      data: { snapshotDate, payload: payload as unknown as object },
    });
  }
  return {
    id: row.id,
    snapshotDate: payload.date,
    payload,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Load the most recent N snapshots (most recent first). Used by the
 * dashboard trend chart + Director briefings.
 */
export async function listRecentSnapshots(
  limit = 30
): Promise<StoredFinanceSnapshot[]> {
  const rows = await prisma.financeSnapshot.findMany({
    orderBy: { snapshotDate: 'desc' },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    snapshotDate: r.snapshotDate.toISOString().slice(0, 10),
    payload: r.payload as unknown as PlSnapshotPayload,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getSnapshotByDate(
  date: string // YYYY-MM-DD
): Promise<StoredFinanceSnapshot | null> {
  const snapshotDate = new Date(`${date}T00:00:00Z`);
  const row = await prisma.financeSnapshot.findFirst({
    where: { snapshotDate },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return null;
  return {
    id: row.id,
    snapshotDate: date,
    payload: row.payload as unknown as PlSnapshotPayload,
    createdAt: row.createdAt.toISOString(),
  };
}
