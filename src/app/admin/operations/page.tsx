'use client';

/**
 * Operations Director — health dashboard.
 *
 * One-page view: latest snapshot stats, drift trend, drift by signal, top
 * urgent recs. Deep-links every actionable surface back to the unified
 * triage queue at /admin/recommendations?domain=operations.
 *
 * See docs/OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md §7 Phase 1D.
 */

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import type {
  DashboardData,
  SnapshotSummary,
} from '@/lib/operations/dashboard-data';
import { SIGNAL_LABELS } from '@/lib/operations/dashboard-data';
import type { SignalKind } from '@/lib/operations/types';
import { Sparkline } from './_components/sparkline';

type Tone = 'good' | 'caution' | 'urgent' | 'neutral';

interface StatDef {
  label: string;
  value: string;
  tone: Tone;
  spark: number[];
  hint?: string;
}

function tone(value: number | null, good: number, caution: number, lowerIsBetter = false): Tone {
  if (value == null) return 'neutral';
  if (lowerIsBetter) {
    if (value <= good) return 'good';
    if (value <= caution) return 'caution';
    return 'urgent';
  }
  if (value >= good) return 'good';
  if (value >= caution) return 'caution';
  return 'urgent';
}

function buildStats(d: DashboardData): StatDef[] {
  const s = d.latestSnapshot;
  const history = d.history;
  if (!s) return [];
  const accuracySpark = history.map((h) => h.inventoryAccuracyPct ?? 0);
  const coverageSpark = history.map((h) => h.costCoveragePct);
  const driftSpark = history.map((h) => h.driftEventsTotal);
  const urgentSpark = history.map((h) => h.urgentShortagesCount);
  return [
    {
      label: 'Inventory accuracy (30d)',
      value: s.inventoryAccuracyPct == null ? '—' : `${Math.round(s.inventoryAccuracyPct)}%`,
      tone: tone(s.inventoryAccuracyPct, 85, 70),
      spark: accuracySpark,
      hint: 'Counts within ±50 units of zero / total counts',
    },
    {
      label: 'Cost coverage',
      value: `${Math.round(s.costCoveragePct)}%`,
      tone: tone(s.costCoveragePct, 30, 15),
      spark: coverageSpark,
      hint: 'Variants with cost / variants sold (30d)',
    },
    {
      label: 'Drift events (active)',
      value: String(d.activeRecCounts.total),
      tone: d.activeRecCounts.total === 0 ? 'good' : d.activeRecCounts.total >= 20 ? 'urgent' : 'caution',
      spark: driftSpark,
      hint: 'Open + approved recs across all signals',
    },
    {
      label: 'Urgent shortages',
      value: String(s.urgentShortagesCount),
      tone: s.urgentShortagesCount === 0 ? 'good' : s.urgentShortagesCount >= 5 ? 'urgent' : 'caution',
      spark: urgentSpark,
      hint: 'PAID orders in next 14d with available < 0',
    },
  ];
}

const TONE_BG: Record<Tone, string> = {
  good: 'bg-green-50 border-green-200',
  caution: 'bg-amber-50 border-amber-200',
  urgent: 'bg-red-50 border-red-200',
  neutral: 'bg-gray-50 border-gray-200',
};
const TONE_TEXT: Record<Tone, string> = {
  good: 'text-green-700',
  caution: 'text-amber-700',
  urgent: 'text-red-700',
  neutral: 'text-gray-700',
};

