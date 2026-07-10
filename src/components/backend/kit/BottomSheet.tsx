'use client';

import { ReactElement, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Bottom sheet (mobile-first modal surface). Backdrop black/50 with the kit's
 * only sanctioned blur; sheet slides up 200ms (quiet under reduced-motion via
 * the .pod-sheet-enter rule in globals.css). Portaled to <body> so transformed
 * ancestors can't trap the fixed positioning. z-50 per the shell z-scale.
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
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

  return createPortal(
    <div className="fixed inset-0 z-50 print:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-black/50 backdrop-blur-sm cursor-default"
      />
      <div className="pod-sheet-enter absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-white rounded-t-2xl shadow-xl pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="sticky top-0 bg-white pt-2 pb-1 rounded-t-2xl">
          <div className="mx-auto w-9 h-1 rounded-full bg-gray-300" />
          {title && (
            <div className="px-5 pt-3 font-heading font-bold text-lg tracking-[0.08em] uppercase text-gray-900">
              {title}
            </div>
          )}
        </div>
        <div className="px-5 pt-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
