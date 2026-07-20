'use client';

import { ReactElement } from 'react';
import Link from 'next/link';

export interface HeroContent {
  eyebrow?: string;
  headline?: string;
  headlineAccent?: string;
  subhead?: string;
  ctaText?: string;
}
export interface VariantRow {
  id: string;
  name: string;
  isControl: boolean;
  weight: number;
  impressions: number;
  clicks: number;
  conversions: number;
  clickRate: number;
  conversionRate: number;
  /** Wilson 95% CI on the goal rate, percent units (matches clickRate). */
  goalRateCi?: { lo: number; hi: number };
  content: HeroContent | null;
}
export interface SigVariant {
  id: string;
  name?: string;
  confidence: number | null;
  liftPct: number | null;
  pValue: number | null;
}
/** Mirrors SignificanceResult from computeSignificance — winner is the full
 * variant object (a previous version of this file typed it as a string id,
 * which made the winner badge silently never match). */
export interface Significance {
  variants: SigVariant[];
  winner: SigVariant | null;
  hasEnoughData: boolean;
}
export interface ExperimentDecision {
  verdict: 'winner' | 'no-difference' | 'collecting' | 'underpowered' | 'no-traffic';
  message: string;
  requiredPerVariant: number;
  minVariantImpressions: number;
  remainingDays: number | null;
  projectedDecisionDate: string | null;
  dailyExposurePerVariant: number;
  reachable: boolean;
  trendingVariantId: string | null;
  confidenceLevel: number;
}
export interface TrendPoint {
  date: string;
  exposures: number;
  clicks: number;
  cumExposures: number;
  cumClicks: number;
  cumRate: number;
}
export interface Experiment {
  id: string;
  name: string;
  /** The hypothesis/angle line, shown on draft review. */
  description?: string | null;
  /** Route this test runs on (a tab can span several hero routes). */
  page: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  goalMetric: string;
  winningVariant: string | null;
  winnerReason: string | null;
  daysRunning: number;
  significance: Significance;
  /** Absent when the server's decision math degraded for this row. */
  decision?: ExperimentDecision;
  /** Per-variant cumulative CTR trend (event-based, directional). */
  trends?: Record<string, TrendPoint[]>;
  variants: VariantRow[];
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  RUNNING: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
};

export interface ConcludeControls {
  active: boolean;
  winnerSel: string;
  reason: string;
  setWinner: (id: string) => void;
  setReason: (s: string) => void;
  start: () => void;
  cancel: () => void;
  save: () => void;
}

interface Props {
  exp: Experiment;
  canonicalPath: string;
  onStatus: (status: 'RUNNING' | 'PAUSED') => void;
  onDelete: () => void;
  conclude: ConcludeControls;
}

function rateOf(v: VariantRow, goalIsClick: boolean): number {
  return goalIsClick ? v.clickRate : v.conversionRate;
}

