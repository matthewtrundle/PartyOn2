'use client';

/**
 * Filter chips for the unified queue. Only renders a chip when that domain
 * has ≥1 active rec (handled at the page level; this component just renders
 * whatever it's given). Horizontally scrollable on mobile per the buildout
 * doc's "operator works from phone in the van" requirement.
 */

import type { ReactElement } from 'react';

export type DomainChipValue = 'all' | 'marketing' | 'operations' | 'seo';

export interface DomainChip {
  value: DomainChipValue;
  label: string;
}

export interface DomainChipsProps {
  chips: DomainChip[];
  current: DomainChipValue;
  counts?: Record<'marketing' | 'seo' | 'operations', number>;
  onChange: (value: DomainChipValue) => void;
}

export function DomainChips({
  chips,
  current,
  counts,
  onChange,
}: DomainChipsProps): ReactElement {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-4 overflow-x-auto">
      <div className="flex flex-nowrap items-center gap-2 min-w-max">
        <span className="text-xs uppercase tracking-wider text-gray-500 font-medium mr-1 shrink-0">
          Domain
        </span>
        {chips.map((chip) => {
          const isActive = current === chip.value;
          const count =
            chip.value === 'all'
              ? (counts ? counts.marketing + counts.seo + counts.operations : null)
              : (counts?.[chip.value] ?? null);
          return (
            <button
              key={chip.value}
              onClick={() => onChange(chip.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors min-h-[44px] shrink-0 ${
                isActive
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {chip.label}
              {count !== null && (
                <span
                  className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-white/20' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
