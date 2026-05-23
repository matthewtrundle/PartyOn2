/**
 * Operations Director — weekly briefing payload assembler.
 *
 * Pulls the latest OperationsSnapshot + recent history + active drift recs
 * + cycle-count list + dangling drafts. Mirrors marketing's
 * buildBriefingPayloadFromSnapshot in shape so the email template can be a
 * straight port of marketing-briefing's editorial dossier aesthetic.
 *
 * See docs/OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md §7 Phase 1D.
 */

import { prisma } from '@/lib/database/client';
import type { OperationsSnapshot, OperationsRecommendation } from '@prisma/client';
import type { OpsSeverity } from './types';

export type OpsBriefingTone = 'neutral' | 'good' | 'caution' | 'urgent';

export interface OpsBriefingStat {
  label: string;
  value: string;
  tone?: OpsBriefingTone;
  spark?: number[];
}

export interface OpsBriefingDriftEvent {
  id: string;
  title: string;
  severity: OpsSeverity;
  signalKind: string;
  ageHours: number;
}

export interface OpsBriefingCycleCount {
  title: string;
  unitsLast14d: number;
}

export interface OpsBriefingDanglingDraft {
  id: string;
  customerName: string;
  total: string;
  ageDays: number;
  status: string;
}

export interface OpsBriefingPayload {
  weekLabel: string;
  issueNumber: number;
  year: number;
  generatedDate: string;
  generatedAtIso: string;
  stats: OpsBriefingStat[];
  topUrgentRec: {
    title: string;
    signalKind: string;
    href: string;
  } | null;
  driftEvents: OpsBriefingDriftEvent[];
  cycleCounts: OpsBriefingCycleCount[];
  danglingDrafts: OpsBriefingDanglingDraft[];
  costCoveragePct: number;
  costCoverageSpark: number[];
  costCoverageGoalPct: number;
  receivingLagP50Hours: number | null;
  receivingLagP90Hours: number | null;
  whatsLacking: string[];
  links: {
    queueUrl: string;
    dashboardUrl: string;
  };
}

interface BuildInput {
  snapshot: OperationsSnapshot;
  weekLabel: string;
  issueNumber: number;
  year: number;
  generatedAt: Date;
  queueUrl: string;
  dashboardUrl: string;
}

const COST_COVERAGE_GOAL_PCT = 30;
const DANGLING_DRAFT_AGE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function severityRank(s: OpsSeverity): number {
  return s === 'urgent' ? 2 : s === 'high' ? 1 : 0;
}

function severityFrom(value: string): OpsSeverity {
  return value === 'urgent' || value === 'high' ? value : 'normal';
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatGeneratedDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });
}

