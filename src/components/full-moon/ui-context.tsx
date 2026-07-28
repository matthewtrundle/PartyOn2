'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { trackCTAClick } from '@/lib/analytics/ga4-events';
import type { CtaSection } from '@/lib/analytics/ga4-events';
import { EVENT, HERO } from './event';

interface FullMoonUI {
  shareOpen: boolean;
  successOpen: boolean;
  ticketOpen: boolean;
  toast: string | null;
  openShare: () => void;
  closeShare: () => void;
  openSuccess: () => void;
  closeSuccess: () => void;
  /**
   * Opens the ticket modal. Pass the section the click came from so the
   * conversion funnel is attributable per CTA in the analytics hub — the Aug 1
   * run had no CTA instrumentation at all, so there was no way to tell a dead
   * page from a dead button.
   */
  openTicket: (section?: CtaSection) => void;
  closeTicket: () => void;
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
  const [ticketOpen, setTicketOpen] = useState(false);
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
  const openTicket = useCallback((section: CtaSection = 'hero') => {
    trackCTAClick(HERO.primaryCta, EVENT.shareUrl, section);
    setTicketOpen(true);
  }, []);
  const closeTicket = useCallback(() => setTicketOpen(false), []);

  const value = useMemo<FullMoonUI>(
    () => ({
      shareOpen,
      successOpen,
      ticketOpen,
      toast,
      openShare,
      closeShare,
      openSuccess,
      closeSuccess,
      openTicket,
      closeTicket,
      showToast,
    }),
    [
      shareOpen,
      successOpen,
      ticketOpen,
      toast,
      openShare,
      closeShare,
      openSuccess,
      closeSuccess,
      openTicket,
      closeTicket,
      showToast,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Access the shared overlay controls. */
export function useFullMoonUI(): FullMoonUI {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFullMoonUI must be used within FullMoonUIProvider');
  return ctx;
}
