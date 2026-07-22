'use client';

/**
 * Workbench table — thin frame around ProspectRow (selection + drawer
 * opening live in the orchestrator).
 */

import type { ReactElement } from 'react';
import ProspectRow from './ProspectRow';
import type { LeadState, ProspectRow as Row, VerticalUiConfig } from './types';

export default function ProspectsTable({
  prospects,
  leadMap,
  selected,
  onToggleSelect,
  onOpen,
  config,
}: {
  prospects: Row[];
  leadMap: Record<string, LeadState>;
  selected: Set<string>;
  onToggleSelect: (website: string) => void;
  onOpen: (id: string) => void;
  config: VerticalUiConfig;
}): ReactElement {
  return (
    <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
          <tr>
            <th className="p-3"></th>
            <th className="text-left p-3">Company</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">{config.sizeLabel}</th>
            <th className="text-left p-3">Contact</th>
            <th className="text-left p-3">Email / verify</th>
            <th className="text-left p-3">Campaign</th>
            <th className="text-left p-3">Partner page</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 align-top">
          {prospects.map((p) => (
            <ProspectRow
              key={p.id}
              prospect={p}
              state={leadMap[p.websiteKey]}
              selected={selected.has(p.website)}
              onToggleSelect={() => onToggleSelect(p.website)}
              onOpen={() => onOpen(p.id)}
              sizeLabelValue={p.propertiesEstimate}
            />
          ))}
          {prospects.length === 0 && (
            <tr>
              <td colSpan={8} className="p-6 text-center text-sm text-gray-500">
                No prospects match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
