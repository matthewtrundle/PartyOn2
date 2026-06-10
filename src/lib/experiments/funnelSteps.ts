/**
 * Canonical funnel step taxonomy.
 *
 * Every step a visitor can take on a landing page → checkout. Each step
 * fires a LeadEvent with `metadata.step = '<step-key>'` so the
 * Experiments & Funnels admin view can compute drop-off rates per step
 * and per experiment variant.
 *
 * Steps are ORDERED — drop-off is computed left-to-right. New steps
 * should be inserted at the right position so the funnel chart stays
 * chronologically correct.
 *
 * Adding a step? Two-step process:
 *   1. Add it here + bump the chronological order
 *   2. Fire `trackFunnelStep({ step })` from the new touchpoint
 */

export type FunnelStep =
  // ─── 1. Awareness ────────────────────────────────────────────
  | 'landing_view'              // landing page rendered
  | 'hero_cta_click'            // primary CTA clicked
  // ─── 2. Package selection ────────────────────────────────────
  | 'package_card_view'         // package card scrolled into view
  | 'package_card_click'        // package card clicked
  | 'quickbuy_open'             // Quick-Buy modal opened
  | 'builder_open'              // Package Builder modal opened
  // ─── 3. In-modal progression ────────────────────────────────
  | 'builder_step_basics'
  | 'builder_step_beer'
  | 'builder_step_liquor'
  | 'builder_step_mixers'
  | 'builder_step_review'
  // ─── 4. Contact + conversion ─────────────────────────────────
  | 'contact_filled'            // any of name/email/phone has a value
  | 'upsell_shown'              // upsell overlay popped
  | 'upsell_accepted'           // user clicked accept-upsell
  | 'checkout_start'            // hit pay-now / quote submit
  | 'conversion';               // webhook-confirmed payment

/**
 * Ordered list — used by the funnel chart to compute drop-off.
 *
 * Funnels are computed per route + (optional) experiment-key. Not every
 * funnel will hit every step — landing pages without a Package Builder
 * skip the builder_* steps entirely, the chart just renders them as N/A.
 */
export const FUNNEL_ORDER: FunnelStep[] = [
  'landing_view',
  'hero_cta_click',
  'package_card_view',
  'package_card_click',
  'quickbuy_open',
  'builder_open',
  'builder_step_basics',
  'builder_step_beer',
  'builder_step_liquor',
  'builder_step_mixers',
  'builder_step_review',
  'contact_filled',
  'upsell_shown',
  'upsell_accepted',
  'checkout_start',
  'conversion',
];

/** Pretty label shown in the admin chart. */
export const STEP_LABELS: Record<FunnelStep, string> = {
  landing_view: 'Landing page view',
  hero_cta_click: 'Hero CTA clicked',
  package_card_view: 'Package card seen',
  package_card_click: 'Package card clicked',
  quickbuy_open: 'Quick-Buy opened',
  builder_open: 'Package Builder opened',
  builder_step_basics: 'Builder · Basics',
  builder_step_beer: 'Builder · Beer',
  builder_step_liquor: 'Builder · Liquor',
  builder_step_mixers: 'Builder · Mixers',
  builder_step_review: 'Builder · Review',
  contact_filled: 'Contact info filled',
  upsell_shown: 'Upsell overlay shown',
  upsell_accepted: 'Upsell accepted',
  checkout_start: 'Checkout started',
  conversion: 'Order paid (conversion)',
};

/**
 * Default "thin" funnel used by the admin chart when no specific landing
 * page is selected. Captures the must-track conversion narrative without
 * the in-modal noise.
 */
export const DEFAULT_FUNNEL: FunnelStep[] = [
  'landing_view',
  'package_card_click',
  'builder_open',
  'contact_filled',
  'checkout_start',
  'conversion',
];
