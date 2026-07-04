'use client';

/**
 * ActiveTestsSummary Component
 * Quick-glance view of all active A/B tests grouped by page
 * Displayed at top of admin dashboard
 */

import { ReactElement } from 'react';
import Link from 'next/link';
import type { ExperimentsByPage, ExperimentResult } from '@/lib/analytics/types';

interface ActiveTestsSummaryProps {
  experimentsByPage: ExperimentsByPage[];
  loading?: boolean;
}

// Key pages to always show (even if no tests)
const KEY_PAGES = [
  { path: '/', name: 'Homepage' },
  { path: '/weddings', name: 'Weddings' },
  { path: '/order', name: 'Order' },
  { path: '/boat-parties', name: 'Boat Parties' },
  { path: '/bach-parties', name: 'Bach Parties' },
];

function getStatusIcon(status: string): string {
  switch (status) {
    case 'active':
      return '🟢';
    case 'paused':
      return '🟡';
    case 'completed':
      return '✅';
    default:
      return '⚪';
  }
}

function getUpliftDisplay(experiment: ExperimentResult): ReactElement | null {
  if (experiment.uplift === 0) return null;

  const isPositive = experiment.uplift > 0;
  return (
    <span
      className={`text-xs font-medium ${
        isPositive ? 'text-green-600' : 'text-red-600'
      }`}
    >
      {isPositive ? '+' : ''}
      {experiment.uplift}% ↑
    </span>
  );
}

function PageCard({
  page,
  experiments,
}: {
  page: { path: string; name: string };
  experiments: ExperimentResult[];
}): ReactElement {
  const hasTests = experiments.length > 0;

  return (
    <div
      className={`rounded-lg border p-4 ${
        hasTests
          ? 'border-amber-200 bg-amber-50'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="mb-2 text-sm font-medium text-gray-600">{page.path}</div>
      <div className="mb-1 font-semibold text-gray-900">{page.name}</div>

      {hasTests ? (
        <div className="space-y-2">
          {experiments.slice(0, 2).map((exp) => (
            <div key={exp.id} className="text-sm">
              <div className="flex items-center gap-1">
                <span>{getStatusIcon(exp.status)}</span>
                <span className="truncate font-medium text-gray-700">
                  {exp.name}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                <span>Day {exp.daysRunning}</span>
                {getUpliftDisplay(exp)}
              </div>
            </div>
          ))}
          {experiments.length > 2 && (
            <div className="text-xs text-gray-500">
              +{experiments.length - 2} more tests
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-400">No active tests</div>
      )}
    </div>
  );
}

function LoadingSkeleton(): ReactElement {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg bg-gray-100"
          />
        ))}
      </div>
    </div>
  );
}

export default function ActiveTestsSummary({
  experimentsByPage,
  loading = false,
}: ActiveTestsSummaryProps): ReactElement {
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Create a map for quick lookup
  const experimentMap = new Map<string, ExperimentResult[]>();
  for (const pageData of experimentsByPage) {
    experimentMap.set(pageData.page, pageData.activeExperiments);
  }

  // Count totals
  const totalActiveTests = experimentsByPage.reduce(
    (sum, p) => sum + p.activeExperiments.filter((e) => e.status === 'active').length,
    0
  );
  const pagesWithTests = experimentsByPage.filter((p) => p.hasActiveTests).length;

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧪</span>
          <h2 className="text-lg font-semibold text-gray-900">
            Active A/B Tests
          </h2>
        </div>
        <Link
          href="/admin/experiments"
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Manage Tests →
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {KEY_PAGES.map((page) => (
          <PageCard
            key={page.path}
            page={page}
            experiments={experimentMap.get(page.path) || []}
          />
        ))}
      </div>

      <div className="text-sm text-gray-500">
        Total: {totalActiveTests} active test{totalActiveTests !== 1 ? 's' : ''}{' '}
        across {pagesWithTests} page{pagesWithTests !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
