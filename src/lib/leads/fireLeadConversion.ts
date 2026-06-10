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
      'package-builder'. Lets GA4 split conversion by entry point. */
  placement: string;
  /** Optional numeric value (e.g. estimated drink count). Defaults to 0. */
  value?: number;
};

/**
 * Fires the cross-network "a lead was generated" conversion in one place:
 * Meta `Lead` + GA4 `generate_lead` + (env-gated) Google Ads direct-fire
 * `conversion`. Every call is guarded so a missing pixel / env var is a
 * silent no-op.
 *
 * Shared by every quote/lead entry point (wedding calculator + landing-page
 * package builder) so the event schema stays identical everywhere and a new
 * landing page becomes trackable just by calling this on submit success.
 */
export function fireLeadConversion({
  occasion,
  placement,
  value = 0,
}: FireLeadConversionArgs): void {
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
    });

    const conversionId = process.env.NEXT_PUBLIC_GADS_QUOTE_CONVERSION_ID;
    if (conversionId) {
      window.gtag('event', 'conversion', {
        send_to: conversionId,
        value: 0,
        currency: 'USD',
      });
    }
  }
}
