import { trackMetaEvent } from '@/components/MetaPixel';

/**
 * Occasion that generated the lead. Flows into the GA4 `generate_lead`
 * event as a parameter so a SINGLE event name powers per-occasion key
 * events / Google Ads conversion actions (Lead – Bachelor, Lead – Wedding,
 * …) — there is deliberately NOT a separate event name per landing page.
 * GA4 derives per-occasion key events from this param; Google Ads imports
 * those as distinct conversion actions and each campaign optimizes toward
 * its own.
 */
export type LeadOccasion =
  | 'wedding'
  | 'bachelor'
  | 'bachelorette'
  | 'corporate'
  | 'boat'
  | 'house'
  // Allow any future occasion string without widening to plain `string`
  // (keeps editor autocomplete on the known set).
  | (string & {});

type FireLeadConversionArgs = {
  /** Which landing occasion produced the lead. */
  occasion: LeadOccasion;
  /** Where on the page it fired — e.g. 'results', 'inline', 'bottom',
      'package-builder', 'quick-buy'. Lets GA4 split conversion by entry point. */
  placement: string;
  /** Optional numeric value in USD — pass the quote/order subtotal so
      value-based bidding in Google Ads sees real dollars. Defaults to 0. */
  value?: number;
};

/**
 * Shared firing logic for both public entry points. When `onGtagFlushed` is
 * provided it is attached as the gtag `event_callback` (invoked once the hit
 * has been sent); it is called synchronously when gtag isn't available at
 * all (dev, ad-blocked, script not yet loaded) so callers never hang.
 */
function fireNetworks(
  { occasion, placement, value = 0 }: FireLeadConversionArgs,
  onGtagFlushed?: () => void,
  flushTimeoutMs?: number,
): void {
  if (process.env.NODE_ENV !== 'production') {
    // gtag only loads in production (see GoogleAnalytics.tsx) — this log is
    // the only local signal that the conversion would have fired.
    console.log('[fireLeadConversion]', { occasion, placement, value });
  }

  trackMetaEvent('Lead', {
    content_name: `${occasion} quote`,
    content_category: occasion,
    placement,
  });

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'generate_lead', {
      occasion,
      placement,
      page_location: window.location.href,
      value,
      currency: 'USD',
      // Use sendBeacon so the hit survives an immediate hard navigation
      // (both modals redirect right after a successful submit).
      transport_type: 'beacon',
      ...(onGtagFlushed
        ? { event_callback: onGtagFlushed, event_timeout: flushTimeoutMs }
        : {}),
    });

    const conversionId = process.env.NEXT_PUBLIC_GADS_QUOTE_CONVERSION_ID;
    if (conversionId) {
      window.gtag('event', 'conversion', {
        send_to: conversionId,
        value: 0,
        currency: 'USD',
      });
    }
  } else {
    onGtagFlushed?.();
  }
}

/**
 * Fires the cross-network "a lead was generated" conversion in one place:
 * Meta `Lead` + GA4 `generate_lead` + (env-gated) Google Ads direct-fire
 * `conversion`. Every call is guarded so a missing pixel / env var is a
 * silent no-op.
 *
 * Shared by every quote/lead entry point (wedding calculator + landing-page
 * package builder + quick-buy) so the event schema stays identical everywhere
 * and a new landing page becomes trackable just by calling this on submit
 * success.
 *
 * Fire-and-forget — if the caller is about to hard-navigate away, use
 * `fireLeadConversionAndFlush` instead so the GA4 hit isn't lost.
 */
export function fireLeadConversion(args: FireLeadConversionArgs): void {
  fireNetworks(args);
}

/**
 * Same as `fireLeadConversion`, but resolves once GA4 has flushed the
 * `generate_lead` hit (via gtag's `event_callback`) or after `maxWaitMs`,
 * whichever comes first. Await this before a hard `window.location.href`
 * navigation — gtag loads `lazyOnload` and a redirect can otherwise race
 * the hit out of existence. Resolves immediately when gtag is unavailable.
 */
export function fireLeadConversionAndFlush(
  args: FireLeadConversionArgs,
  maxWaitMs = 400,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (): void => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    // Hard ceiling even if gtag's event_callback never fires (ad blockers
    // swallow the hit without invoking callbacks).
    setTimeout(settle, maxWaitMs);
    fireNetworks(args, settle, maxWaitMs);
  });
}
