/**
 * Seed the partner_prospects table from the three legacy prospect sources:
 *
 *   - src/data/str-partner-prospects.json        → vertical 'str',       source 'seed-str'
 *   - src/data/bartending-partner-prospects.json → vertical 'bartender', source 'seed-bartending'
 *   - campaigns/byob-venue-partnership/data/venues.csv
 *                                                → vertical 'venue',     source 'seed-byob'
 *
 * Rules (approved plan, PR1):
 *   - website strings are copied VERBATIM — Lead.metadata.websiteKey in prod
 *     was computed from these exact strings and the dedupe key must keep
 *     matching. Venues have no websites; they get a 'venue:<name-slug>' key.
 *   - enrichment JSONB = the legacy enrichment minus outreachEmail; the
 *     outreachEmail subject/body move to draft_* columns as status DRAFTED
 *     (model 'legacy-manual') — never APPROVED: they predate the Hormozi
 *     draft rules and must be regenerated or explicitly approved.
 *   - legacy bodies end with an inline Brian signature; the send renderer
 *     now appends the signature itself, so it is stripped here.
 *   - idempotent: rows whose website_key already exists are SKIPPED, never
 *     overwritten (operator edits in the UI win over re-seeds).
 *
 * Usage (from the repo root, .env.local sourced for DATABASE_URL):
 *   npx tsx scripts/seed-partner-prospects.ts           # dry run (default)
 *   npx tsx scripts/seed-partner-prospects.ts --apply   # write rows
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '../src/lib/database/client';
import { websiteKey } from '../src/lib/partners/prospect-store';

const APPLY = process.argv.includes('--apply');
const ROOT = join(__dirname, '..');

interface LegacyProspect {
  name: string;
  website: string;
  propertiesEstimate?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  socials?: Record<string, string | null>;
  logoUrl?: string | null;
  description?: string;
  partnerSlug?: string | null;
  enrichment?: (Record<string, unknown> & {
    enrichedAt?: string;
    outreachEmail?: { subject: string; body: string };
  }) | null;
}

interface SeedRow {
  vertical: string;
  source: string;
  name: string;
  website: string;
  websiteKey: string;
  propertiesEstimate: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  socials: Record<string, string | null>;
  logoUrl: string | null;
  description: string;
  partnerSlug: string | null;
  enrichment: Record<string, unknown> | null;
  enrichedAt: Date | null;
  draftSubject: string | null;
  draftBody: string | null;
}

/**
 * Strip the trailing inline Brian signature (with optional "Cheers,"-style
 * sign-off line above it) from a legacy outreach body — the renderer now
 * appends the signature at send time.
 */
export function stripLegacySignature(body: string): string {
  const sigStart = body.lastIndexOf('Brian Hill\nFounder, Party On Delivery');
  if (sigStart === -1) return body.trim();
  let head = body.slice(0, sigStart).trimEnd();
  head = head.replace(/\n(Cheers|Best|Thanks|Talk soon|Cheers!)[,!]?$/i, '').trimEnd();
  return head;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fromLegacyJson(file: string, vertical: string, source: string): SeedRow[] {
  const data = JSON.parse(readFileSync(join(ROOT, file), 'utf8')) as LegacyProspect[];
  return data.map((p) => {
    const { outreachEmail, ...dossier } = p.enrichment ?? {};
    const hasDossier = p.enrichment != null && Object.keys(dossier).length > 0;
    const enrichedAtRaw = typeof dossier.enrichedAt === 'string' ? dossier.enrichedAt : null;
    const enrichedAt = enrichedAtRaw ? new Date(`${enrichedAtRaw}T00:00:00Z`) : null;
    return {
      vertical,
      source,
      name: p.name,
      website: p.website,
      websiteKey: websiteKey(p.website),
      propertiesEstimate: p.propertiesEstimate ?? null,
      contactName: p.contactName ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      socials: p.socials ?? {},
      logoUrl: p.logoUrl ?? null,
      description: p.description ?? '',
      partnerSlug: p.partnerSlug ?? null,
      enrichment: hasDossier ? (dossier as Record<string, unknown>) : null,
      enrichedAt: hasDossier ? (enrichedAt && !Number.isNaN(enrichedAt.getTime()) ? enrichedAt : new Date()) : null,
      draftSubject: outreachEmail?.subject ?? null,
      draftBody: outreachEmail?.body ? stripLegacySignature(outreachEmail.body) : null,
    };
  });
}

/** Minimal CSV parser (handles quoted fields with commas). */
function parseCsv(raw: string): Record<string, string>[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') {
          quoted = false;
        } else {
          cur += c;
        }
      } else if (c === '"') {
        quoted = true;
      } else if (c === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  const header = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim();
    });
    return row;
  });
}

