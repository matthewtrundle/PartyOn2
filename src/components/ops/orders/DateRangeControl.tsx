'use client';

import { ReactElement } from 'react';
import { todayCT } from './client-today';

/** Shift a YYYY-MM-DD key by N days (UTC-safe). */
function shiftDate(iso: string, byDays: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + byDays);
  return d.toISOString().slice(0, 10);
}

const PRESETS: Array<{ label: string; days: number }> = [
  { label: 'Today', days: 1 },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
];

/**
 * Date window control: preset pills (Today / 7 / 14 days), a start-date
 * input, and ‹ › arrows that shift by the window length. Disabled with a
 * hint while a search is active (search spans all dates).
 */
export default function DateRangeControl({
  start,
  days,
  onChange,
  disabled,
}: {
  start: string;
  days: number;
  onChange: (start: string, days: number) => void;
  disabled: boolean;
}): ReactElement {
  if (disabled) {
    return (
      <span className="inline-flex items-center min-h-[44px] px-3 text-sm text-gray-400 italic whitespace-nowrap">
        Searching all dates
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button
        type="button"
        onClick={() => onChange(shiftDate(start, -days), days)}
        className="w-11 h-11 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 touch-manipulation"
        aria-label={`Back ${days} day${days === 1 ? '' : 's'}`}
      >
        ‹
      </button>
      <input
        type="date"
        value={start}
        onChange={(e) => e.target.value && onChange(e.target.value, days)}
        className="h-11 px-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 w-[140px]"
        aria-label="Window start date"
      />
      <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
        {PRESETS.map((p) => {
          const active = days === p.days && (p.days !== 1 || start === todayCT());
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.days === 1 ? todayCT() : start, p.days)}
              className={`h-11 px-3 text-sm font-semibold whitespace-nowrap touch-manipulation ${
                active ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange(shiftDate(start, days), days)}
        className="w-11 h-11 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 touch-manipulation"
        aria-label={`Forward ${days} day${days === 1 ? '' : 's'}`}
      >
        ›
      </button>
    </div>
  );
}
