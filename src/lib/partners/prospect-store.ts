/**
 * DB-backed partner-prospect store (partner_prospects table) — replaces the
 * static JSON lists in prospect-datasets.ts as the single source of truth
 * for the Partner Outreach pipeline. Seeded once by
 * scripts/seed-partner-prospects.ts; discovery/enrichment/drafting sessions
 * write through the vetted import scripts.
 *
 * Read shapes stay compatible with the existing prospect views: enrichment
 * is stored WITHOUT outreachEmail (drafts live in draft_* columns), and
 * toProspectRecord() reassembles enrichment.outreachEmail from the draft
 * columns so ProspectEnrichmentPanel and the tables render unchanged.
 */

import type { PartnerProspect } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import type { PartnerVertical } from '@/lib/leads/partner-tags';

/**
 * Normalize a website URL to the stable dedupe key (host + path, no www).
 * Lead.metadata.websiteKey in prod was computed with exactly this function —
 * never change its behavior without a backfill plan.
 */
export function websiteKey(website: string): string {
  try {
    const u = new URL(website);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return website.toLowerCase();
  }
}

/**
 * Deterministic 50/50 A/B arm from a stable seed (the prospect's websiteKey).
 * NOTE: "arm" here is the first-touch copy TEST bucket (A=short, B=detailed) —
 * distinct from the draftB* "variant B" columns (#309), which preserve the
 * original email. Same djb2-style hash the web-experiment assigner uses, kept
 * local so the outreach pipeline doesn't depend on the cookie/web-experiment
 * module. Only a SAFETY NET: the drafting session normally sets abArm to match
 * the style it actually wrote; this labels any prospect that reached enroll
 * without one, so no sent prospect is unbucketed in the results.
 */
export function assignAbArm(seed: string): 'A' | 'B' {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash) % 2 === 0 ? 'A' : 'B';
}

/** Loose dossier shape — the UI owns the render contract, we pass through. */
export type ProspectEnrichment = Record<string, unknown> & {
  outreachEmail?: { subject: string; body: string };
};

/**
 * Row shape handed to the prospect views/routes. Superset of the old
 * ProspectRecord from prospect-datasets.ts, plus pipeline columns.
 */
export interface StoredProspect {
  id: string;
  vertical: PartnerVertical;
  city: string;
  name: string;
  website: string;
  websiteKey: string;
  propertiesEstimate: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  socials: Record<string, string | null>;
  logoUrl: string | null;
  description: string;
  partnerSlug: string | null;
  leadId: string | null;
  source: string;
  researchStatus: string;
  researchError: string | null;
  enrichment: ProspectEnrichment | null;
  draftStatus: string;
  draftSubject: string | null;
  draftAltSubject: string | null;
  draftBody: string | null;
  draftFollowUpBody: string | null;
  draftTouch3Body: string | null;
  draftHook: Record<string, unknown> | null;
  draftError: string | null;
  draftRedoGuidance: string | null;
  /** Variant B: the original enrichment-based personalized email (read-only). */
  draftBSubject: string | null;
  draftBBody: string | null;
  draftBSource: string | null;
  /** A/B first-touch TEST arm ('A' short | 'B' detailed); null when not in a
   * test. Not the draftB* "variant B" above — that's the preserved original. */
  abArm: string | null;
  experimentKey: string | null;
  emailVerifyStatus: string;
  emailVerifyOverride: boolean;
  emailVerifiedAt: string | null;
}

/** A prospect's outreach draft, read fresh at send time. */
export interface SendableDraft {
  subject: string;
  altSubject: string | null;
  body: string;
  followUpBody: string | null;
  touch3Body: string | null;
}

