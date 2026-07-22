'use client';

import { ReactElement, useEffect, useRef, useState } from 'react';
import SegmentedControl from '@/components/backend/kit/SegmentedControl';
import type { BoardFilters } from '@/lib/leads/board-types';

const SOURCE_OPTIONS = [
  ['', 'All sources'],
  ['CONSUMER', 'Consumers only'],
  ['PARTNER', '🤝 Partner Prospects'],
  ['GROUP_DASHBOARD', 'Party Dashboard'],
  ['PARTNER_LANDING_PAGE', 'Concierge'],
  ['CONTACT_FORM:quote', 'Quote Request'],
  ['CONTACT_FORM:chat', 'Chat'],
  ['CONTACT_FORM:quiz', 'Event Quiz'],
  ['CONTACT_FORM:contact', 'Contact Form'],
  ['PARTNER_INQUIRY', 'B2B / Partner'],
  ['OPS_INVOICE', 'Ops Invoice'],
  ['INBOUND_EMAIL', 'Inbound Email'],
  ['QUICK_BUY', 'Quick Buy'],
  ['PACKAGE_BUILDER', 'Package Builder'],
  ['A_LA_CARTE', 'A La Carte'],
  ['CALL_BOOKING', 'Call Booking'],
  ['DRINK_CALCULATOR', 'Calculator'],
  ['LEAD_MAGNET', 'Lead Magnet'],
  ['EMAIL_SIGNUP', 'Email Signup'],
  ['OTHER', 'Site'],
] as const;

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
          value={filters.source ?? ''}
          onChange={(e) => onChange({ ...filters, source: e.target.value || undefined })}
          className="min-h-[44px] rounded-lg border border-white/20 bg-white/10 text-white text-sm px-2 [&>option]:text-gray-900"
          aria-label="Filter by source"
        >
          {SOURCE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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
