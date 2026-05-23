/**
 * Health-dashboard data assembler.
 *
 * Consumed by `/admin/operations` (RSC) and `/api/admin/operations/snapshot`
 * (JSON). Keep this side-effect-free and DB-only — both surfaces share the
 * exact same shape.
 */

import { prisma } from '@/lib/database/client';
import type { OperationsSnapshot } from '@prisma/client';
import type { OpsSeverity, SignalKind } from './types';

export interface DashboardData {
  latestSnapshot: SnapshotSummary | null;
  history: SnapshotSummary[];   // chronological — oldest → newest, up to 30 rows
  activeRecCounts: {
    bySeverity: Record<OpsSeverity, number>;
    bySignal: Array<{ signalKind: string; count: number }>;
    total: number;
  };
  topUrgent: ActiveRecRow[];
  cycleCounts7d: number;
}

export interface SnapshotSummary {
  capturedAt: string;
  inventoryAccuracyPct: number | null;
  driftEventsTotal: number;
  driftEventsBySignal: Record<string, number>;
  urgentShortagesCount: number;
  costCoveragePct: number;
  receivingLagP50Hours: number | null;
  receivingLagP90Hours: number | null;
  cycleCountsCompletedLast7d: number;
  paidOrders14dShortageCount: number;
}

export interface ActiveRecRow {
  id: string;
  title: string;
  signalKind: string;
  severity: OpsSeverity;
  createdAt: string;
}

const HISTORY_LIMIT = 30;
const TOP_URGENT_LIMIT = 8;

function toSnapshotSummary(s: OperationsSnapshot): SnapshotSummary {
  const byKind = s.driftEventsBySignal && typeof s.driftEventsBySignal === 'object'
    ? (s.driftEventsBySignal as Record<string, number>)
    : {};
  return {
    capturedAt: s.capturedAt.toISOString(),
    inventoryAccuracyPct: s.inventoryAccuracyPct,
    driftEventsTotal: s.driftEventsTotal,
    driftEventsBySignal: byKind,
    urgentShortagesCount: s.urgentShortagesCount,
    costCoveragePct: s.costCoveragePct,
    receivingLagP50Hours: s.receivingLagP50Hours,
    receivingLagP90Hours: s.receivingLagP90Hours,
    cycleCountsCompletedLast7d: s.cycleCountsCompletedLast7d,
    paidOrders14dShortageCount: s.paidOrders14dShortageCount,
  };
}

function normaliseSeverity(value: string): OpsSeverity {
  return value === 'urgent' || value === 'high' ? value : 'normal';
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [recent, activeRecs] = await Promise.all([
    prisma.operationsSnapshot.findMany({
      orderBy: { capturedAt: 'desc' },
      take: HISTORY_LIMIT,
    }),
    prisma.operationsRecommendation.findMany({
      where: { status: { in: ['open', 'approved'] } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
  ]);

  const latestSnapshot = recent[0] ? toSnapshotSummary(recent[0]) : null;
  const history = recent.slice().reverse().map(toSnapshotSummary);

  const bySeverity: Record<OpsSeverity, number> = { urgent: 0, high: 0, normal: 0 };
  const signalCounts = new Map<string, number>();
  for (const rec of activeRecs) {
    const sev = normaliseSeverity(rec.severity);
    bySeverity[sev] += 1;
    signalCounts.set(rec.signalKind, (signalCounts.get(rec.signalKind) ?? 0) + 1);
  }
  const bySignal = Array.from(signalCounts.entries())
    .map(([signalKind, count]) => ({ signalKind, count }))
    .sort((a, b) => b.count - a.count);

  const topUrgent: ActiveRecRow[] = activeRecs
    .slice()
    .sort((a, b) => {
      const sa = normaliseSeverity(a.severity);
      const sb = normaliseSeverity(b.severity);
      const rank = (s: OpsSeverity) => (s === 'urgent' ? 2 : s === 'high' ? 1 : 0);
      const sd = rank(sb) - rank(sa);
      if (sd !== 0) return sd;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, TOP_URGENT_LIMIT)
    .map((r) => ({
      id: r.id,
      title: r.title,
      signalKind: r.signalKind,
      severity: normaliseSeverity(r.severity),
      createdAt: r.createdAt.toISOString(),
    }));

  return {
    latestSnapshot,
    history,
    activeRecCounts: {
      bySeverity,
      bySignal,
      total: activeRecs.length,
    },
    topUrgent,
    cycleCounts7d: latestSnapshot?.cycleCountsCompletedLast7d ?? 0,
  };
}

/** Re-exported so the page can render fixed signal labels. */
export const SIGNAL_LABELS: Record<SignalKind, string> = {
  'receiving-lag': 'Receiving lag',
  'pick-inventory-lag': 'Pick-inventory lag',
  'repeated-shorts': 'Repeated shorts',
  'negative-available': 'Negative available',
  'velocity-anomaly': 'Velocity anomaly',
  'ai-note-backlog': 'AI-note backlog',
  'variant-mismapping': 'Variant mismapping',
  'cost-coverage-gap': 'Cost-coverage gap',
  'cycle-count-overdue': 'Cycle-count overdue',
  'pre-fulfillment-shortage': 'Pre-fulfillment shortage',
};
