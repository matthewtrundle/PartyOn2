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
export const AGE_GATE_EXEMPT_PATHS = [
  '/austin-bachelor-party-delivery',
  '/austin-bachelor-party-delivery-ai-test',
  '/austin-bachelorette-party-delivery',
  '/austin-corporate-event-delivery',
  '/austin-wedding-weekend-delivery',
  '/austin-wedding-venue-boats',
  '/austin-4th-of-july-delivery',
  '/event-quiz',
  '/events/4th-of-july-disco-cruise',
  '/austin-bachelor-concierge',
  '/austin-bachelorette-concierge',
  '/austin-concierge',
  '/concierge-quote',
  // Full Moon Party event funnel. Same posture as the paid landers above:
  // traffic arrives from texted/shared links straight onto the page, and a
  // full-screen DOB form before a single word is read kills it. Measured
  // 2026-08-03: 34 visitors from Allan's weekend outreach, ZERO CTA clicks
  // and zero checkout starts, because `page_view` fires while the gate is up
  // — every one of them was counted as a "visit" without seeing the page.
  //
  // Age compliance is NOT weakened: the ticket modal keeps its required
  // "I'm 25 or older" attestation, /order checkout keeps the required 21+
  // TABC confirmation, and ID is checked at the dock on handoff.
  '/full-moon-aug28',
  '/full-moon-drinks',
  // Legal text linked from the Full Moon ticket modal and the confirmation
  // email — no purchase on the page, and a buyer following the terms link
  // from their email must be able to read it without an entrance gate.
  '/full-moon-terms',
  // Post-purchase landing (Stripe success_url). Exempt because the page is
  // static non-alcohol marketing content already public on the event page —
  // NOT because visitors are verified (the route has no purchase check; the
  // binding 25+/21+ controls are the ticket checkout attestation and ID at
  // the dock). Gating the Stripe bounce-back would be pure friction.
  '/full-moon-thanks',
  // Cocktail-kit recipe lookup. Reached from a kit already delivered (or an
  // organic "how do I mix this" search), so a DOB form before the recipe is
  // pure friction on a page that sells nothing — the only CTA links out to
  // the product page, where the standard gate and the /order 21+ TABC
  // confirmation both still apply.
  '/cocktail-recipes',
  // Wall of Love — every "4.9 · 100+ Google reviews" strip on the landing
  // pages links here, and organic "party on delivery reviews" searches land
  // here. Nothing is sold on the page; every CTA leads to pages that keep
  // their own gate (or the /order 21+ TABC confirmation). A DOB form in
  // front of testimonial text is pure friction on the trust-building step.
  '/reviews',
]

/**
 * Private, invite-only event pages shared by direct link to known guests
 * (e.g. a one-off party invite). Unlike the paid landers above, these have
 * NO on-page purchase and NO public/ad traffic — the audience is the host's
 * own friends, so the entrance gate is pure friction. The legal control
 * remains carding at the door / on delivery.
 */
const AGE_GATE_EXEMPT_INVITE_PATHS = [
  '/dads-gone-wild',
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
    // Paid landing pages defer the gate to the in-modal 21+ checkbox;
    // private invite pages skip it entirely (friends-only, no purchase).
    // No localStorage stamp here — if the visitor navigates to the rest
    // of the site without checking out, the standard gate still applies.
    if (
      pathname &&
      (AGE_GATE_EXEMPT_PATHS.includes(pathname) ||
        AGE_GATE_EXEMPT_INVITE_PATHS.includes(pathname) ||
        // Concierge quote pages are dynamic (/concierge-quote/[leadId]
        // and /success). Prefix-match them so every sub-route is
        // exempted without listing each UUID.
        pathname.startsWith('/concierge-quote/'))
    ) {
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
