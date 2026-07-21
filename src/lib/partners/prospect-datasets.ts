/**
 * Server-side access to the partner-prospect databases (the JSON files
 * behind the Partners → STR/Bartending Prospects tabs), plus the shape
 * shared with the client views.
 */

import strData from '@/data/str-partner-prospects.json';
import bartendingData from '@/data/bartending-partner-prospects.json';
import type { PartnerVertical } from '@/lib/leads/partner-tags';

export interface ProspectRecord {
  name: string;
  website: string;
  propertiesEstimate: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  description: string;
  partnerSlug?: string | null;
  enrichment?: {
    outreachEmail: { subject: string; body: string };
  } | null;
}

export interface ProspectWithVertical extends ProspectRecord {
  vertical: PartnerVertical;
}

/** All prospects across both databases, stamped with their vertical. */
export function getAllProspects(): ProspectWithVertical[] {
  return [
    ...(strData as ProspectRecord[]).map((p) => ({ ...p, vertical: 'str' as const })),
    ...(bartendingData as ProspectRecord[]).map((p) => ({ ...p, vertical: 'bartender' as const })),
  ];
}

/** Normalize a website URL to a stable dedupe key (host + path, no www). */
export function websiteKey(website: string): string {
  try {
    const u = new URL(website);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return website.toLowerCase();
  }
}

/** Find one prospect by its website (exact key match). */
export function findProspectByWebsite(website: string): ProspectWithVertical | null {
  const key = websiteKey(website);
  return getAllProspects().find((p) => websiteKey(p.website) === key) ?? null;
}
