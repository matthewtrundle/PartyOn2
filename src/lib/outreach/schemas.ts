/**
 * Partner Outreach 2.0 — Zod contracts for session-produced research data.
 *
 * Discovery, enrichment, and drafting run in Claude Code sessions on the
 * subscription (locked decision 2026-07-22 — the site makes NO Anthropic API
 * calls in v1). The session assembles JSON in its scratchpad and the vetted
 * import scripts (scripts/import-prospect-*.ts) validate every record against
 * these schemas before anything touches the database. Unknown prospect ids,
 * schema mismatches, and suppressed emails are rejected at import.
 */

import { z } from 'zod';

/**
 * http(s)-only URL. Zod's .url() accepts javascript:/data: URIs — but these
 * fields are rendered as <a href> in the admin panel, and enrichment text is
 * scraped from adversarial external pages, so the import boundary is where
 * dangerous schemes must die (stored-XSS guard, CWE-79).
 */
export const httpUrlSchema = z.string().refine(
  (v) => {
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  },
  { message: 'must be an http(s) URL' }
);

/** One personalization hook — a short, source-cited fact about the prospect. */
export const HookSchema = z.object({
  /** ≤25 words, a single concrete claim (word-bound enforced by draft-lint). */
  text: z.string().min(5).max(300),
  /** Where the claim was read — spot-checked against the live page. */
  sourceUrl: httpUrlSchema,
  /** What kind of hook this is (drives the opener formula). */
  kind: z.enum(['review', 'press', 'website', 'social', 'listing', 'other']),
});
export type Hook = z.infer<typeof HookSchema>;

/** Direct contact discovered during research. */
export const ContactSchema = z.object({
  email: z.string().email().nullable(),
  contactName: z.string().max(120).nullable(),
  phone: z.string().max(40).nullable(),
  /** Page the contact info was found on. */
  sourceUrl: httpUrlSchema.nullable(),
});

/**
 * The dossier stored in partner_prospects.enrichment. The first five sections
 * keep the exact shape ProspectEnrichmentPanel already renders; contact /
 * hooks / sources / siteAccess are the 2.0 additions. NEVER contains
 * outreachEmail — drafts live in the draft_* columns.
 */
export const EnrichmentSchema = z.object({
  management: z.object({
    ownerName: z.string().nullable(),
    ownerNotes: z.string().nullable(),
    team: z.string().nullable(),
    /** Rendered as an href in the admin panel — http(s) only. */
    linkedin: httpUrlSchema.nullable(),
    operatingSince: z.string().nullable(),
    entity: z.string().nullable(),
  }),
  portfolio: z.object({
    propertyCount: z.string(),
    propertyTypes: z.string(),
    locations: z.string(),
    maxGroupSize: z.string().nullable(),
    notableProperties: z.array(z.object({ name: z.string(), blurb: z.string() })),
  }),
  business: z.object({
    bookingModel: z.string(),
    services: z.string(),
    positioning: z.string(),
    guestDemographic: z.string(),
  }),
  reputation: z.object({
    summary: z.string(),
    ratings: z.string().nullable(),
    praiseThemes: z.string().nullable(),
  }),
  partnershipAngles: z.array(z.string()).min(1),
  contact: ContactSchema,
  /** 3–5 source-cited hooks; the drafter uses exactly one. */
  hooks: z.array(HookSchema).min(1).max(6),
  /** Every URL consulted during research. */
  sources: z.array(httpUrlSchema).min(1),
  /** 'blocked' rows get a badge; ScrapingBee only if these pile up. */
  siteAccess: z.enum(['ok', 'partial', 'blocked']),
});
export type Enrichment = z.infer<typeof EnrichmentSchema>;

/** One enrichment import record: prospect row id + the dossier. */
export const EnrichmentImportSchema = z.object({
  id: z.string().min(1),
  enrichment: EnrichmentSchema,
  /** Optional error instead of a dossier is NOT allowed here — failed
   * research is reported by the session, not imported. */
});

/** One 3-touch draft produced by a drafting session. */
export const DraftSchema = z.object({
  /** partner_prospects row id the draft belongs to. */
  id: z.string().min(1),
  /** lowercase 1–3 words (draft-lint enforces). */
  subject: z.string().min(2).max(80),
  /** Distinct subject for the touch-2 "no open recorded" resend branch. */
  altSubject: z.string().min(2).max(80),
  /** 60–110 words, signature-free, exactly one cited hook (draft-lint). */
  body: z.string().min(50).max(2000),
  /** Touch-2 substantive bump (opened but unanswered), ≤90 words. */
  followUpBody: z.string().min(20).max(1500),
  /** Touch-3 standalone poke-the-bear / soft close, ≤90 words. */
  touch3Body: z.string().min(20).max(1500),
  /** The single hook the body uses — must come from the dossier's hooks. */
  hook: HookSchema,
  /**
   * A/B first-touch TEST arm this draft's copy was written for: 'A' (short) or
   * 'B' (detailed). Each prospect is randomized to one arm and drafted in that
   * one style, so this only labels the single draft — there is no second copy
   * slot. (Not the draftB* "variant B" preserved original.) Null/omitted = not
   * part of an A/B test.
   */
  arm: z.enum(['A', 'B']).nullable().optional(),
  /** Names the A/B test, so results from separate tests stay separable. */
  experimentKey: z.string().max(80).nullable().optional(),
});
export type Draft = z.infer<typeof DraftSchema>;

/** One discovery candidate from a "discover <city> <vertical>" session. */
export const DiscoveryCandidateSchema = z.object({
  name: z.string().min(2).max(200),
  website: httpUrlSchema,
  /** One sentence on why this company fits the vertical. */
  whyFit: z.string().min(10).max(500),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  instagram: z.string().max(200).nullable().optional(),
  propertiesEstimate: z.string().max(80).nullable().optional(),
});
export type DiscoveryCandidate = z.infer<typeof DiscoveryCandidateSchema>;
