'use client';

/**
 * Delivery-window entrance gate.
 *
 * Pops right after the 21+ age gate clears (or immediately on pages
 * where the age gate is exempted but we still want the window
 * captured). Asks "When is this delivery?" with two big buttons:
 *
 *   ⚡ Today or Tomorrow    → flips lastMinuteMode on every subsequent
 *                             modal / chat / quote endpoint
 *   📅 Future date          → standard catalog + default date ~7d out
 *
 * Choice persists in localStorage for 24h (`pod_delivery_window`).
 * Re-fires if the visitor comes back tomorrow.
 *
 * Excluded paths mirror the age gate's exemptions PLUS the dashboard,
 * admin, ops, and api routes — anywhere the delivery date is already
 * pinned to a specific order (no point asking again).
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  loadDeliveryWindow,
  saveDeliveryWindow,
  type DeliveryWindow,
} from '@/lib/deliveryWindow/window';

const NAVY = '#0A1F33';
const GOLD = '#F2D34F';

/**
 * Routes where the gate is intentionally skipped.
 *
 * The four paid-ad landing pages skip ANY entrance modal — cold ad
 * traffic bounces hard when a popup blocks the page. Each modal-led
 * order flow on those pages re-asks via its own date picker / banner.
 * The dashboard / admin / ops / api / event-quiz / partner pages are
 * skipped because the delivery date is already established by the
 * caller's context.
 */
const EXEMPT_PATHS = new Set<string>([
  '/austin-bachelor-party-delivery',
  '/austin-bachelor-party-delivery-ai-test',
  '/austin-bachelorette-party-delivery',
  '/austin-corporate-event-delivery',
  '/austin-wedding-weekend-delivery',
  '/austin-wedding-venue-boats',
  '/event-quiz',
  '/events/4th-of-july-disco-cruise',
]);

// NOTE: /dashboard intentionally NOT exempt — the gate fires on first
// dashboard view so every customer flow starts with "today/tomorrow vs
// future", matching the entrance gate on the rest of the site. Once
// the visitor picks, the choice persists for 24h so they don't get
// asked again as they navigate between tabs/share links.
const EXEMPT_PREFIXES = ['/admin', '/ops', '/api', '/partners', '/affiliate', '/checkout', '/invoice', '/cart'];

function isExempt(pathname: string | null): boolean {
  if (!pathname) return false;
  if (EXEMPT_PATHS.has(pathname)) return true;
  return EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isEmbeddedContext(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true; // cross-origin throw confirms embed
  }
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('embed') === '1' || params.get('embedded') === '1') return true;
  } catch {
    /* swallow */
  }
  return false;
}

export default function DeliveryWindowGate() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Skip on exempt routes + embedded partner views.
    if (isExempt(pathname) || isEmbeddedContext()) {
      setIsVisible(false);
      return;
    }
    // Already chosen within the 24h TTL — skip.
    if (loadDeliveryWindow() !== null) {
      setIsVisible(false);
      return;
    }
    // Only fire after the age gate has been cleared. The age gate
    // stamps `age_verified=1` in localStorage on accept; without that
    // we let it run first and reveal ourselves on the next render.
    try {
      const ageVerified = localStorage.getItem('age_verified');
      if (!ageVerified) {
        // Re-check shortly — the age modal will set the flag when the
        // visitor clicks "Yes, I'm 21+".
        const id = window.setInterval(() => {
          if (localStorage.getItem('age_verified')) {
            window.clearInterval(id);
            if (loadDeliveryWindow() === null) setIsVisible(true);
          }
        }, 300);
        return () => window.clearInterval(id);
      }
    } catch {
      /* localStorage disabled — fall through and show */
    }
    setIsVisible(true);
  }, [pathname]);

  const choose = (value: DeliveryWindow) => {
    saveDeliveryWindow(value);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,10,20,0.88)' }}
      role="dialog"
      aria-modal="true"
      aria-label="When is your delivery?"
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#FAF6EE' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 text-center"
          style={{
            background: NAVY,
            color: '#FFFFFF',
            borderBottom: `4px solid ${GOLD}`,
          }}
        >
          <div
            className="text-[10px] font-bold tracking-widest"
            style={{ color: GOLD }}
          >
            ONE QUICK QUESTION
          </div>
          <div className="font-heading text-2xl font-bold mt-1 leading-tight">
            When is your delivery?
          </div>
          <div className="text-xs opacity-85 mt-1">
            We&apos;ll show the right menu either way.
          </div>
        </div>

        {/* Two big buttons */}
        <div className="p-4 space-y-3">
          <button
            type="button"
            onClick={() => choose('last-minute')}
            className="w-full rounded-lg py-5 px-4 font-heading font-bold tracking-wider transition-transform hover:scale-[1.01] text-left"
            style={{
              background: GOLD,
              color: NAVY,
              border: `3px solid ${NAVY}`,
              boxShadow: `0 5px 0 ${NAVY}, 0 8px 18px rgba(10,15,25,0.18)`,
            }}
          >
            <div className="text-2xl">⚡ Today or Tomorrow</div>
            <div className="text-xs font-normal mt-1 tracking-normal opacity-80">
              Deep-stock menu only — guaranteed in 24h.
            </div>
          </button>
          <button
            type="button"
            onClick={() => choose('future')}
            className="w-full rounded-lg py-5 px-4 font-heading font-bold tracking-wider transition-transform hover:scale-[1.01] text-left"
            style={{
              background: '#FFFFFF',
              color: NAVY,
              border: `3px solid ${NAVY}`,
              boxShadow: `0 5px 0 ${NAVY}`,
            }}
          >
            <div className="text-2xl">📅 Future date</div>
            <div className="text-xs font-normal mt-1 tracking-normal opacity-75">
              Full catalog. Pick the exact day on the next step.
            </div>
          </button>
        </div>

        <div className="px-6 pb-5 text-center">
          <div className="text-[11px] text-gray-500 leading-snug">
            Not sure yet? Pick &ldquo;future&rdquo; — you can change the
            date any time before checkout.
          </div>
        </div>
      </div>
    </div>
  );
}
