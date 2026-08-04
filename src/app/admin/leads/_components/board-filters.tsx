'use client';

import { ReactElement, useEffect, useRef, useState } from 'react';
import SegmentedControl from '@/components/backend/kit/SegmentedControl';
import type { BoardFilters } from '@/lib/leads/board-types';
import {
  SOURCE_FILTER_OPTIONS,
  type LeadChannel,
} from '@/lib/leads/source-taxonomy';

const GROUP_LABELS: Record<'audience' | 'channel' | 'source', string> = {
  audience: 'Audience',
  channel: 'How they reached us',
  source: 'Source',
};
const GROUP_ORDER = ['audience', 'channel', 'source'] as const;

/**
 * One select drives two different filters. A `channel:` prefix sets
 * `filters.channel`; anything else sets `filters.source`. Exactly one is ever
 * active, so picking a channel clears a source and vice versa.
 */
function parseSelection(value: string): Pick<BoardFilters, 'source' | 'channel'> {
  if (!value) return { source: undefined, channel: undefined };
  if (value.startsWith('channel:')) {
    return { source: undefined, channel: value.slice('channel:'.length) as LeadChannel };
  }
  return { source: value, channel: undefined };
}

/** Temperature segments + source select + search + tray/snooze toggles. */
export default function BoardFilters({
  filters,
  onChange,
}: {
  filters: BoardFilters;
  onChange: (next: BoardFilters) => void;
}): ReactElement {
  // Debounce the search box — every filter change triggers a board GET, and
  // per-keystroke fetches waste server sweeps and can resolve out of order.
  const [qDraft, setQDraft] = useState(filters.q ?? '');
  const qTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setQDraft(filters.q ?? ''), [filters.q]);
  const onSearchChange = (value: string): void => {
    setQDraft(value);
    if (qTimer.current) clearTimeout(qTimer.current);
    qTimer.current = setTimeout(() => {
      onChange({ ...filters, q: value || undefined });
    }, 300);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2">
      <SegmentedControl
        className="md:max-w-[360px]"
        segments={[
          { key: '', label: 'All' },
          { key: 'hot', label: 'Hot' },
          { key: 'warm', label: 'Warm' },
          { key: 'cold', label: 'Cold' },
        ]}
        active={filters.temp ?? ''}
        onChange={(key) =>
          onChange({ ...filters, temp: (key || undefined) as BoardFilters['temp'] })
        }
      />
      <div className="flex flex-1 items-center gap-2">
        <select
          value={filters.channel ? `channel:${filters.channel}` : (filters.source ?? '')}
          onChange={(e) => onChange({ ...filters, ...parseSelection(e.target.value) })}
          className="min-h-[44px] rounded-lg border border-white/20 bg-white/10 text-white text-sm px-2 [&>option]:text-gray-900 [&>optgroup]:text-gray-900"
          aria-label="Filter by source"
        >
          <option value="">All sources</option>
          {GROUP_ORDER.map((group) => (
            <optgroup key={group} label={GROUP_LABELS[group]}>
              {SOURCE_FILTER_OPTIONS.filter((o) => o.group === group).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {filters.form && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, form: undefined })}
            className="min-h-[36px] shrink-0 rounded-lg border border-brand-yellow/50 bg-brand-yellow/15 text-white text-sm px-2.5 flex items-center gap-1.5"
            aria-label={`Clear form filter ${filters.form}`}
          >
            <span className="truncate max-w-[160px]">{filters.form}</span>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        )}
        <input
          type="search"
          value={qDraft}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, email, phone"
          className="flex-1 min-w-0 min-h-[44px] rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-[#B7C4D0] text-base px-3"
          aria-label="Search leads"
        />
      </div>
      <div className="flex items-center gap-4 text-sm text-[#B7C4D0]">
        <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={filters.includePartial ?? false}
            onChange={(e) => onChange({ ...filters, includePartial: e.target.checked || undefined })}
            className="accent-brand-yellow w-4 h-4"
          />
          Incomplete leads
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={filters.showSnoozed ?? false}
            onChange={(e) => onChange({ ...filters, showSnoozed: e.target.checked || undefined })}
            className="accent-brand-yellow w-4 h-4"
          />
          Snoozed
        </label>
      </div>
    </div>
  );
}
