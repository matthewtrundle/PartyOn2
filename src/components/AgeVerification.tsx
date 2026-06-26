'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AgeVerificationModal from './AgeVerificationModal'

/**
 * Paid-landing pages where the entrance gate is intentionally skipped.
 *
 * These are lead-gen pages (no on-page purchase): cold ad traffic bounces
 * hard when a modal blocks the page before a single word is read. Age
 * compliance moves to an explicit, required "21+" checkbox inside the
 * package-builder / quick-buy checkout steps (see PackageBuilderModal /
 * QuickBuyModal), and the legal control remains carding at the door.
 * Every other route keeps the standard first-visit gate.
 */
const AGE_GATE_EXEMPT_PATHS = [
  '/austin-bachelor-party-delivery',
  '/austin-bachelor-party-delivery-ai-test',
  '/austin-bachelorette-party-delivery',
  '/austin-corporate-event-delivery',
  '/austin-wedding-weekend-delivery',
  '/austin-wedding-venue-boats',
  '/event-quiz',
  '/events/4th-of-july-disco-cruise',
]

/**
 * Detect whether the page is being embedded on another site.
 *
 * Two signals — either is sufficient:
 *
 *   1. **Iframe context** — `window.self !== window.top` means we're
 *      inside an iframe. This is the case when Premier Party Cruises
 *      embeds the POD lead-dashboard / landing pages on their site.
 *      The act of reading `window.top` may throw a SecurityError when
 *      the parent origin is cross-origin — we treat the throw itself
 *      as confirmation that we're embedded.
 *
 *   2. **Query param** — `?embed=1` or `?embedded=1` so partners can
 *      explicitly mark a link as embedded even when iframe detection
 *      isn't available (e.g. window.open, deep link from native app,
 *      QR code → mobile browser opening the URL directly).
 *
 * When either signal fires we stamp `age_verified=1` in localStorage —
 * partner traffic already lives on an age-gated experience (Premier
 * Party Cruises is the same brand, same TABC license, same customers)
 * so re-asking is redundant friction.
 */
function isEmbeddedContext(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.self !== window.top) return true
  } catch {
    // Cross-origin iframe — accessing window.top throws, which is
    // itself proof we're embedded across origins.
    return true
  }
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('embed') === '1') return true
    if (params.get('embedded') === '1') return true
  } catch {
    /* defensive — URLSearchParams shouldn't throw */
  }
  return false
}

export default function AgeVerification() {
  const [isVisible, setIsVisible] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Paid landing pages defer the gate to the in-modal 21+ checkbox.
    // No localStorage stamp here — if the visitor navigates to the rest
    // of the site without checking out, the standard gate still applies.
    if (pathname && AGE_GATE_EXEMPT_PATHS.includes(pathname)) {
      setIsVisible(false)
      return
    }

    // Partner embeds skip the gate entirely. The partner site (Premier
    // Party Cruises, etc.) has already filtered for 21+ traffic, and
    // popping our modal on top of their UX is friction we don't want.
    if (isEmbeddedContext()) {
      try {
        localStorage.setItem('age_verified', '1')
      } catch {
        /* localStorage disabled — fine, the modal still won't show */
      }
      return
    }

    // Standard flow: only show the gate to first-time visitors who
    // haven't already verified.
    const ageVerified = localStorage.getItem('age_verified')
    if (!ageVerified) {
      setIsVisible(true)
    }
  }, [pathname])

  const handleVerify = () => {
    setIsVisible(false)
  }

  const handleClose = () => {
    setIsVisible(false)
  }

  return (
    <AgeVerificationModal
      isOpen={isVisible}
      onClose={handleClose}
      onVerify={handleVerify}
    />
  )
}
