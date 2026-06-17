'use client';

/**
 * Small chip showing the visitor's current delivery-window choice with
 * a click-to-change affordance.
 *
 * Mounted alongside the Party Chat bubble on landing pages + the
 * homepage. Hidden when no choice is set (the gate hasn't fired yet)
 * and on routes that bypass the gate (admin, dashboard, etc).
 *
 * Tapping it clears the stored choice — the gate modal pops again on
 * the next render so the visitor can re-pick.
 */

import { usePathname } from 'next/navigation';
import { useDeliveryWindow } from '@/lib/deliveryWindow/window';

const NAVY = '#0A1F33';
const GOLD = '#F2D34F';

// Mirrors DeliveryWindowGate — keep in sync.
const EXEMPT_PATHS = new Set<string>([
  '/austin-bachelor-party-delivery',
  '/austin-bachelor-party-delivery-ai-test',
  '/austin-bachelorette-party-delivery',
  '/austin-corporate-event-delivery',
  '/austin-wedding-weekend-delivery',
  '/austin-wedding-venue-boats',
  '/event-quiz',
]);
// /dashboard intentionally NOT exempt — the chip shows up so the
// customer can re-pick their delivery window mid-flow if the gate's
// initial choice was wrong.
const EXEMPT_PREFIXES = ['/admin', '/ops', '/api', '/partners', '/affiliate', '/checkout', '/invoice', '/cart'];

function isExempt(pathname: string | null): boolean {
  if (!pathname) return true;
  if (EXEMPT_PATHS.has(pathname)) return true;
  return EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function DeliveryWindowBadge() {
  const pathname = usePathname();
  const { window: choice, clear } = useDeliveryWindow();

  if (isExempt(pathname)) return null;
  if (!choice) return null;

  const label = choice === 'last-minute' ? '⚡ Today / Tomorrow' : '📅 Future date';

  return (
    <button
      type="button"
      onClick={clear}
      aria-label="Change delivery window"
      className="fixed z-[140] rounded-full text-xs font-bold tracking-wide px-3 py-1.5 transition-transform hover:scale-[1.03]"
      style={{
        // Sit just above the chat bubble (which is at right:20, bottom:20
        // with a 64px diameter). Stacking offset keeps both tappable on
        // mobile without overlapping.
        right: 20,
        bottom: 96,
        background: '#FFFFFF',
        color: NAVY,
        border: `2px solid ${NAVY}`,
        boxShadow: `0 3px 0 ${NAVY}, 0 6px 12px rgba(10,15,25,0.14)`,
      }}
    >
      <span style={{ color: choice === 'last-minute' ? '#B8941F' : NAVY }}>
        {label}
      </span>
      <span className="ml-2 opacity-50 text-[10px]">
        change ▾
      </span>
      <span className="sr-only" style={{ color: GOLD }}>
        Click to reset
      </span>
    </button>
  );
}
