/**
 * Active experiment registry.
 *
 * Source of truth for which experiments are running on which pages,
 * with their variant content. Read by both:
 *   - Landing pages / modals to pull the right variant via useVariant
 *   - The admin Experiments tab to show what's live + their splits
 *
 * Each entry has:
 *   - key: stable identifier used for variant assignment + LeadEvent
 *     metadata. NEVER change once an experiment is live (would
 *     re-randomize every cookie's bucket and invalidate the data).
 *   - status: only RUNNING experiments are actually applied; DRAFT lets
 *     you stage copy without affecting prod.
 *   - pages: glob-style patterns where the experiment applies
 *   - variants: ordered, first one is control
 *   - hypothesis + primaryMetric: shown in the admin UI as context
 */

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';

export type ExperimentVariantDef<TPayload = Record<string, unknown>> = {
  key: string;
  label: string;
  description?: string;
  /** Variant-specific copy / config. Type-safe per experiment via generics. */
  payload: TPayload;
};

export type ExperimentDef<TPayload = Record<string, unknown>> = {
  key: string;
  label: string;
  hypothesis: string;
  primaryMetric: 'conversion' | 'checkout_start' | 'modal_open' | 'cta_click';
  pages: string[];
  status: ExperimentStatus;
  /** First variant is treated as control. Equal-weight split for now. */
  variants: ExperimentVariantDef<TPayload>[];
  /** Created date — displayed in admin. */
  createdAt: string;
};

// ─── Specific experiment payload types ──────────────────────────────

export type BachelorHeroPayload = {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  subhead: string;
};

export type CtaCopyPayload = {
  primary: string;
  secondary?: string;
};

// ─── The roster ─────────────────────────────────────────────────────

export const EXPERIMENTS: ExperimentDef[] = [
  {
    key: 'bachelor-hero-headline-v1',
    label: 'Bachelor — hero headline tone',
    hypothesis:
      'A more direct, benefit-led headline (variant B) will out-convert ' +
      'the tongue-in-cheek control by 10%+ on package-card-click rate.',
    primaryMetric: 'modal_open',
    pages: ['/austin-bachelor-party-delivery'],
    status: 'running',
    createdAt: '2026-05-14',
    variants: [
      {
        key: 'control',
        label: 'Control (current copy)',
        payload: {
          eyebrow: 'AUSTIN BACHELOR PARTY ALCOHOL DELIVERY',
          headline: 'Stocked & Ice-Cold',
          headlineAccent: 'Before The Groom Lands.',
          subhead:
            "Beer, liquor, mixers and ice delivered cold to your Airbnb, hotel, party bus, or Lake Travis dock. Skip the store run. Order in 30 seconds — we'll handle the rest.",
        } satisfies BachelorHeroPayload,
      },
      {
        key: 'benefit-led',
        label: 'B — Benefit-led',
        payload: {
          eyebrow: 'AUSTIN BACHELOR WEEKEND · ALCOHOL DELIVERY',
          headline: 'Skip the Costco Run.',
          headlineAccent: 'Drinks Delivered Cold.',
          subhead:
            "One link in the group chat. Everyone adds what they want, splits the tab, and we deliver it ice-cold to the Airbnb, dock, or party bus. Done in 30 seconds.",
        } satisfies BachelorHeroPayload,
      },
    ],
  },
  {
    key: 'bachelor-primary-cta-v1',
    label: 'Bachelor — primary CTA copy',
    hypothesis:
      "Action-led CTA ('Build my package') will out-click the curiosity " +
      "control ('Build your bach package') because it shifts the verb to first-person.",
    primaryMetric: 'cta_click',
    pages: ['/austin-bachelor-party-delivery'],
    status: 'running',
    createdAt: '2026-05-14',
    variants: [
      {
        key: 'control',
        label: 'Control',
        payload: { primary: 'BUILD YOUR BACH PACKAGE →' } satisfies CtaCopyPayload,
      },
      {
        key: 'first-person',
        label: 'B — First-person',
        payload: { primary: 'BUILD MY BACH PACKAGE →' } satisfies CtaCopyPayload,
      },
      {
        key: 'speed-led',
        label: 'C — Speed-led',
        payload: { primary: 'GET ICE-COLD DRINKS DELIVERED →' } satisfies CtaCopyPayload,
      },
    ],
  },
];

/**
 * Find experiments that should apply to a given pathname. Returns
 * matches in registry order.
 */
export function experimentsForPath(pathname: string): ExperimentDef[] {
  return EXPERIMENTS.filter(
    (e) =>
      e.status === 'running' &&
      e.pages.some((pat) => globMatch(pat, pathname)),
  );
}

function globMatch(pattern: string, path: string): boolean {
  if (pattern === '*') return true;
  if (!pattern.includes('*')) return pattern === path;
  const re = new RegExp(
    '^' +
      pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') +
      '$',
  );
  return re.test(path);
}

export function findExperiment(key: string): ExperimentDef | undefined {
  return EXPERIMENTS.find((e) => e.key === key);
}
