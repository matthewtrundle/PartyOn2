/**
 * Partner Outreach 2.0 — discovery-import dedupe rules (pure).
 *
 * A "discover <city> <vertical>" session produces DiscoveryCandidate records;
 * scripts/import-discovered-prospects.ts builds a DedupeContext from the DB
 * and classifies every candidate through classifyCandidate() before insert.
 * Pure so the whole skip-reason matrix is unit tested.
 *
 * Skip reasons:
 *   existing-website       — website_key already in partner_prospects (exact)
 *   existing-host          — same bare host already prospected (Vacasa-type
 *                            chains: one outreach thread per company, ever)
 *   suppressed-email       — candidate email is on the suppression list
 *   affiliate-exists       — candidate email belongs to a signed Affiliate
 *   existing-partner-lead  — candidate email already has a partner-prospect Lead
 */

import { websiteKey } from '@/lib/partners/prospect-store';
import type { DiscoveryCandidate } from './schemas';

/** The Austin-delivery-footprint no-go areas (warning, not a hard block). */
export const FOOTPRINT_NO_GO = [
  'round rock',
  'pflugerville',
  'leander',
  'dripping springs',
  'buda',
  'kyle',
];

export interface DedupeContext {
  /** Full website keys (host+path) already in partner_prospects. */
  existingWebsiteKeys: Set<string>;
  /** Bare hosts already in partner_prospects. */
  existingHosts: Set<string>;
  /** Lowercased emails of signed Affiliates. */
  affiliateEmails: Set<string>;
  /** Lowercased emails of Leads tagged partner-prospect. */
  partnerLeadEmails: Set<string>;
  /** Lowercased suppressed emails (from email_suppressions). */
  suppressedEmails: Set<string>;
}

export type CandidateVerdict =
  | { ok: true; websiteKey: string }
  | { ok: false; reason: string; websiteKey: string };

/** Bare host of a website key ("vacasa.com/tx/austin" → "vacasa.com"). */
export function hostOfKey(key: string): string {
  return key.split('/')[0] ?? key;
}

/** Classify one discovery candidate against the dedupe context. */
export function classifyCandidate(
  candidate: DiscoveryCandidate,
  ctx: DedupeContext
): CandidateVerdict {
  const key = websiteKey(candidate.website);
  if (ctx.existingWebsiteKeys.has(key)) {
    return { ok: false, reason: 'existing-website', websiteKey: key };
  }
  if (ctx.existingHosts.has(hostOfKey(key))) {
    return { ok: false, reason: 'existing-host', websiteKey: key };
  }
  const email = candidate.email?.toLowerCase().trim();
  if (email) {
    if (ctx.suppressedEmails.has(email)) {
      return { ok: false, reason: 'suppressed-email', websiteKey: key };
    }
    if (ctx.affiliateEmails.has(email)) {
      return { ok: false, reason: 'affiliate-exists', websiteKey: key };
    }
    if (ctx.partnerLeadEmails.has(email)) {
      return { ok: false, reason: 'existing-partner-lead', websiteKey: key };
    }
  }
  return { ok: true, websiteKey: key };
}

/** True when text mentions a delivery-footprint no-go area (warn, don't block). */
export function footprintWarning(candidate: DiscoveryCandidate): string | null {
  const haystack = `${candidate.name} ${candidate.whyFit}`.toLowerCase();
  const hit = FOOTPRINT_NO_GO.find((area) => haystack.includes(area));
  return hit ? `mentions no-go area "${hit}" — operator call` : null;
}
