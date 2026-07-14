/**
 * scripts/backfill-pod-leads-sheet.ts
 *
 * One-off backfill: mirror every Lead from the last 60 days (ALL
 * statuses — PARTIAL included, per founder spec) into the "POD Leads"
 * tab of the PPC Booking App Time Slots Google Sheet.
 *
 * Safety rails:
 *   - DRY-RUN by default — prints what would be appended, writes nothing.
 *     Pass --apply to actually write.
 *   - Dedupes against rows already in the sheet by the Lead URL column
 *     (live mirroring has been appending since 2026-07-13; those leads
 *     are skipped). If the dedupe read fails we ABORT instead of
 *     double-writing.
 *   - Read-only against Postgres. Single batched Sheets append.
 *
 * Run:
 *   npx vercel env pull .env.local.tmp --environment=production
 *   (inject POD_LEADS_SHEET_ID if Vercel redacts it)
 *   npx tsx scripts/backfill-pod-leads-sheet.ts           # dry run
 *   npx tsx scripts/backfill-pod-leads-sheet.ts --apply   # write
 */

import { config as loadDotenv } from 'dotenv';
loadDotenv({ path: '.env.local.tmp' });

import { PrismaClient, type Lead } from '@prisma/client';
import {
  appendLeadsToPodLeadsSheet,
  readExistingLeadUrls,
  formatCentralTimestamp,
  type PodLeadSheetRow,
} from '../src/lib/premier/pod-leads-sheet';

const DAYS = 60;
const APPLY = process.argv.includes('--apply');

const ADMIN_LEADS_URL = 'https://partyondelivery.com/admin/brians-stuff?tab=leads';

type Meta = Record<string, unknown>;

function asMeta(v: unknown): Meta | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Meta) : null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';
}

function joinArr(v: unknown): string {
  return Array.isArray(v) ? v.map(String).join(', ') : '';
}

/**
 * Pull the richest party details available from the lead's metadata.
 * Priority mirrors recency of the flows: concierge > unified quote >
 * chat > event quiz > contact form.
 */
function extractDetails(lead: Lead): {
  source: string;
  arrivalDate: string;
  departureDate: string;
  partyType: string;
  headcount: string;
  budgetPerPerson: string;
  activities: string;
  extraNote: string;
} {
  const meta = asMeta(lead.metadata) ?? {};
  const concierge = asMeta(meta.conciergeQuiz);
  const unified = asMeta(meta.unifiedQuote);
  const chat = asMeta(meta.chatQuiz);
  const quiz = asMeta(meta.eventQuiz);
  const contact = asMeta(meta.contactForm);

  if (concierge) {
    return {
      source: str(concierge.source) || 'premier-concierge',
      arrivalDate: str(concierge.arrivalDate),
      departureDate: str(concierge.departureDate),
      partyType: str(concierge.partyType),
      headcount: str(concierge.headcount),
      budgetPerPerson: str(concierge.budgetPerPerson),
      activities: joinArr(concierge.activities),
      extraNote: str(concierge.notes),
    };
  }
  if (unified) {
    return {
      source: `quote-start:${str(unified.source) || 'unknown'}`,
      arrivalDate: str(unified.deliveryDate),
      departureDate: '',
      partyType: str(unified.partyType),
      headcount: str(unified.headcount),
      budgetPerPerson: '',
      activities: joinArr(unified.recommendedHandles),
      extraNote: '',
    };
  }
  if (chat) {
    return {
      source: 'party-chat',
      arrivalDate: str(chat.deliveryDate),
      departureDate: '',
      partyType: str(chat.partyType),
      headcount: str(chat.headcount),
      budgetPerPerson: '',
      activities: '',
      extraNote: '',
    };
  }
  if (quiz) {
    return {
      source: 'event-quiz',
      arrivalDate: '',
      departureDate: '',
      partyType: str(quiz.partyType),
      headcount: '',
      budgetPerPerson: '',
      activities: joinArr(quiz.needs),
      extraNote: quiz.timing ? `timing: ${str(quiz.timing)}` : '',
    };
  }
  if (contact) {
    return {
      source: 'contact-form',
      arrivalDate: str(contact.eventDate),
      departureDate: '',
      partyType: str(contact.eventType),
      headcount: str(contact.guestCount),
      budgetPerPerson: '',
      activities: '',
      extraNote: str(contact.message).slice(0, 300),
    };
  }
  // No structured metadata — fall back to source columns.
  return {
    source: lead.sourceWidget
      ? lead.sourceWidget.toLowerCase().replace(/_/g, '-')
      : lead.sourcePage || 'unknown',
    arrivalDate: '',
    departureDate: '',
    partyType: '',
    headcount: '',
    budgetPerPerson: '',
    activities: '',
    extraNote: '',
  };
}

