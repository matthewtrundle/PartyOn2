'use client';

import { ReactElement } from 'react';
import Link from 'next/link';

/**
 * Segmented control for sub-views inside a destination. Designed for the
 * navy band (track = white/10, active segment = white pill). Items are
 * buttons when `onChange` handles them, links when they carry `href` —
 * a segment may be a link inside an otherwise stateful control (e.g. Boats).
 */
export interface Segment {
  key: string;
  label: string;
  href?: string;
  /** Yellow attention dot (e.g. stale carts waiting). */
  dot?: boolean;
}

export default function SegmentedControl({
  segments,
  active,
  onChange,
  className = '',
}: {
  segments: Segment[];
  active: string;
  onChange?: (key: string) => void;
  className?: string;
}): ReactElement {
  const base =
    'relative flex-1 min-h-[44px] px-3 inline-flex items-center justify-center rounded-md font-heading font-bold text-[13px] tracking-[0.05em] uppercase whitespace-nowrap transition-colors touch-manipulation';
  const activeCls = 'bg-white text-navy shadow-sm';
  const inactiveCls = 'text-[#B7C4D0] hover:text-white';

  return (
    <div
      role="tablist"
      className={`flex gap-1 p-1 rounded-lg bg-white/10 overflow-x-auto hide-scrollbar ${className}`}
    >
      {segments.map((s) => {
        const cls = `${base} ${active === s.key ? activeCls : inactiveCls}`;
        const dot = s.dot && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-yellow" />
        );
        return s.href ? (
          <Link key={s.key} href={s.href} role="tab" aria-selected={active === s.key} className={cls}>
            {s.label}
            {dot}
          </Link>
        ) : (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={active === s.key}
            onClick={() => onChange?.(s.key)}
            className={cls}
          >
            {s.label}
            {dot}
          </button>
        );
      })}
    </div>
  );
}
