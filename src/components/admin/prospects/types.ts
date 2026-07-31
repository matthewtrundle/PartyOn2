/**
 * Prospects workbench — shared client types + per-vertical UI config.
 *
 * The row type is the store's StoredProspect (type-only import — no server
 * code reaches the client bundle). Pipeline status is DERIVED from row
 * columns + the campaign map (GET /partner-prospects/sync); there is no
 * stored mega-status.
 */

import type { StoredProspect } from '@/lib/partners/prospect-store';

export type ProspectRow = StoredProspect;

/** Campaign state per websiteKey from GET /partner-prospects/sync. */
export interface LeadState {
  leadId: string;
  tags: string[];
  campaign: string; // none | enrolled | sent | replied
  suppressed?: boolean;
}

/** Derived pipeline status, in display-precedence order. */
export type PipelineStatus =
  | 'SUPPRESSED'
  | 'REPLIED'
  | 'SENT'
  | 'ENROLLED'
  | 'APPROVED'
  | 'VERIFIED'
  | 'DRAFTED'
  | 'ENRICHED'
  | 'SOURCED';

/**
 * A/B test-arm chip (first-touch copy test): A = short, B = detailed. Named
 * "arm" (not "variant") to stay clear of the draftB* "variant B" preserved
 * original. Fuchsia for A is deliberately off the teal used by the VERIFIED
 * status chip so the two don't blur when a verified row also carries an arm.
 */
export const ARM_CHIP: Record<string, { label: string; cls: string }> = {
  A: { label: 'A · short', cls: 'bg-fuchsia-100 text-fuchsia-800' },
  B: { label: 'B · detailed', cls: 'bg-indigo-100 text-indigo-800' },
};

/**
 * True when the email counts as sendable-verified — mirrors enrollGateReason.
 * Anything ZeroBounce could check and did not call INVALID is sendable.
 */
export function isEmailVerified(p: ProspectRow): boolean {
  return (
    p.emailVerifyStatus === 'VALID' ||
    p.emailVerifyStatus === 'CATCH_ALL' ||
    p.emailVerifyStatus === 'ROLE'
  );
}

/** Derive the pipeline status chip for a row (highest precedence wins). */
export function deriveStatus(p: ProspectRow, state?: LeadState): PipelineStatus {
  if (state?.suppressed) return 'SUPPRESSED';
  if (state?.campaign === 'replied') return 'REPLIED';
  if (state?.campaign === 'sent') return 'SENT';
  if (state?.campaign === 'enrolled') return 'ENROLLED';
  if (p.draftStatus === 'APPROVED') return 'APPROVED';
  if (isEmailVerified(p)) return 'VERIFIED';
  if (p.draftStatus === 'DRAFTED') return 'DRAFTED';
  if (p.researchStatus === 'ENRICHED') return 'ENRICHED';
  return 'SOURCED';
}

/** FAILED overlay dot: something in the pipeline errored for this row. */
export function hasFailure(p: ProspectRow): boolean {
  return p.researchStatus === 'FAILED' || p.draftStatus === 'FAILED';
}

/** Reason a row can't be selected for enrollment (checkbox tooltip). */
export function enrollDisableReason(p: ProspectRow, state?: LeadState): string | null {
  if (!p.email) return 'No email — enrich or edit first';
  if (state?.suppressed) return 'Suppressed (unsubscribe/bounce)';
  if (!state) return 'Run Sync to CRM first';
  if (state.campaign !== 'none') return `Already ${state.campaign}`;
  return null;
}

/**
 * Drain items through an async worker with bounded concurrency (bulk
 * verify runs 3 wide). Returns the number of items processed.
 */
export async function drainQueue<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency = 3
): Promise<number> {
  let done = 0;
  const queue = [...items];
  const run = async (): Promise<void> => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      await worker(item);
      done++;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, run));
  return done;
}

/**
 * Workbench page path per vertical — used by the campaign panel's
 * drill-through to open a prospect on another vertical's page
 * (`?prospect=<websiteKey>`). Mirrors the sync route's source pages.
 */
export const VERTICAL_PATHS: Record<string, string> = {
  str: '/admin/affiliates/prospects/str',
  bartender: '/admin/affiliates/prospects/bartending',
  venue: '/admin/affiliates/prospects/venues',
};

export interface VerticalUiConfig {
  title: string;
  intro: string;
  /** Table column header for propertiesEstimate. */
  sizeLabel: string;
  portfolioLabels: {
    heading: string;
    count: string;
    types: string;
    locations: string;
    maxGroupSize: string;
  };
  /** AffiliateCategory used in the bulk-import CSV. */
  csvCategory: string;
}

export const VERTICAL_UI: Record<string, VerticalUiConfig> = {
  str: {
    title: 'STR Partners — Austin prospect list',
    intro:
      'Austin short-term-rental companies (~5+ homes) with everything needed to build their partner page and reach out.',
    sizeLabel: 'Homes',
    portfolioLabels: {
      heading: 'Portfolio',
      count: 'Properties',
      types: 'Types',
      locations: 'Locations',
      maxGroupSize: 'Largest groups',
    },
    csvCategory: 'LODGING',
  },
  bartender: {
    title: 'Bartending Partners — Austin prospect list',
    intro:
      'Austin bartending and event-bar services — POD is their supply chain (stocked, iced, delivered to the gig) plus a two-way referral loop.',
    sizeLabel: 'Scale',
    portfolioLabels: {
      heading: 'Operation',
      count: 'Team / scale',
      types: 'Service types',
      locations: 'Service area',
      maxGroupSize: 'Largest events',
    },
    csvCategory: 'BARTENDER',
  },
  venue: {
    title: 'BYOB Venues — Austin prospect list',
    intro:
      'Austin event venues with BYOB / open-vendor alcohol policies — their policy becomes a selling point with a venue-branded ordering page.',
    sizeLabel: 'Capacity',
    portfolioLabels: {
      heading: 'Venue',
      count: 'Capacity',
      types: 'Space types',
      locations: 'Area',
      maxGroupSize: 'Largest events',
    },
    csvCategory: 'VENUE',
  },
};