function fromVenuesCsv(): SeedRow[] {
  const raw = readFileSync(join(ROOT, 'campaigns/byob-venue-partnership/data/venues.csv'), 'utf8');
  return parseCsv(raw).map((r) => {
    const name = r.venue_name;
    const website = r.website || '';
    const capacity =
      r.capacity_min && r.capacity_max
        ? `${r.capacity_min}–${r.capacity_max} guests`
        : r.capacity_max
          ? `up to ${r.capacity_max} guests`
          : null;
    const description = [
      [r.category, r.subcategory].filter(Boolean).join(' — '),
      r.byob_policy ? `BYOB policy: ${r.byob_policy}` : null,
      r.location_area ? `Area: ${r.location_area}` : null,
      r.event_types ? `Events: ${r.event_types}` : null,
      r.notes || null,
    ]
      .filter(Boolean)
      .join('. ');
    return {
      vertical: 'venue',
      source: 'seed-byob',
      name,
      website,
      websiteKey: website ? websiteKey(website) : `venue:${slugify(name)}`,
      propertiesEstimate: capacity,
      contactName: null,
      email: r.email || null,
      phone: r.phone || null,
      socials: {
        instagram: r.instagram || null,
        facebook: r.facebook || null,
      },
      logoUrl: null,
      description,
      partnerSlug: null,
      enrichment: null,
      enrichedAt: null,
      draftSubject: null,
      draftBody: null,
    };
  });
}

async function main(): Promise<void> {
  const rows: SeedRow[] = [
    ...fromLegacyJson('src/data/str-partner-prospects.json', 'str', 'seed-str'),
    ...fromLegacyJson('src/data/bartending-partner-prospects.json', 'bartender', 'seed-bartending'),
    ...fromVenuesCsv(),
  ];

  // Guard: seed sources must not collide with each other on website_key.
  const seen = new Map<string, string>();
  for (const row of rows) {
    const prior = seen.get(row.websiteKey);
    if (prior) {
      throw new Error(`duplicate website_key '${row.websiteKey}' (${prior} vs ${row.name})`);
    }
    seen.set(row.websiteKey, row.name);
  }

  const existing = await prisma.partnerProspect.findMany({
    select: { websiteKey: true },
  });
  const existingKeys = new Set(existing.map((r) => r.websiteKey));

  const toCreate = rows.filter((r) => !existingKeys.has(r.websiteKey));
  const skipped = rows.length - toCreate.length;

  const counts: Record<string, { create: number; drafted: number; enriched: number }> = {};
  for (const r of toCreate) {
    counts[r.vertical] ??= { create: 0, drafted: 0, enriched: 0 };
    counts[r.vertical].create++;
    if (r.draftSubject && r.draftBody) counts[r.vertical].drafted++;
    if (r.enrichment) counts[r.vertical].enriched++;
  }

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${rows.length} seed rows, ${skipped} already in table, ${toCreate.length} to create`);
  for (const [vertical, c] of Object.entries(counts)) {
    console.log(`  ${vertical}: +${c.create} (enriched ${c.enriched}, legacy drafts ${c.drafted})`);
  }

  if (!APPLY) {
    for (const r of toCreate.slice(0, 5)) {
      console.log(`  sample: [${r.vertical}] ${r.name} → ${r.websiteKey}${r.draftSubject ? ' (draft)' : ''}`);
    }
    console.log('Dry run only — re-run with --apply to write.');
    return;
  }

  let created = 0;
  for (const r of toCreate) {
    await prisma.partnerProspect.create({
      data: {
        vertical: r.vertical,
        city: 'Austin',
        name: r.name,
        website: r.website,
        websiteKey: r.websiteKey,
        propertiesEstimate: r.propertiesEstimate,
        contactName: r.contactName,
        email: r.email,
        phone: r.phone,
        socials: r.socials,
        logoUrl: r.logoUrl,
        description: r.description,
        partnerSlug: r.partnerSlug,
        source: r.source,
        researchStatus: r.enrichment ? 'ENRICHED' : 'PENDING',
        enrichment: r.enrichment ?? undefined,
        enrichedAt: r.enrichedAt,
        ...(r.draftSubject && r.draftBody
          ? {
              draftStatus: 'DRAFTED',
              draftSubject: r.draftSubject,
              draftBody: r.draftBody,
              draftModel: 'legacy-manual',
              draftGeneratedAt: new Date(),
            }
          : {}),
      },
    });
    created++;
  }
  console.log(`Created ${created} partner_prospects rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
