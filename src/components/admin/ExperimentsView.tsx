'use client';

/**
 * Brian's Stuff → Experiments & Funnels tab.
 *
 * Hits /api/admin/experiments/funnel and renders:
 *   - The default conversion funnel (landing → checkout → paid)
 *     with absolute counts + drop-off % between adjacent steps
 *   - One card per active experiment with per-variant conversion rate,
 *     lift vs. control, p-value, and a winner call-out when significant
 *
 * Refreshes on filter change (page selector + lookback window). Numbers
 * deliberately rounded for readability — raw counts available in the
 * JSON response if you DevTools the API.
 */
import { useEffect, useMemo, useState } from 'react';
import { STEP_LABELS } from '@/lib/experiments/funnelSteps';

type VariantStats = {
  variant: string;
  label: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
  byStep: Record<string, number>;
};

type ExperimentReport = {
  key: string;
  label: string;
  hypothesis: string;
  primaryMetric: string;
  pages: string[];
  status: string;
  variants: VariantStats[];
  significance: {
    winner: { id: string; name: string; confidence: number | null } | null;
    hasEnoughData: boolean;
    variants: Array<{
      id: string;
      name: string;
      conversionRate: number;
      liftPct: number | null;
      pValue: number | null;
      confidence: number | null;
    }>;
  };
};

type Report = {
  ok: boolean;
  window: { sinceDays: number; since: string; until: string };
  page: string | null;
  steps: Array<{ step: string; count: number; sessions: number }>;
  experiments: ExperimentReport[];
};

const PAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All landing pages' },
  { value: '/austin-bachelor-party-delivery', label: 'Bachelor' },
  { value: '/austin-bachelorette-party-delivery', label: 'Bachelorette' },
  { value: '/austin-corporate-event-delivery', label: 'Corporate' },
  { value: '/austin-wedding-weekend-delivery', label: 'Wedding' },
  { value: '/', label: 'Homepage' },
  { value: '/flyer', label: 'Flyer' },
];

