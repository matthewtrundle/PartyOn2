/**
 * Weekly briefing payload builder for the Finance Director.
 *
 * Pulls the most recent snapshot, 30-day P&L history, active recommendations,
 * QB / Plaid connection state, and key accruals — shapes them into a
 * single object the markdown renderer + email template consume.
 */

import { prisma } from '@/lib/database/client';
import type { PlSnapshotPayload } from './pl-calculation';

export interface FinanceBriefingStat {
  label: string;
  value: string;
  sub?: string;
  delta?: { pct: number; direction: 'up' | 'down' | 'flat' };
}

export interface FinanceBriefingRec {
  id: string;
  signalKind: string;
  severity: string;
  title: string;
  /** First evidence line, summarized. */
  summary?: string;
  href?: string;
}

export interface FinanceBriefingPayload {
  weekLabel: string; // 2026-W24
  year: number;
  weekNumber: number;
  generatedAtIso: string;
  snapshotDate: string;
  stats: FinanceBriefingStat[];
  urgentRecs: FinanceBriefingRec[];
  highRecs: FinanceBriefingRec[];
  normalRecCount: number;
  qbConnected: boolean;
  qbCompanyName: string | null;
  plaidConnected: boolean;
  plaidItemCount: number;
  unmatchedBankTxnCount: number;
  unmatchedStripePayoutCount: number;
  pendingJournalCount: number;
  failedJournalCount: number;
  dashboardUrl: string;
  queueUrl: string;
}

function isoWeek(date: Date): { year: number; week: number; label: string } {
  // ISO week per RFC. Mirror src/lib/operations/briefing-payload.ts behavior.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return {
    year: d.getUTCFullYear(),
    week,
    label: `${d.getUTCFullYear()}-W${week.toString().padStart(2, '0')}`,
  };
}

function fmtCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function recSummary(rec: { evidence: unknown }): string | undefined {
  if (!Array.isArray(rec.evidence) || rec.evidence.length === 0) return undefined;
  const first = rec.evidence[0] as { metricName?: string; metricValue?: string | number };
  if (first.metricName && first.metricValue !== undefined) {
    return `${first.metricName}: ${first.metricValue}`;
  }
  return undefined;
}

function navHref(actionPayload: unknown): string | undefined {
  if (!actionPayload || typeof actionPayload !== 'object') return undefined;
  const p = actionPayload as { kind?: string; params?: { href?: string } };
  if (p.kind === 'navigate' && p.params?.href) return p.params.href;
  return undefined;
}

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://partyondelivery.com';

export async function buildFinanceBriefingPayload(
  now: Date = new Date()
): Promise<FinanceBriefingPayload> {
  const { year, week, label } = isoWeek(now);

  const [
    latestSnapshot,
    priorWeekSnapshots,
    activeRecs,
    intuit,
    plaidItems,
    unmatchedStripePayouts,
    unmatchedBankTxns,
    pendingJournals,
    failedJournals,
  ] = await Promise.all([
    prisma.financeSnapshot.findFirst({ orderBy: { snapshotDate: 'desc' } }),
    prisma.financeSnapshot.findMany({
      where: { snapshotDate: { gte: new Date(now.getTime() - 14 * 86_400_000) } },
      orderBy: { snapshotDate: 'desc' },
    }),
    prisma.financeRecommendation.findMany({
      where: { status: 'open' },
      orderBy: [{ severity: 'asc' }, { updatedAt: 'desc' }],
      take: 50,
    }),
    prisma.intuitOAuthState.findUnique({ where: { id: 'singleton' } }),
    prisma.plaidItem.findMany(),
    prisma.stripePayout.count({
      where: { status: 'paid', matchedPlaidTxId: null },
    }),
    prisma.plaidTransaction.count({
      where: { reconciledAt: null, pending: false },
    }),
    prisma.qbJournalEntry.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.qbJournalEntry.count({ where: { status: 'FAILED' } }),
  ]);

  const snapshotDate = latestSnapshot?.snapshotDate.toISOString().slice(0, 10) ?? 'n/a';
  const payload = (latestSnapshot?.payload ?? null) as unknown as PlSnapshotPayload | null;

  const stats: FinanceBriefingStat[] = [];
  if (payload) {
    stats.push({
      label: 'Gross revenue (yesterday)',
      value: fmtCents(payload.grossRevenueCents),
      sub: `${payload.paidOrderCount} orders`,
    });
    stats.push({
      label: 'Net revenue',
      value: fmtCents(payload.netRevenueCents),
      sub: 'after Stripe fees + refunds',
    });
    stats.push({
      label: 'Gross profit',
      value: fmtCents(payload.grossProfitCents),
      sub: `${payload.grossMarginPct.toFixed(1)}% margin · cost coverage ${payload.marginCoveragePct}%`,
    });
    if (payload.netIncomeCents !== null) {
      stats.push({
        label: 'Net income (est.)',
        value: fmtCents(payload.netIncomeCents),
        sub:
          payload.opexDailyAvgCents !== null
            ? `daily OpEx avg ${fmtCents(payload.opexDailyAvgCents)}`
            : 'QB OpEx not synced',
      });
    } else {
      stats.push({
        label: 'Net income',
        value: 'QB not synced',
        sub: 'connect QB to compute',
      });
    }

    // 7d revenue delta if we have history
    const prior = priorWeekSnapshots.find((s) => {
      const target = new Date(now.getTime() - 7 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      return s.snapshotDate.toISOString().slice(0, 10) === target;
    });
    if (prior) {
      const priorPayload = prior.payload as unknown as PlSnapshotPayload;
      if (priorPayload?.grossRevenueCents) {
        const diffPct =
          ((payload.grossRevenueCents - priorPayload.grossRevenueCents) /
            priorPayload.grossRevenueCents) *
          100;
        stats[0].delta = {
          pct: Math.abs(diffPct),
          direction: diffPct > 0.1 ? 'up' : diffPct < -0.1 ? 'down' : 'flat',
        };
      }
    }
  }

  const toBriefingRec = (r: (typeof activeRecs)[number]): FinanceBriefingRec => ({
    id: r.id,
    signalKind: r.signalKind,
    severity: r.severity,
    title: r.title,
    summary: recSummary({ evidence: r.evidence }),
    href: navHref(r.actionPayload),
  });

  return {
    weekLabel: label,
    year,
    weekNumber: week,
    generatedAtIso: now.toISOString(),
    snapshotDate,
    stats,
    urgentRecs: activeRecs.filter((r) => r.severity === 'urgent').map(toBriefingRec),
    highRecs: activeRecs.filter((r) => r.severity === 'high').map(toBriefingRec),
    normalRecCount: activeRecs.filter((r) => r.severity === 'normal').length,
    qbConnected: intuit !== null && intuit.lastError === null,
    qbCompanyName: null, // populated on demand by health endpoint; skipped here
    plaidConnected: plaidItems.some((p) => p.status === 'active'),
    plaidItemCount: plaidItems.length,
    unmatchedBankTxnCount: unmatchedBankTxns,
    unmatchedStripePayoutCount: unmatchedStripePayouts,
    pendingJournalCount: pendingJournals,
    failedJournalCount: failedJournals,
    dashboardUrl: `${BASE_URL}/admin/finance`,
    queueUrl: `${BASE_URL}/admin/recommendations?domain=finance`,
  };
}
