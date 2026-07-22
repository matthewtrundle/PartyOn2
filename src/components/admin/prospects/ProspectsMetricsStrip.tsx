'use client';

/**
 * Workbench metrics strip: today's sends vs cap + 7-day campaign stats.
 * Data from GET /api/v1/admin/partner-prospects/metrics.
 */

import type { ReactElement } from 'react';

export interface ProspectMetrics {
  today: { used: number; cap: number };
  week: { sent: number; opened: number; bounced: number; replied: number };
  queue: { researchPending: number; awaitingDraft: number; redoRequested: number };
}

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}

export default function ProspectsMetricsStrip({
  metrics,
}: {
  metrics: ProspectMetrics | null;
}): ReactElement | null {
  if (!metrics) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <Stat label="Sends today" value={`${metrics.today.used} / ${metrics.today.cap}`} />
      <Stat label="Sent (7d)" value={String(metrics.week.sent)} />
      <Stat label="Opened (7d)" value={String(metrics.week.opened)} />
      <Stat label="Replied (7d)" value={String(metrics.week.replied)} />
      <Stat label="Bounced (7d)" value={String(metrics.week.bounced)} />
    </div>
  );
}
