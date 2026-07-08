'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';

interface FullMoonUI {
  shareOpen: boolean;
  successOpen: boolean;
  toast: string | null;
  openShare: () => void;
  closeShare: () => void;
  openSuccess: () => void;
  closeSuccess: () => void;
  showToast: (message: string) => void;
}

const Ctx = createContext<FullMoonUI | null>(null);

/**
 * Shares the overlay state (share sheet, success modal, toast) across the page
 * so the nav, inline moment, FAB, and success modal can all trigger sharing.
 */
export function FullMoonUIProvider({ children }: { children: ReactNode }): ReactElement {
  const [shareOpen, setShareOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const openShare = useCallback(() => setShareOpen(true), []);
  const closeShare = useCallback(() => setShareOpen(false), []);
  const openSuccess = useCallback(() => setSuccessOpen(true), []);
  const closeSuccess = useCallback(() => setSuccessOpen(false), []);

  const value = useMemo<FullMoonUI>(
    () => ({ shareOpen, successOpen, toast, openShare, closeShare, openSuccess, closeSuccess, showToast }),
    [shareOpen, successOpen, toast, openShare, closeShare, openSuccess, closeSuccess, showToast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Access the shared overlay controls. */
export function useFullMoonUI(): FullMoonUI {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFullMoonUI must be used within FullMoonUIProvider');
  return ctx;
}