export default function ExperimentsView() {
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('');
  const [days, setDays] = useState(14);

  useEffect(() => {
    setLoading(true);
    const url = new URL('/api/admin/experiments/funnel', window.location.origin);
    if (page) url.searchParams.set('page', page);
    url.searchParams.set('sinceDays', String(days));
    fetch(url.toString(), { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((j: Report) => setData(j))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, days]);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="rounded-md border border-indigo-300 bg-indigo-50 p-5">
        <h2 className="text-xl font-bold text-indigo-900 tracking-wide">
          🧪 Experiments &amp; Funnels
        </h2>
        <p className="text-sm text-indigo-900 mt-2 leading-relaxed">
          Live A/B tests across the landing pages + step-by-step conversion
          funnel. Every funnel step fires a LeadEvent tagged with the
          experiment key + variant — significance is recomputed on every
          page load.
        </p>
        <p className="text-xs text-indigo-800 mt-2 italic">
          Add or pause experiments in <code>src/lib/experiments/registry.ts</code>.
          Steps live in <code>src/lib/experiments/funnelSteps.ts</code>.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-xs font-bold tracking-widest text-gray-500 flex items-center gap-2">
          PAGE
          <select
            value={page}
            onChange={(e) => setPage(e.target.value)}
            className="px-2 py-1.5 rounded-md border border-gray-200 bg-white text-sm"
          >
            {PAGE_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold tracking-widest text-gray-500 flex items-center gap-2">
          LOOKBACK
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-2 py-1.5 rounded-md border border-gray-200 bg-white text-sm"
          >
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </label>
        {loading && (
          <span className="text-xs text-gray-500 italic">refreshing…</span>
        )}
      </div>

      {/* Default funnel */}
      <section className="bg-white border border-gray-200 rounded-md p-5">
        <h3 className="text-lg font-bold tracking-wide text-gray-900 mb-3">
          Default conversion funnel
        </h3>
        {data && data.steps.length > 0 ? (
          <FunnelChart steps={data.steps} />
        ) : (
          <p className="text-sm text-gray-500 italic">
            {loading ? 'Loading…' : 'No funnel events captured yet.'}
          </p>
        )}
      </section>

      {/* Experiments */}
      {data?.experiments.map((exp) => (
        <ExperimentCard key={exp.key} exp={exp} />
      ))}

      {/* Empty state */}
      {data && data.experiments.length === 0 && (
        <section className="bg-white border border-gray-200 rounded-md p-5 text-sm text-gray-500 italic">
          No experiments configured. Add one to{' '}
          <code>src/lib/experiments/registry.ts</code>.
        </section>
      )}

      {/* How to add */}
      <Section title="Add a new experiment in 3 minutes">
        <ol className="list-decimal pl-6 space-y-1 text-sm text-gray-700">
          <li>
            Open <code>src/lib/experiments/registry.ts</code> and push a new
            entry into <code>EXPERIMENTS</code>. Pick a stable <code>key</code>{' '}
            — never change it once the test is live.
          </li>
          <li>
            Set <code>status: &apos;running&apos;</code>, list the pages, and
            add 2+ variants. First variant is treated as control.
          </li>
          <li>
            In the page/component you&apos;re testing, call{' '}
            <code>useVariant(&apos;your-key&apos;, [&apos;control&apos;, &apos;b&apos;])</code>{' '}
            and branch on the returned variant.
          </li>
          <li>
            Fire <code>trackFunnelStep</code> events at the steps you care
            about so the funnel + significance numbers populate.
          </li>
        </ol>
      </Section>
    </div>
  );
}

function FunnelChart({
  steps,
}: {
  steps: Array<{ step: string; count: number; sessions: number }>;
}) {
  const max = useMemo(
    () => Math.max(...steps.map((s) => s.sessions), 1),
    [steps],
  );

  return (
    <div className="space-y-2">
      {steps.map((row, i) => {
        const pct = (row.sessions / max) * 100;
        const prev = i > 0 ? steps[i - 1].sessions : null;
        const dropoff =
          prev && prev > 0
            ? Math.round(((prev - row.sessions) / prev) * 1000) / 10
            : null;
        return (
          <div key={row.step}>
            <div className="flex items-baseline justify-between text-xs mb-1">
              <span className="font-bold text-gray-800">
                {STEP_LABELS[row.step as keyof typeof STEP_LABELS] ?? row.step}
              </span>
              <span className="text-gray-600">
                <strong>{row.sessions.toLocaleString()}</strong> sessions
                {prev !== null && dropoff !== null && (
                  <span
                    className="ml-2"
                    style={{ color: dropoff > 50 ? '#B91C1C' : '#6B7280' }}
                  >
                    {dropoff > 0 ? `−${dropoff}%` : `${dropoff}%`}
                  </span>
                )}
              </span>
            </div>
            <div className="h-3 rounded-md bg-gray-100 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background:
                    'linear-gradient(90deg, #0B74B8 0%, #0A1F33 100%)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExperimentCard({ exp }: { exp: ExperimentReport }) {
  const winner = exp.significance?.winner;
  return (
    <section className="bg-white border border-gray-200 rounded-md p-5">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-lg font-bold tracking-wide text-gray-900">
            {exp.label}
          </h3>
          <div className="text-xs text-gray-500 mt-0.5">
            id: <code>{exp.key}</code> · pages: <code>{exp.pages.join(', ')}</code>
          </div>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest"
          style={{
            background: exp.status === 'running' ? '#DCFCE7' : '#F3F4F6',
            color: exp.status === 'running' ? '#166534' : '#374151',
          }}
        >
          {exp.status}
        </span>
      </div>
      <p className="text-sm text-gray-700 italic mb-3">{exp.hypothesis}</p>

      {winner ? (
        <div
          className="rounded-md p-2.5 mb-3 text-sm font-bold"
          style={{ background: '#DCFCE7', color: '#166534' }}
        >
          🏆 Winner: <strong>{winner.name}</strong>
          {typeof winner.confidence === 'number' && (
            <> ({Math.round(winner.confidence * 1000) / 10}% confidence)</>
          )}
        </div>
      ) : (
        <div
          className="rounded-md p-2.5 mb-3 text-xs"
          style={{ background: '#FEF3C7', color: '#92400E' }}
        >
          {exp.significance?.hasEnoughData
            ? 'No significant difference yet — keep running.'
            : 'Collecting data — need ~100 sessions per variant before a call.'}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-gray-500">
            <tr>
              <th className="text-left py-1">Variant</th>
              <th className="text-right py-1">Sessions</th>
              <th className="text-right py-1">Conversions</th>
              <th className="text-right py-1">Rate</th>
              <th className="text-right py-1">Lift</th>
              <th className="text-right py-1">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {exp.variants.map((v, i) => {
              const sig = exp.significance?.variants.find((s) => s.id === v.variant);
              return (
                <tr key={v.variant} className="border-t border-gray-100">
                  <td className="py-1.5">
                    {i === 0 && (
                      <span className="text-[10px] font-bold text-gray-500 mr-1">
                        CTRL
                      </span>
                    )}
                    {v.label}
                  </td>
                  <td className="text-right">{v.sessions.toLocaleString()}</td>
                  <td className="text-right">{v.conversions.toLocaleString()}</td>
                  <td className="text-right font-bold">
                    {(v.conversionRate * 100).toFixed(2)}%
                  </td>
                  <td
                    className="text-right"
                    style={{
                      color:
                        sig?.liftPct == null
                          ? '#6B7280'
                          : sig.liftPct > 0
                            ? '#166534'
                            : sig.liftPct < 0
                              ? '#B91C1C'
                              : '#6B7280',
                    }}
                  >
                    {sig?.liftPct == null
                      ? '—'
                      : `${sig.liftPct > 0 ? '+' : ''}${sig.liftPct.toFixed(1)}%`}
                  </td>
                  <td className="text-right text-gray-600">
                    {sig?.confidence == null
                      ? '—'
                      : `${(sig.confidence * 100).toFixed(1)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-md p-5">
      <h2 className="text-lg font-bold tracking-wide text-gray-900 mb-3">
        {title}
      </h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}
