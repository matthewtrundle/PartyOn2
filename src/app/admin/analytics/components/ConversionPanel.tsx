'use client';

import { ReactElement } from 'react';
import MetricCard from '@/app/admin/dashboard/components/MetricCard';
import type { ConversionSummary, EngagementSummary } from '@/lib/analytics/landing-page-metrics';

interface ConversionPanelProps {
  conversion: ConversionSummary;
  engagement: EngagementSummary;
  loading?: boolean;
}

interface FunnelStep {
  label: string;
  value: number;
}

/** Horizontal funnel bars: sessions → CTA clicks → orders, scaled to the top step. */
function FunnelBars({ steps }: { steps: FunnelStep[] }): ReactElement {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        const drop = prev && prev > 0 ? 1 - s.value / prev : null;
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700">{s.label}</span>
              <span className="text-gray-900 font-medium">
                {s.value.toLocaleString()}
                {drop !== null && (
                  <span className="text-gray-400 font-normal ml-2">−{(drop * 100).toFixed(0)}%</span>
                )}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded">
              <div
                className="h-2 bg-brand-blue rounded"
                style={{ width: `${Math.max(2, (s.value / max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Conversion + revenue for a landing page. Orders/revenue come from
 * Order.landingPage (first-touch attribution — approximate); the visitor
 * denominator is GA4 unique visitors over the window.
 */
export default function ConversionPanel({
  conversion,
  engagement,
  loading = false,
}: ConversionPanelProps): ReactElement {
  const cvrPct = `${(conversion.conversionRate * 100).toFixed(2)}%`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Orders" value={conversion.orders} loading={loading} />
        <MetricCard title="Revenue" value={conversion.revenue} prefix="$" loading={loading} />
        <MetricCard title="Avg order" value={conversion.averageOrderValue} prefix="$" loading={loading} />
        <MetricCard title="Conv. rate" value={loading ? '—' : cvrPct} loading={loading} />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Conversion funnel</h3>
          <span className="text-xs text-gray-400">first-touch · approximate</span>
        </div>
        {loading ? (
          <div className="h-28 bg-gray-100 rounded animate-pulse" />
        ) : (
          <FunnelBars
            steps={[
              { label: 'Visitors (GA4)', value: conversion.sessions },
              { label: 'CTA clicks', value: engagement.ctaClicks },
              { label: 'Orders', value: conversion.orders },
            ]}
          />
        )}
        <p className="text-xs text-gray-400 mt-4">
          CVR = orders ÷ GA4 visitors. Attribution is first-touch via Order.landingPage and has
          known leaks — treat as a directional estimate, not an exact rate.
        </p>
      </div>
    </div>
  );
}