function VariantCard({
  v,
  goalIsClick,
  badge,
  canonicalPath,
}: {
  v: VariantRow;
  goalIsClick: boolean;
  badge: 'winner' | 'ahead' | null;
  canonicalPath: string;
}): ReactElement {
  return (
    <div className={`rounded-lg border p-4 ${badge === 'winner' ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">
          {v.name}{v.isControl && <span className="text-gray-400"> · control</span>}
        </span>
        {badge === 'winner' && <span className="text-xs font-semibold text-amber-600">★ WINNER</span>}
        {badge === 'ahead' && <span className="text-xs font-semibold text-green-600">AHEAD</span>}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-4xl font-bold text-gray-900 leading-none">{rateOf(v, goalIsClick).toFixed(1)}%</div>
          <div className="text-sm text-gray-500 mt-1">
            {goalIsClick ? 'click rate' : 'conversion rate'}
            {v.goalRateCi && v.impressions > 0 && (
              <span className="text-gray-400"> · likely {v.goalRateCi.lo.toFixed(1)}–{v.goalRateCi.hi.toFixed(1)}%</span>
            )}
          </div>
        </div>
        <div className="text-right text-sm text-gray-600">
          <div>{v.impressions.toLocaleString()} views</div>
          <div>{v.clicks.toLocaleString()} clicks</div>
          {!goalIsClick && <div>{v.conversions.toLocaleString()} conversions</div>}
        </div>
      </div>
      <div className="border-t border-gray-100 mt-3 pt-2 text-sm text-gray-600">
        copy: {v.content?.headline ? `“${v.content.headline}”` : <span className="text-gray-400">current page copy</span>}
      </div>
      <Link href={canonicalPath} target="_blank" className="text-brand-blue text-sm hover:underline inline-block mt-1">
        View landing page ↗
      </Link>
    </div>
  );
}

/** One running/concluded A/B test rendered as side-by-side variant cards + a confidence read-out. */
export default function ExperimentResultCard({ exp, canonicalPath, onStatus, onDelete, conclude }: Props): ReactElement {
  const goalIsClick = exp.goalMetric === 'cta_click' || exp.goalMetric === 'scroll_depth';
  const sorted = [...exp.variants].sort((a, b) => rateOf(b, goalIsClick) - rateOf(a, goalIsClick));
  const leaderId = sorted[0]?.id ?? null;

  function badgeFor(v: VariantRow): 'winner' | 'ahead' | null {
    const callable = exp.decision?.verdict === 'winner';
    if ((callable && exp.significance.winner?.id === v.id) || exp.winningVariant === v.id) return 'winner';
    if (exp.winningVariant == null && !callable && v.id === leaderId && exp.status !== 'DRAFT') return 'ahead';
    return null;
  }

  // The decision message (verdict + CI + projected call date) is pre-baked
  // server-side in experiment-planning.ts — this card just renders it.
  let summary: string;
  if (exp.status === 'COMPLETED') {
    const w = exp.variants.find((v) => v.id === exp.winningVariant);
    summary = w ? `Concluded — winner: ${w.name}.` : 'Concluded.';
  } else {
    summary = exp.decision?.message ?? 'Stats temporarily unavailable for this test.';
  }
  const summaryIsWin = exp.decision?.verdict === 'winner';

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-gray-900">{exp.name}</div>
          <div className="text-xs text-gray-500">goal: {exp.goalMetric}{exp.status === 'RUNNING' ? ` · day ${exp.daysRunning}` : ''}</div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[exp.status]}`}>{exp.status}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {exp.variants.map((v) => (
          <VariantCard key={v.id} v={v} goalIsClick={goalIsClick} badge={badgeFor(v)} canonicalPath={canonicalPath} />
        ))}
      </div>

      <p className={`mt-3 text-sm ${summaryIsWin ? 'text-green-700' : 'text-gray-600'}`}>{summary}</p>
      {exp.status === 'COMPLETED' && exp.winnerReason && (
        <p className="mt-1 text-sm text-gray-600"><span className="font-medium">Why it won:</span> {exp.winnerReason}</p>
      )}

      {conclude.active ? (
        <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-2">
          <select className="input-premium" value={conclude.winnerSel} onChange={(e) => conclude.setWinner(e.target.value)}>
            {exp.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <input className="input-premium" placeholder="Why did it win? (one line — logged to Obsidian)"
            value={conclude.reason} onChange={(e) => conclude.setReason(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className="btn-primary text-sm" onClick={conclude.save}>Save winner &amp; log</button>
            <button type="button" className="btn-secondary text-sm" onClick={conclude.cancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {exp.status === 'DRAFT' && <button type="button" className="btn-primary text-sm" onClick={() => onStatus('RUNNING')}>Start</button>}
          {exp.status === 'RUNNING' && <button type="button" className="btn-secondary text-sm" onClick={() => onStatus('PAUSED')}>Pause</button>}
          {exp.status === 'PAUSED' && <button type="button" className="btn-primary text-sm" onClick={() => onStatus('RUNNING')}>Resume</button>}
          {(exp.status === 'RUNNING' || exp.status === 'PAUSED') && <button type="button" className="btn-secondary text-sm" onClick={conclude.start}>Conclude</button>}
          {exp.status !== 'RUNNING' && exp.status !== 'COMPLETED' && <button type="button" className="btn-ghost text-sm text-red-600" onClick={onDelete}>Delete</button>}
        </div>
      )}
    </div>
  );
}
