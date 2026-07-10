'use client';

import { ReactElement, useRef, useState } from 'react';

const THUMB_W = 44;

/**
 * Slide-to-confirm control for money-out actions (refunds). The gesture must
 * START on the thumb and travel the full track — tapping the track does
 * nothing, so an accidental tap can never confirm. Keyboard: focus the thumb
 * and hold ArrowRight to walk it across; reaching the end confirms.
 */
export default function SlideToConfirm({
  label,
  disabled = false,
  onConfirm,
}: {
  label: string;
  disabled?: boolean;
  onConfirm: () => void;
}): ReactElement {
  const [pct, setPctState] = useState(0);
  const pctRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const fired = useRef(false);

  // Ref mirrors state so pointer-up reads the live position, not a stale render
  function setPct(v: number): void {
    pctRef.current = v;
    setPctState(v);
  }

  function travel(): number {
    return (trackRef.current?.offsetWidth ?? 300) - THUMB_W - 8;
  }

  function fire(): void {
    if (fired.current) return;
    fired.current = true;
    onConfirm();
    // Reset after the action kicks off so a re-render mid-flight is clean
    setTimeout(() => {
      fired.current = false;
      setPct(0);
    }, 400);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>): void {
    if (disabled) return;
    dragging.current = true;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>): void {
    if (!dragging.current || disabled) return;
    const next = Math.min(100, Math.max(0, ((e.clientX - startX.current) / travel()) * 100));
    setPct(next);
  }

  function handlePointerUp(): void {
    if (!dragging.current) return;
    dragging.current = false;
    if (disabled) {
      setPct(0);
      return;
    }
    if (pctRef.current >= 96) fire();
    else setPct(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>): void {
    if (disabled) return;
    // Auto-repeat from a held key must not count — each step requires a
    // distinct physical press, or holding ArrowRight would fire a refund
    // in under a second (security review, PR-D).
    if (e.repeat) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') e.preventDefault();
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(100, pctRef.current + 10);
      setPct(next);
      if (next >= 100) fire();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPct(Math.max(0, pctRef.current - 10));
    } else if (e.key === 'Escape') {
      setPct(0);
    }
  }

  return (
    <div
      ref={trackRef}
      className={`relative h-12 rounded-lg overflow-hidden select-none ${
        disabled ? 'bg-red-300' : 'bg-red-600'
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-center px-12 text-white text-sm font-bold tracking-[0.05em] uppercase pointer-events-none whitespace-nowrap overflow-hidden">
        {label}
      </div>
      <div
        className="absolute inset-y-0 left-0 bg-red-900/40 pointer-events-none"
        style={{ width: `${pct}%` }}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onBlur={() => !dragging.current && setPct(0)}
        className="absolute top-1 bottom-1 w-11 rounded-md bg-white shadow flex items-center justify-center cursor-grab active:cursor-grabbing disabled:cursor-not-allowed touch-none focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
        style={{ left: `calc(4px + (100% - ${THUMB_W + 8}px) * ${pct / 100})` }}
      >
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