function leadToRow(lead: Lead): PodLeadSheetRow {
  const d = extractDetails(lead);
  const notes = [
    `BACKFILL · status: ${lead.status}`,
    lead.sourcePage ? `page: ${lead.sourcePage}` : '',
    d.extraNote,
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    submittedAt: formatCentralTimestamp(lead.createdAt),
    source: d.source,
    firstName: lead.firstName ?? '',
    lastName: lead.lastName ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    arrivalDate: d.arrivalDate,
    departureDate: d.departureDate,
    partyType: d.partyType,
    headcount: d.headcount,
    budgetPerPerson: d.budgetPerPerson,
    activities: d.activities,
    notes,
    leadUrl: `${ADMIN_LEADS_URL}&lead=${lead.id}`,
  };
}

async function main(): Promise<void> {
  if (!process.env.POD_LEADS_SHEET_ID || !process.env.DATABASE_URL) {
    console.error('Missing env vars — need POD_LEADS_SHEET_ID + DATABASE_URL (+ sheet service account).');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

  console.log(`[backfill] Mode: ${APPLY ? 'APPLY' : 'DRY RUN'} · window: last ${DAYS} days (since ${since.toISOString().slice(0, 10)})`);

  const leads = await prisma.lead.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`[backfill] Leads in window (all statuses): ${leads.length}`);

  // Dedup against rows already in the sheet (live mirroring).
  const existingUrls = await readExistingLeadUrls();
  if (existingUrls === null) {
    console.error('[backfill] ✗ Could not read existing sheet rows — aborting to avoid double-writes.');
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`[backfill] Existing sheet rows with a Lead URL: ${existingUrls.size}`);

  const contactable = leads.filter(
    // A row with no name, email, or phone is un-followable noise
    // (anonymous partials) — mirror everything else, PARTIALs included.
    (l) => l.email || l.phone || l.firstName || l.lastName,
  );
  console.log(`[backfill] Skipping ${leads.length - contactable.length} rows with zero contact info.`);

  const rows = contactable
    .map(leadToRow)
    .filter((r) => !existingUrls.has(r.leadUrl ?? ''));

  console.log(`[backfill] Rows to append after dedupe: ${rows.length}`);

  // Per-status + per-source summary so the founder can sanity-check.
  const bySource = new Map<string, number>();
  for (const r of rows) bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1);
  console.log('[backfill] By source:');
  for (const [s, n] of [...bySource.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(4)}  ${s}`);
  }

  if (!APPLY) {
    console.log('\n[backfill] Sample of first 5 rows:');
    for (const r of rows.slice(0, 5)) {
      console.log(`    ${r.submittedAt} | ${r.source} | ${r.firstName} ${r.lastName} | ${r.email} | ${r.partyType} | hc:${r.headcount}`);
    }
    console.log('\n[backfill] DRY RUN — nothing written. Re-run with --apply to write.');
    await prisma.$disconnect();
    return;
  }

  const appended = await appendLeadsToPodLeadsSheet(rows);
  if (appended === rows.length) {
    console.log(`[backfill] ✓ Appended ${appended} rows.`);
  } else {
    console.error(`[backfill] ✗ Append failed (appended=${appended}, expected=${rows.length}).`);
    process.exit(1);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
