/**
 * Lead-magnet trigger configuration.
 *
 * Edit this file to control:
 *   - Which lead magnets exist
 *   - Which pages each one fires on
 *   - How long / how far / what kind of trigger
 *
 * The LeadMagnetController component reads this on mount and wires up
 * the matching triggers per page.
 */

export type TriggerRule =
  | { type: 'time'; seconds: number }
  | { type: 'scroll'; percent: number } // 0–100 of page scroll height
  | { type: 'manual' }; // only opens when something calls openLeadMagnet()

export type LeadMagnet = {
  /** Stable id, used to suppress repeat shows per browser per magnet. */
  id: string;
  /** Title shown above the form. */
  title: string;
  /** Sub-headline. */
  subhead: string;
  /** What the user gets after submitting. */
  reward: string;
  /** Path to a hero/preview image (rendered in the modal). */
  previewImage?: string;
  /** Path to the PDF / page they'll be sent to after submit. */
  rewardUrl: string;
  /**
   * Optional discount code delivered as the reward (shown in the success
   * state + welcome email). When set, the magnet is a "here's a code" offer
   * rather than a "here's a PDF" offer. Must be an existing, active Discount
   * row — see scripts/ops/create-lead-magnet-discounts.mjs.
   */
  rewardCode?: string;
  /** CTA button label. */
  cta: string;
  /** Whether to ask for phone in the form. */
  askPhone?: boolean;
  /** Color palette. */
  accent: { primary: string; primaryText: string; navy: string };
  /**
   * Glob-style page patterns where this magnet fires (matched against
   * window.location.pathname). Use '*' to match all pages.
   *
   * Examples:
   *   '/'                       → home page only
   *   '/austin-*-party-delivery' → all four landing pages
   *   '*'                       → every page
   */
  pages: string[];
  /** Pages to EXPLICITLY exclude (admin, ops, checkout, etc.). */
  excludePages?: string[];
  /** Triggers — ANY matching trigger fires the modal. */
  triggers: TriggerRule[];
  /**
   * How many days before we re-show the modal to the same browser.
   * 0 = always re-show on next page load.
   * 30 = wait 30 days before re-prompting.
   */
  cooldownDays: number;
  /** Set false to disable without deleting. */
  enabled: boolean;
};

/**
 * Default lead-magnet roster. The Fresh Victor cocktail-kit flyer is the
 * flagship — it's offered on every public-facing landing page.
 *
 * To add a new magnet: copy one of the entries below, give it a unique
 * id, point rewardUrl at a /flyer-style page or a PDF asset, and set
 * pages + triggers. The controller will pick it up automatically.
 */
