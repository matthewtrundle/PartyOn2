'use client';

/**
 * Tiny snooze dropdown — 1d / 3d / 7d / 14d. Per the buildout doc, default
 * is 7 days; we don't pre-select, but the most common operator pick goes
 * first-after-1d.
 */

import { useEffect, useRef, useState, type ReactElement } from 'react';

const OPTIONS: Array<{ days: number; label: string }> = [
  { days: 1, label: '1 day' },
  { days: 3, label: '3 days' },
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
];

export interface SnoozeMenuProps {
  isSaving: boolean;
  onSnooze: (days: number) => void;
}

export function SnoozeMenu({ isSaving, onSnooze }: SnoozeMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isSaving}
        className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Snooze ▾
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.days}
              role="menuitem"
              onClick={() => { setOpen(false); onSnooze(opt.days); }}
              className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 min-h-[44px] whitespace-nowrap"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
