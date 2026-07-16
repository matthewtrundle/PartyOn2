'use client';

import { ReactElement, useState } from 'react';
import CreateHeroTestModal from './CreateHeroTestModal';
import { CtrTrendChart, CountsBars } from './ExperimentCharts';
import type { Experiment, VariantRow } from './ExperimentResultCard';
import { experimentPathsFor, type LandingPageDef } from '@/lib/analytics/landing-pages';

interface Props {
  def: LandingPageDef;
  experiments: Experiment[];
  loading: boolean;
  reload: () => Promise<void>;
}

const VERDICT_STYLES: Record<string, string> = {
  winner: 'border-green-300 bg-green-50 text-green-800',
  'no-difference': 'border-blue-200 bg-blue-50 text-blue-800',
  collecting: 'border-gray-200 bg-gray-50 text-gray-700',
  underpowered: 'border-amber-200 bg-amber-50 text-amber-800',
  'no-traffic': 'border-amber-200 bg-amber-50 text-amber-800',
};

function goalRate(v: VariantRow, goalIsClick: boolean): number {
  return goalIsClick ? v.clickRate : v.conversionRate;
}

/** One live experiment as a compact scoreboard row set. */
function ExperimentScore({
  exp,
  showPath,
  onStart,
  starting,
}: {
  exp: Experiment;
  showPath: boolean;
  onStart: (id: string) => void;
  starting: boolean;
}): ReactElement {
  const goalIsClick = exp.goalMetric === 'cta_click' || exp.goalMetric === 'scroll_depth';
  const control = exp.variants.find((v) => v.isControl);
  const controlRate = control ? goalRate(control, goalIsClick) : 0;
  const maxRate = Math.max(1e-9, ...exp.variants.map((v) => goalRate(v, goalIsClick)));

  if (exp.status === 'DRAFT') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 px-4 py-3">
        <div className="min-w-0">
          <span className="text-sm font-medium text-gray-900">{exp.name}</span>
          {showPath && <span className="ml-2 text-sm text-gray-500">{exp.page}</span>}
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">DRAFT</span>
        </div>
        <button
          type="button"
          className="btn-primary text-sm shrink-0 disabled:opacity-50"
          disabled={starting}
          onClick={() => onStart(exp.id)}
        >
          {starting ? 'Starting…' : 'Start test'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-gray-900">{exp.name}</span>
        {showPath && <span className="text-sm text-gray-500">{exp.page}</span>}
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            exp.status === 'RUNNING' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {exp.status}
        </span>
        <span className="text-sm text-gray-500">
          day {exp.daysRunning} · goal: {goalIsClick ? 'CTA clicks' : 'purchases'}
        </span>
      </div>

      {/* Variant rows: visitors → clicks → CTR (+CI) → lift */}
      <div className="space-y-2">
        {exp.variants.map((v) => {
          const rate = goalRate(v, goalIsClick);
          const successes = goalIsClick ? v.clicks : v.conversions;
          const lift = !v.isControl && controlRate > 0 ? ((rate - controlRate) / controlRate) * 100 : null;
          const isTrending = exp.decision?.trendingVariantId === v.id;
          const isWinner = exp.decision?.verdict === 'winner' && exp.significance.winner?.id === v.id;
          return (
            <div key={v.id} className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-12 sm:col-span-3 truncate text-sm text-gray-900">
                {v.name}
                {v.isControl && <span className="text-gray-400"> · control</span>}
                {isWinner && <span className="ml-1 text-xs font-semibold text-green-700">★ WINNER</span>}
                {!isWinner && isTrending && <span className="ml-1 text-xs font-semibold text-blue-700">trending</span>}
              </div>
              <div className="col-span-4 sm:col-span-2 text-sm text-gray-600 tabular-nums">
                {v.impressions.toLocaleString()} <span className="text-gray-400">visitors</span>
              </div>
              <div className="col-span-3 sm:col-span-2 text-sm text-gray-600 tabular-nums">
                {successes.toLocaleString()} <span className="text-gray-400">{goalIsClick ? 'clicks' : 'orders'}</span>
              </div>
              <div className="col-span-5 sm:col-span-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                    <div
                      className={`h-full rounded ${v.isControl ? 'bg-gray-400' : 'bg-brand-blue'}`}
                      style={{ width: `${Math.min(100, (rate / maxRate) * 100)}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-sm font-semibold text-gray-900 tabular-nums">
                    {rate.toFixed(1)}%
                    {v.goalRateCi && v.impressions > 0 && (
                      <span className="block text-xs font-normal text-gray-400">
                        {v.goalRateCi.lo.toFixed(1)}–{v.goalRateCi.hi.toFixed(1)}%
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div className="col-span-12 sm:col-span-2 text-right text-sm tabular-nums">
                {lift != null ? (
                  <span className={lift >= 0 ? 'text-green-700' : 'text-red-600'}>
                    {lift >= 0 ? '+' : ''}
                    {lift.toFixed(0)}% vs control
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts: cumulative CTR over time + current counts (event-based
          trend is directional; the decision numbers stay counter-based) */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-h-[104px]">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            {goalIsClick ? 'CTR' : 'Conversion'} over time (cumulative)
          </div>
          <CtrTrendChart variants={exp.variants} trends={exp.trends ?? {}} />
        </div>
        <div className="min-h-[104px]">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            Current counts
          </div>
          <CountsBars variants={exp.variants} goalIsClick={goalIsClick} />
        </div>
      </div>

      {/* Verdict: confidence + when we can make the call */}
      {exp.decision && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${VERDICT_STYLES[exp.decision.verdict] ?? VERDICT_STYLES.collecting}`}
        >
          {exp.decision.message}
          {exp.decision.verdict === 'collecting' && (
            <span className="text-gray-500">
              {' '}
              ({exp.decision.minVariantImpressions.toLocaleString()} of{' '}
              {exp.decision.requiredPerVariant.toLocaleString()} visitors per variant at{' '}
              {Math.round(exp.decision.confidenceLevel * 100)}% confidence)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Top-of-page experiment scoreboard — the first thing on each landing page's
 * analytics tab. Per variant: visitors, CTA clicks, CTR with its likely range
 * (Wilson 95% CI), lift vs control; plus the server's verdict line with the
 * projected "when can we call it" date. Management (pause/conclude/copy
 * preview) stays in the A/B tests panel below.
 */
export default function ExperimentSummaryBanner({ def, experiments, loading, reload }: Props): ReactElement {
  const [showCreate, setShowCreate] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  const active = experiments.filter((e) => e.status !== 'COMPLETED');
  const pathOptions = experimentPathsFor(def);
  const showPath = pathOptions.length > 1;

  async function startTest(id: string): Promise<void> {
    setStartingId(id);
    try {
      await fetch(`/api/admin/experiments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RUNNING' }),
      });
      await reload();
    } finally {
      setStartingId(null);
    }
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Hero A/B test</h2>
        {active.length === 0 && !loading && (
          <button type="button" className="btn-primary text-sm" onClick={() => setShowCreate(true)}>
            + New hero test
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded bg-gray-100" />
      ) : active.length === 0 ? (
        <p className="py-2 text-sm text-gray-500">
          No hero test on this page yet — create one to start measuring which headline converts.
        </p>
      ) : (
        <div className="space-y-3">
          {active.map((exp) => (
            <ExperimentScore
              key={exp.id}
              exp={exp}
              showPath={showPath}
              onStart={startTest}
              starting={startingId === exp.id}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateHeroTestModal
          canonicalPath={def.canonicalPath}
          pathOptions={pathOptions}
          elementId={def.defaultExperimentElementId}
          pageLabel={def.displayName}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
