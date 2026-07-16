'use client';

import { ReactElement, useMemo, useState } from 'react';
import type { VariantRow } from './ExperimentResultCard';
import type { TrendPoint } from '@/lib/analytics/experiment-transform';

/**
 * Compact charts for one experiment in the analytics scoreboard.
 *
 * Colors: control is deliberately NEUTRAL gray (#6b7280) — it's the baseline,
 * not a competing identity — and the challenger carries brand-blue (#0B74B8).
 * CVD separation ΔE≈32 (validated); identity is never color-alone (direct
 * labels on line ends + the counts below every bar).
 */
const CONTROL_COLOR = '#6b7280';
const VARIANT_COLOR = '#0B74B8';

export function variantColor(isControl: boolean): string {
  return isControl ? CONTROL_COLOR : VARIANT_COLOR;
}

const W = 320;
const H = 96;
const PAD = { top: 8, right: 64, bottom: 16, left: 30 };

interface TrendProps {
  variants: VariantRow[];
  trends: Record<string, TrendPoint[]>;
}

/**
 * Cumulative CTR over time, one line per variant. Cumulative — not daily —
 * because daily rates at this traffic are noise; what an operator can read is
 * the two lines settling apart (or together) as the sample grows.
 */
export function CtrTrendChart({ variants, trends }: TrendProps): ReactElement {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const series = useMemo(
    () =>
      variants
        .map((v) => ({ variant: v, points: trends[v.id] ?? [] }))
        .filter((s) => s.points.length > 0),
    [variants, trends]
  );
  const nDays = series[0]?.points.length ?? 0;

  if (nDays < 2) {
    return (
      <div className="flex h-full min-h-[96px] items-center justify-center rounded-lg border border-dashed border-gray-200 px-3 text-center text-sm text-gray-400">
        CTR trend appears after a couple of days of data
      </div>
    );
  }

  const maxRate = Math.max(5, ...series.flatMap((s) => s.points.map((p) => p.cumRate)));
  const x = (i: number): number =>
    PAD.left + (i / Math.max(nDays - 1, 1)) * (W - PAD.left - PAD.right);
  const y = (rate: number): number =>
    PAD.top + (1 - rate / maxRate) * (H - PAD.top - PAD.bottom);

  const gridRates = [0, maxRate / 2, maxRate];
  const hover = hoverIdx != null ? Math.min(hoverIdx, nDays - 1) : null;

  return (
    <div className="relative h-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full"
        role="img"
        aria-label="Cumulative click-through rate over time per variant"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const frac = (px - PAD.left) / (W - PAD.left - PAD.right);
          setHoverIdx(Math.round(Math.min(1, Math.max(0, frac)) * (nDays - 1)));
        }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {gridRates.map((r) => (
          <g key={r}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(r)} y2={y(r)} stroke="#eef0f3" strokeWidth={1} />
            <text x={PAD.left - 4} y={y(r) + 3} textAnchor="end" fontSize={8} fill="#9aa3af">
              {r.toFixed(0)}%
            </text>
          </g>
        ))}

        {hover != null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="#c8cdd4" strokeWidth={1} />
        )}

        {series.map(({ variant, points }) => {
          const color = variantColor(variant.isControl);
          const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.cumRate)}`).join(' ');
          const last = points[points.length - 1];
          return (
            <g key={variant.id}>
              <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
              {hover != null && points[hover] && (
                <circle cx={x(hover)} cy={y(points[hover].cumRate)} r={3} fill={color} stroke="#fff" strokeWidth={1.5} />
              )}
              {/* Direct end label — identity is never color-alone */}
              <text x={W - PAD.right + 5} y={y(last.cumRate) + 3} fontSize={8.5} fill="#4b5563">
                {variant.name} {last.cumRate.toFixed(1)}%
              </text>
            </g>
          );
        })}
        <text x={PAD.left} y={H - 4} fontSize={8} fill="#9aa3af">
          {series[0].points[0].date.slice(5)}
        </text>
        <text x={W - PAD.right} y={H - 4} textAnchor="end" fontSize={8} fill="#9aa3af">
          {series[0].points[nDays - 1].date.slice(5)}
        </text>
      </svg>

      {hover != null && series[0]?.points[hover] && (
        <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm">
          <span className="font-medium">{series[0].points[hover].date}</span>
          {series.map(({ variant, points }) => (
            <span key={variant.id} className="ml-2 whitespace-nowrap">
              <span
                className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                style={{ background: variantColor(variant.isControl) }}
              />
              {points[hover].cumRate.toFixed(1)}% ({points[hover].cumClicks}/{points[hover].cumExposures})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface CountsProps {
  variants: VariantRow[];
  goalIsClick: boolean;
}

/**
 * Current counts as part-to-whole bars: the light track is visitors, the
 * solid fill is the subset who clicked — so length compares sample sizes
 * across variants while the fill ratio shows the rate, on one shared scale.
 */
export function CountsBars({ variants, goalIsClick }: CountsProps): ReactElement {
  const maxVisitors = Math.max(1, ...variants.map((v) => v.impressions));
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      {variants.map((v) => {
        const successes = goalIsClick ? v.clicks : v.conversions;
        const color = variantColor(v.isControl);
        const trackPct = (v.impressions / maxVisitors) * 100;
        const fillPct = v.impressions > 0 ? (successes / v.impressions) * 100 : 0;
        return (
          <div key={v.id}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-gray-700">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: color }} />
                {v.name}
              </span>
              <span className="whitespace-nowrap text-gray-500 tabular-nums">
                {successes.toLocaleString()} {goalIsClick ? 'clicks' : 'orders'} / {v.impressions.toLocaleString()} visitors
              </span>
            </div>
            <div className="h-3.5 rounded" style={{ width: `${trackPct}%`, background: `${color}26`, minWidth: 24 }}>
              <div className="h-full rounded" style={{ width: `${fillPct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