function toProspectRecord(row: PartnerProspect): StoredProspect {
  const dossier =
    typeof row.enrichment === 'object' && row.enrichment !== null && !Array.isArray(row.enrichment)
      ? ({ ...(row.enrichment as Record<string, unknown>) } as ProspectEnrichment)
      : null;
  // Legacy view compatibility: the enrichment dropdown + test-send flow read
  // enrichment.outreachEmail — rebuild it from the draft columns.
  const enrichment =
    dossier && row.draftSubject && row.draftBody
      ? { ...dossier, outreachEmail: { subject: row.draftSubject, body: row.draftBody } }
      : dossier;
  return {
    id: row.id,
    vertical: row.vertical as PartnerVertical,
    city: row.city,
    name: row.name,
    website: row.website,
    websiteKey: row.websiteKey,
    propertiesEstimate: row.propertiesEstimate ?? '',
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    socials:
      typeof row.socials === 'object' && row.socials !== null && !Array.isArray(row.socials)
        ? (row.socials as Record<string, string | null>)
        : {},
    logoUrl: row.logoUrl,
    description: row.description,
    partnerSlug: row.partnerSlug,
    leadId: row.leadId,
    source: row.source,
    researchStatus: row.researchStatus,
    researchError: row.researchError,
    enrichment,
    draftStatus: row.draftStatus,
    draftSubject: row.draftSubject,
    draftAltSubject: row.draftAltSubject,
    draftBody: row.draftBody,
    draftFollowUpBody: row.draftFollowUpBody,
    draftTouch3Body: row.draftTouch3Body,
    draftHook:
      typeof row.draftHook === 'object' && row.draftHook !== null && !Array.isArray(row.draftHook)
        ? (row.draftHook as Record<string, unknown>)
        : null,
    draftError: row.draftError,
    draftRedoGuidance: row.draftRedoGuidance,
    draftBSubject: row.draftBSubject,
    draftBBody: row.draftBBody,
    draftBSource: row.draftBSource,
    abArm: row.abArm,
    experimentKey: row.experimentKey,
    emailVerifyStatus: row.emailVerifyStatus,
    emailVerifyOverride: row.emailVerifyOverride,
    emailVerifiedAt: row.emailVerifiedAt ? row.emailVerifiedAt.toISOString() : null,
  };
}

/** List prospects, optionally filtered by vertical and/or city. */
export async function listProspects(filter?: {
  vertical?: string;
  city?: string;
}): Promise<StoredProspect[]> {
  const rows = await prisma.partnerProspect.findMany({
    where: {
      ...(filter?.vertical ? { vertical: filter.vertical } : {}),
      ...(filter?.city ? { city: filter.city } : {}),
    },
    orderBy: [{ name: 'asc' }],
  });
  return rows.map(toProspectRecord);
}

/** Find one prospect by website (websiteKey match, same key as sync/enroll). */
export async function getProspectByWebsite(website: string): Promise<StoredProspect | null> {
  const row = await prisma.partnerProspect.findUnique({
    where: { websiteKey: websiteKey(website) },
  });
  return row ? toProspectRecord(row) : null;
}

/** Find one prospect by row id. */
export async function getProspectById(id: string): Promise<StoredProspect | null> {
  const row = await prisma.partnerProspect.findUnique({ where: { id } });
  return row ? toProspectRecord(row) : null;
}

/**
 * The outreach draft for a website, or null when there is nothing sendable.
 * APPROVED only — a human explicitly approves every email that can leave
 * the building (DRAFTED sent during the pre-2.0 parity window only; zero
 * real sends ever fired under that rule).
 */
export async function getSendableDraft(website: string): Promise<SendableDraft | null> {
  const row = await prisma.partnerProspect.findUnique({
    where: { websiteKey: websiteKey(website) },
    select: {
      draftStatus: true,
      draftSubject: true,
      draftAltSubject: true,
      draftBody: true,
      draftFollowUpBody: true,
      draftTouch3Body: true,
    },
  });
  if (!row) return null;
  if (row.draftStatus !== 'APPROVED') return null;
  if (!row.draftSubject || !row.draftBody) return null;
  return {
    subject: sanitizeSubject(row.draftSubject),
    altSubject: row.draftAltSubject ? sanitizeSubject(row.draftAltSubject) : null,
    body: row.draftBody,
    followUpBody: row.draftFollowUpBody,
    touch3Body: row.draftTouch3Body,
  };
}

/**
 * Defense-in-depth at the send-path read boundary: subjects are single-line
 * and bounded no matter what a future draft writer stores (stray newlines
 * render oddly in some clients; Resend takes JSON so this is hygiene, not
 * header-injection protection).
 */
function sanitizeSubject(subject: string): string {
  return subject.replace(/\s+/g, ' ').trim().slice(0, 200);
}