export async function buildOperationsBriefingPayload(
  input: BuildInput
): Promise<OpsBriefingPayload> {
  const { snapshot, weekLabel, issueNumber, year, generatedAt, queueUrl, dashboardUrl } = input;
  const now = generatedAt;

  // Recent snapshots for sparklines (chronological, oldest → newest).
  const recentSnapshots = await prisma.operationsSnapshot.findMany({
    orderBy: { capturedAt: 'desc' },
    take: 8,
    select: {
      capturedAt: true,
      costCoveragePct: true,
      driftEventsTotal: true,
      urgentShortagesCount: true,
      inventoryAccuracyPct: true,
    },
  });
  const trend = recentSnapshots.slice().reverse();

  const costCoverageSpark = trend.map((s) => Math.round(s.costCoveragePct));
  const driftSpark = trend.map((s) => s.driftEventsTotal);
  const urgentSpark = trend.map((s) => s.urgentShortagesCount);
  const accuracySpark = trend
    .map((s) => (s.inventoryAccuracyPct == null ? null : Math.round(s.inventoryAccuracyPct)))
    .filter((v): v is number => v != null);

  // Active recs — sorted by severity then age for the body lists.
  const activeRecs = await prisma.operationsRecommendation.findMany({
    where: { status: { in: ['open', 'approved'] } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const sortedRecs = activeRecs.slice().sort((a, b) => {
    const sb = severityRank(severityFrom(b.severity)) - severityRank(severityFrom(a.severity));
    if (sb !== 0) return sb;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const topUrgent = sortedRecs.find((r) => severityFrom(r.severity) === 'urgent');
  const topUrgentRec = topUrgent
    ? {
        title: topUrgent.title,
        signalKind: topUrgent.signalKind,
        href: `${queueUrl}#rec-${topUrgent.id}`,
      }
    : null;

  const driftEvents: OpsBriefingDriftEvent[] = sortedRecs
    .filter((r) => severityFrom(r.severity) !== 'normal')
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      title: r.title,
      severity: severityFrom(r.severity),
      signalKind: r.signalKind,
      ageHours: Math.round((now.getTime() - r.createdAt.getTime()) / HOUR_MS),
    }));

  const cycleCounts = sortedRecs
    .filter((r) => r.signalKind === 'cycle-count-overdue')
    .slice(0, 8)
    .map((r) => ({
      title: r.title,
      unitsLast14d: extractMetric(r, 'units_14d'),
    }));

  const danglingDrafts = await loadDanglingDrafts(now);

  // Stat strip — four cards, mirrors marketing's layout.
  const accuracy = snapshot.inventoryAccuracyPct;
  const stats: OpsBriefingStat[] = [
    {
      label: 'Inventory Accuracy',
      value: accuracy == null ? '—' : `${Math.round(accuracy)}%`,
      tone:
        accuracy == null ? 'neutral' :
        accuracy >= 85 ? 'good' :
        accuracy >= 70 ? 'caution' : 'urgent',
      spark: accuracySpark.length >= 2 ? accuracySpark : undefined,
    },
    {
      label: 'Urgent Shortages',
      value: String(snapshot.urgentShortagesCount),
      tone: snapshot.urgentShortagesCount === 0 ? 'good' : snapshot.urgentShortagesCount >= 5 ? 'urgent' : 'caution',
      spark: urgentSpark.length >= 2 ? urgentSpark : undefined,
    },
    {
      label: 'Cost Coverage',
      value: `${Math.round(snapshot.costCoveragePct)}%`,
      tone:
        snapshot.costCoveragePct >= COST_COVERAGE_GOAL_PCT ? 'good' :
        snapshot.costCoveragePct >= 15 ? 'caution' : 'urgent',
      spark: costCoverageSpark.length >= 2 ? costCoverageSpark : undefined,
    },
    {
      label: 'Drift Events',
      value: String(snapshot.driftEventsTotal),
      tone: snapshot.driftEventsTotal === 0 ? 'good' : snapshot.driftEventsTotal >= 20 ? 'urgent' : 'caution',
      spark: driftSpark.length >= 2 ? driftSpark : undefined,
    },
  ];

  // Whats-lacking — surface known data gaps without fail-soft silence.
  const whatsLacking: string[] = [];
  if (accuracy == null) {
    whatsLacking.push('Inventory accuracy metric needs ≥1 cycle-count adjustment in the last 30d.');
  }
  if (snapshot.receivingLagP50Hours == null) {
    whatsLacking.push('Receiving lag percentiles need ≥2 APPLIED invoices in the last 30d.');
  }
  if (snapshot.costCoveragePct < COST_COVERAGE_GOAL_PCT) {
    whatsLacking.push(
      `Cost coverage at ${Math.round(snapshot.costCoveragePct)}% — Phase 1 goal is ${COST_COVERAGE_GOAL_PCT}%. Margin attribution stays approximate until then.`
    );
  }

  return {
    weekLabel,
    issueNumber,
    year,
    generatedDate: formatGeneratedDate(generatedAt),
    generatedAtIso: generatedAt.toISOString(),
    stats,
    topUrgentRec,
    driftEvents,
    cycleCounts,
    danglingDrafts,
    costCoveragePct: Math.round(snapshot.costCoveragePct),
    costCoverageSpark,
    costCoverageGoalPct: COST_COVERAGE_GOAL_PCT,
    receivingLagP50Hours: snapshot.receivingLagP50Hours,
    receivingLagP90Hours: snapshot.receivingLagP90Hours,
    whatsLacking,
    links: { queueUrl, dashboardUrl },
  };
}

function extractMetric(rec: OperationsRecommendation, name: string): number {
  const evidence = Array.isArray(rec.evidence) ? rec.evidence : [];
  for (const row of evidence) {
    if (row && typeof row === 'object' && 'metricName' in row) {
      const r = row as { metricName?: string; metricValue?: unknown };
      if (r.metricName === name && typeof r.metricValue === 'number') return r.metricValue;
      if (r.metricName === name && typeof r.metricValue === 'string') {
        const n = Number(r.metricValue);
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return 0;
}

async function loadDanglingDrafts(now: Date): Promise<OpsBriefingDanglingDraft[]> {
  const cutoff = new Date(now.getTime() - DANGLING_DRAFT_AGE_DAYS * DAY_MS);
  const drafts = await prisma.draftOrder.findMany({
    where: {
      status: { in: ['SENT', 'VIEWED'] },
      sentAt: { lt: cutoff, not: null },
    },
    orderBy: { sentAt: 'asc' },
    take: 8,
    select: {
      id: true,
      customerName: true,
      total: true,
      sentAt: true,
      status: true,
    },
  });
  return drafts.map((d) => ({
    id: d.id,
    customerName: d.customerName,
    total: fmtMoney(Number(d.total)),
    ageDays: d.sentAt
      ? Math.floor((now.getTime() - d.sentAt.getTime()) / DAY_MS)
      : 0,
    status: d.status,
  }));
}
