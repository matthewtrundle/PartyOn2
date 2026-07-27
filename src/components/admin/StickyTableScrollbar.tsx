'use client';

/**
 * A thin horizontal scrollbar pinned (position: sticky) to the bottom of the
 * viewport that drives a wide table's horizontal scroll. For admin tables whose
 * own bottom scrollbar is stranded far below the fold (past every row) — this
 * stays grabbable no matter how far down the page you are. Scroll is synced
 * both ways with the target element; the strip hides itself when the target
 * doesn't overflow horizontally.
 *
 * Place it as the next sibling after the table's overflow-x container, inside a
 * shared wrapper, and hand it a ref to that container.
 */

import { useEffect, useRef, useState, type ReactElement, type RefObject } from 'react';

export default function StickyTableScrollbar({
  targetRef,
}: {
  targetRef: RefObject<HTMLElement | null>;
}): ReactElement {
  const stripRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = targetRef.current;
    const strip = stripRef.current;
    if (!el || !strip) return;

    // Guard against the scroll-sync feedback loop.
    let syncing = false;
    const fromTable = (): void => {
      if (syncing) return;
      syncing = true;
      strip.scrollLeft = el.scrollLeft;
      syncing = false;
    };
    const fromStrip = (): void => {
      if (syncing) return;
      syncing = true;
      el.scrollLeft = strip.scrollLeft;
      syncing = false;
    };
    const measure = (): void => {
      setContentWidth(el.scrollWidth);
      setOverflows(el.scrollWidth - el.clientWidth > 1);
    };

    measure();
    el.addEventListener('scroll', fromTable, { passive: true });
    strip.addEventListener('scroll', fromStrip, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', fromTable);
      strip.removeEventListener('scroll', fromStrip);
      ro.disconnect();
    };
  }, [targetRef]);

  return (
    <div
      ref={stripRef}
      aria-hidden="true"
      className={`always-scrollbar sticky bottom-0 z-20 overflow-x-auto overflow-y-hidden rounded-b-lg border-t border-gray-200 bg-gray-50/95 ${
        overflows ? '' : 'hidden'
      }`}
    >
      {/* Spacer matches the table's scroll width so the strip's thumb tracks it. */}
      <div style={{ width: contentWidth, height: 1 }} />
    </div>
  );
}
