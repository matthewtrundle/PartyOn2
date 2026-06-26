'use client';

import { ReactElement } from 'react';
import type { CtaRow } from '@/lib/analytics/landing-page-metrics';

interface CtaClickTableProps {
  rows: CtaRow[];
  loading?: boolean;
}

/** Title-case a raw section id like `final_cta` → `Final cta`. */
function prettySection(section: string): string {
  const s = section.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Per-button / per-section CTA click counts — the visibility the owner was
 * missing. Sourced from the first-party `cta_click` event stream.
 */
export default function CtaClickTable({ rows, loading = false }: CtaClickTableProps): ReactElement {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">CTA clicks</h3>
        <span className="text-xs text-gray-400">first-party · unfiltered</span>
      </div>

      {loading ? (
        <div className="h-40 bg-gray-100 rounded animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          No CTA clicks recorded yet for this page in the selected period.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4 font-medium">Section</th>
                <th className="py-2 pr-4 font-medium">Button</th>
                <th className="py-2 pr-4 font-medium text-right">Clicks</th>
                <th className="py-2 font-medium text-right">Click rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.section}-${r.buttonText}-${i}`} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-600">{prettySection(r.section)}</td>
                  <td className="py-2 pr-4 text-gray-900 font-medium">{r.buttonText}</td>
                  <td className="py-2 pr-4 text-right text-gray-900">{r.clicks.toLocaleString()}</td>
                  <td className="py-2 text-right text-gray-600">
                    {r.clickRate > 0 ? `${(r.clickRate * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