export const LEAD_MAGNETS: LeadMagnet[] = [
  // ── Free-delivery asks on two high-traffic pages that produced ZERO leads ──
  // Both pages get thousands of landing sessions and had no ask at all. The
  // reward is a free-delivery code (FREE_SHIPPING discount, margin-safe — waives
  // the delivery fee, never touches the product-margin floor). Codes must exist
  // as active Discount rows: see scripts/ops/create-lead-magnet-discounts.mjs.
  // Listed BEFORE the flyer magnet so their specific page matches win first.
  {
    id: 'bday-free-delivery-2026',
    title: 'Free Delivery on Your Birthday Order',
    subhead: 'Planning an Austin birthday? Get your first delivery free.',
    reward: 'A free-delivery code for your first Austin order',
    previewImage: '/images/gallery/party-headquarters.webp',
    rewardUrl: '/order',
    rewardCode: 'BDAYPARTY',
    cta: 'Get my free delivery →',
    askPhone: true,
    accent: { primary: '#D4AF37', primaryText: '#0A1F33', navy: '#0A1F33' },
    // Exact path — pathMatches treats a pattern with no '*' as an exact match.
    pages: ['/blog/15-unique-birthday-party-ideas-in-austin-for-adults'],
    triggers: [
      { type: 'time', seconds: 25 },
      { type: 'scroll', percent: 55 },
      { type: 'manual' },
    ],
    cooldownDays: 7,
    enabled: true,
  },
  {
    id: 'products-free-delivery-2026',
    title: 'Free Delivery on Your First Order',
    subhead: 'Building your order? We deliver it free — beer, wine, liquor, ice.',
    reward: 'A free-delivery code for your first Austin order',
    previewImage: '/images/products/delivery-bag-contents.webp',
    rewardUrl: '/order',
    rewardCode: 'STOCKED',
    cta: 'Get my free delivery →',
    askPhone: true,
    accent: { primary: '#D4AF37', primaryText: '#0A1F33', navy: '#0A1F33' },
    // Both entries needed: a glob ('/products/*') does NOT match the bare
    // '/products', and the exact '/products' does not match handle pages.
    pages: ['/products', '/products/*'],
    triggers: [
      { type: 'time', seconds: 25 },
      { type: 'scroll', percent: 55 },
      { type: 'manual' },
    ],
    cooldownDays: 7,
    enabled: true,
  },
  {
    id: 'pod-services-flyer-2026',
    title: 'The Party On Delivery Playbook',
    subhead:
      'Every service we offer in one luxury flyer — alcohol delivery, party rentals, full bar setup, Fresh Victor cocktail kits, and concierge event planning.',
    reward: 'Free downloadable PDF + behind-the-scenes look at our cocktail kits',
    previewImage: '/images/services/bach-parties/bachelor-party-epic.webp',
    rewardUrl: '/flyer',
    cta: 'Get the playbook →',
    askPhone: true,
    accent: { primary: '#D4AF37', primaryText: '#0A1F33', navy: '#0A1F33' },
    pages: ['/', '/services/*', '/flyer'],
    excludePages: [
      '/admin/*',
      '/ops/*',
      '/dashboard/*',
      '/checkout/*',
      '/invoice/*',
      '/cart/*',
      '/api/*',
      '/partners/*',
      '/affiliate/*',
      '/wedding-drink-calculator',
      '/event-quiz',
      // Paid-traffic landing pages — same reasoning as the two excludes
      // above: the popup fires (25s / 55% scroll) right as ad visitors
      // reach the packages section and competes with the page's own
      // higher-value builder/quick-buy conversion. The flyer stays
      // available on the homepage, /services, and /flyer.
      '/austin-bachelor-party-delivery',
      '/austin-bachelorette-party-delivery',
      '/austin-corporate-event-delivery',
      '/austin-wedding-weekend-delivery',
    ],
    triggers: [
      { type: 'time', seconds: 25 },
      { type: 'scroll', percent: 55 },
      { type: 'manual' },
    ],
    cooldownDays: 7,
    enabled: true,
  },
];

/**
 * Default magnet used by the "preview flyer" button on the flyer page —
 * always renders, no trigger gating.
 */
export const PRIMARY_FLYER_MAGNET_ID = 'pod-services-flyer-2026';

export function findMagnet(id: string): LeadMagnet | undefined {
  return LEAD_MAGNETS.find((m) => m.id === id);
}

/**
 * localStorage keys for magnet suppression — shared by the controller (reads)
 * and the modal (writes the done flag on submit), so the two can never drift.
 *
 *   seen: timestamp of the last time the popup was SHOWN — drives the
 *         cooldownDays re-show window.
 *   done: set once on a successful SUBMIT — a converted visitor is suppressed
 *         permanently, not just for the cooldown window.
 */
export function magnetSeenKey(id: string): string {
  return `pod_lm_seen_${id}`;
}
export function magnetDoneKey(id: string): string {
  return `pod_lm_done_${id}`;
}

/**
 * Does `path` match any of the supplied glob-ish patterns?
 *   '*'          → matches everything
 *   '/admin/*'   → matches /admin/anything
 *   '/flyer'     → exact match
 */
export function pathMatches(path: string, patterns: string[]): boolean {
  return patterns.some((pat) => {
    if (pat === '*') return true;
    if (!pat.includes('*')) return path === pat;
    const regex = new RegExp(
      '^' + pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
    );
    return regex.test(path);
  });
}