export default function OperationsDashboardPage(): ReactElement {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/operations/snapshot');
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const stats = data ? buildStats(data) : [];

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/admin/dashboard" className="text-blue-600 text-sm hover:underline">← Admin</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Operations</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-heading tracking-[0.05em]">Operations health</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Inventory accuracy, drift events, cost coverage, and shortages — refreshed daily at 07:30 UTC.
            </p>
          </div>
          <Link
            href="/admin/recommendations?domain=operations"
            className="px-4 py-2 bg-brand-blue text-white rounded-lg font-medium hover:bg-blue-700 text-sm shadow-sm min-h-[44px] inline-flex items-center"
          >
            Open triage queue →
          </Link>
        </div>

        {loading && !data ? (
          <SkeletonGrid />
        ) : !data?.latestSnapshot ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            <StatGrid stats={stats} />
            <DriftBySignalCard data={data} />
            <TopUrgentCard data={data} />
            <FooterMeta s={data.latestSnapshot} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatGrid({ stats }: { stats: StatDef[] }): ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-xl border p-5 ${TONE_BG[s.tone]}`}>
          <div className="text-xs uppercase tracking-wider text-gray-500 font-medium">{s.label}</div>
          <div className={`mt-2 text-4xl font-bold ${TONE_TEXT[s.tone]} leading-none`}>{s.value}</div>
          {s.spark.length >= 2 && (
            <div className="mt-3">
              <Sparkline values={s.spark} tone={s.tone} />
            </div>
          )}
          {s.hint && <div className="mt-2 text-xs text-gray-600 leading-snug">{s.hint}</div>}
        </div>
      ))}
    </div>
  );
}

function DriftBySignalCard({ data }: { data: DashboardData }): ReactElement {
  const rows = data.activeRecCounts.bySignal;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Active drift by signal</h2>
        <div className="text-sm text-gray-500">
          {data.activeRecCounts.bySeverity.urgent} urgent · {data.activeRecCounts.bySeverity.high} high · {data.activeRecCounts.bySeverity.normal} normal
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No active drift events. The ledger is calm.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const label = SIGNAL_LABELS[r.signalKind as SignalKind] ?? r.signalKind;
            const widthPct = (r.count / max) * 100;
            return (
              <div key={r.signalKind} className="flex items-center gap-3">
                <div className="w-44 text-sm text-gray-700 shrink-0">{label}</div>
                <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                  <div className="h-full bg-brand-blue" style={{ width: `${widthPct}%` }} />
                </div>
                <div className="w-12 text-right text-sm font-mono text-gray-900">{r.count}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopUrgentCard({ data }: { data: DashboardData }): ReactElement {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Top urgent recommendations</h2>
      {data.topUrgent.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing urgent open right now.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {data.topUrgent.map((r) => (
            <li key={r.id} className="py-3 flex items-start gap-3">
              <span
                className={`inline-block text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${
                  r.severity === 'urgent'
                    ? 'bg-red-100 text-red-700'
                    : r.severity === 'high'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {r.severity}
              </span>
              <div className="flex-1">
                <div className="text-sm text-gray-900 font-medium">{r.title}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">{r.signalKind}</div>
              </div>
              <Link
                href={`/admin/recommendations?domain=operations`}
                className="text-sm text-brand-blue hover:underline shrink-0"
              >
                Open →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FooterMeta({ s }: { s: SnapshotSummary }): ReactElement {
  const lagBits: string[] = [];
  if (s.receivingLagP50Hours != null) lagBits.push(`p50 ${s.receivingLagP50Hours.toFixed(1)}h`);
  if (s.receivingLagP90Hours != null) lagBits.push(`p90 ${s.receivingLagP90Hours.toFixed(1)}h`);
  return (
    <div className="text-xs text-gray-500 text-center pt-2">
      Snapshot {new Date(s.capturedAt).toLocaleString()} ·
      Receiving lag: {lagBits.length ? lagBits.join(' · ') : 'not enough data yet'} ·
      Cycle counts completed last 7d: {s.cycleCountsCompletedLast7d}
    </div>
  );
}

function SkeletonGrid(): ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Loading dashboard">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
          <div className="h-9 w-24 bg-gray-200 rounded mb-3" />
          <div className="h-6 w-full bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState(): ReactElement {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <p className="text-gray-600 text-sm">No operations snapshot yet.</p>
      <p className="text-gray-400 text-xs mt-2">
        Run <code className="px-1 bg-gray-100 rounded font-mono">/api/cron/operations-snapshot</code> to populate.
      </p>
    </div>
  );
}
