'use client';

import { ReactElement, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Bottom sheet (mobile-first modal surface). Backdrop black/50 with the kit's
 * only sanctioned blur; sheet slides up 200ms (quiet under reduced-motion via
 * the .pod-sheet-enter rule in globals.css). Portaled to <body> so transformed
 * ancestors can't trap the fixed positioning. z-50 per the shell z-scale.
 *
 * Every sheet gets an explicit X close button (Esc and backdrop-tap also
 * close, but neither is discoverable — 2026-07-14 operator feedback).
 *
 * `centered`: render as a contained pop-up instead of an edge-to-edge sheet —
 * a floating card with visible margins on mobile, centered on md+ — for
 * content-heavy surfaces (e.g. the lead drawer) that would otherwise read as
 * a full-screen takeover.
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  centered = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  centered?: boolean;
}): ReactElement | null {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const sheetInner = (
    <>
      <div className="sticky top-0 z-10 bg-white pt-2 pb-1 rounded-t-2xl">
        {!centered && <div className="mx-auto w-9 h-1 rounded-full bg-gray-300" />}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {title && (
          <div className="px-5 pt-3 pr-14 font-heading font-bold text-lg tracking-[0.08em] uppercase text-gray-900">
            {title}
          </div>
        )}
      </div>
      <div className="px-5 pt-2">{children}</div>
    </>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 print:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-black/50 backdrop-blur-sm cursor-default"
      />
      {centered ? (
        <div className="absolute inset-0 flex items-end justify-center p-3 pb-[max(12px,env(safe-area-inset-bottom))] md:items-center pointer-events-none">
          <div className="pod-sheet-enter pointer-events-auto relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-xl pb-4">
            {sheetInner}
          </div>
        </div>
      ) : (
        <div className="pod-sheet-enter absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-white rounded-t-2xl shadow-xl pb-[max(16px,env(safe-area-inset-bottom))]">
          {sheetInner}
        </div>
      )}
    </div>,
    document.body,
  );
}
