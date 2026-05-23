'use client';

/**
 * Inline SVG sparkline. Same math as the briefing email's sparkline but
 * scoped to the dashboard's tone palette.
 */

import type { ReactElement } from 'react';

const TONE_STROKE: Record<'good' | 'caution' | 'urgent' | 'neutral', string> = {
  good: '#15803d',
  caution: '#d97706',
  urgent: '#dc2626',
  neutral: '#374151',
};

export interface SparklineProps {
  values: number[];
  tone: 'good' | 'caution' | 'urgent' | 'neutral';
}

export function Sparkline({ values, tone }: SparklineProps): ReactElement | null {
  if (!values.length) return null;
  const W = 200;
  const H = 36;
  const PAD = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const xs = values.map((_, i) => PAD + (i * (W - 2 * PAD)) / (values.length - 1 || 1));
  const ys = values.map((v) => H - PAD - ((v - min) / range) * (H - 2 * PAD));
  const points = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const lastX = xs[xs.length - 1];
  const lastY = ys[ys.length - 1];
  const stroke = TONE_STROKE[tone];
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="2.4" fill={stroke} />
    </svg>
  );
}
