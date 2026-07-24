/**
 * Pure display derivation for the lead drawer — Prisma- and React-free so it
 * unit-tests without rendering. Two concerns:
 *
 *  - Event facts formatting (date + "days away" + occasion), shared with
 *    drawer-facts.tsx.
 *  - The at-a-glance activity summary (drawer-summary.tsx): a few HqBadge chips
 *    derived from the timeline data so an operator sees where a lead stands
 *    without reading the whole feed.
 *
 * Dates are the per-surface strings extractLeadFacts (scoring.ts) surfaces —
 * usually YYYY-MM-DD or a full ISO timestamp. Countdown math reuses the CT-safe
 * daysUntilCT so the drawer agrees with the board card's countdown chip.
 */

import { daysUntilCT } from '@/lib/leads/scoring';
import type { HqBadgeVariant } from '@/components/backend/kit/Badge';
import type { LeadDetail } from './drawer-types';

/** One captured field, ready to render as a labelled row. */
export interface SubmissionField {
  label: string;
  value: string;
}

/** The exact form the lead filled out (title + the fields they entered). */
export interface Submission {
  title: string;
  fields: SubmissionField[];
}

function asRec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Render any captured value as a short string; arrays become comma lists. */
function fmtValue(v: unknown): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const parts = v.map((x) => String(x).trim()).filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }
  const s = String(v).trim();
  return s.length ? s : null;
}

// Metadata surface → its human title + the fields worth showing, in order.
// Priority mirrors scoring's intent order (a real quote/concierge outranks a
// bare contact form when a lead carries more than one surface).
const SUBMISSION_SURFACES: ReadonlyArray<{
  key: string;
  title: string;
  fields: ReadonlyArray<[key: string, label: string]>;
}> = [
  {
    key: 'conciergeQuiz',
    title: 'Concierge questionnaire',
    fields: [
      ['partyType', 'Party type'],
      ['headcount', 'Headcount'],
      ['arrivalDate', 'Arrival'],
      ['departureDate', 'Departure'],
      ['budgetPerPerson', 'Budget / person'],
      ['activities', 'Activities'],
      ['notes', 'Notes'],
    ],
  },
  {
    key: 'unifiedQuote',
    title: 'Quote request',
    fields: [
      ['source', 'Flow'],
      ['partyType', 'Party type'],
      ['headcount', 'Headcount'],
      ['deliveryDate', 'Delivery date'],
    ],
  },
  {
    key: 'chatQuiz',
    title: 'Chat quiz',
    fields: [
      ['partyType', 'Party type'],
      ['headcount', 'Headcount'],
      ['deliveryDate', 'Delivery date'],
    ],
  },
  {
    key: 'eventQuiz',
    title: 'Event quiz',
    fields: [
      ['partyType', 'Party type'],
      ['timing', 'Timing'],
      ['headcount', 'Headcount'],
      ['needs', 'Needs'],
    ],
  },
  {
    key: 'contactForm',
    title: 'Contact form',
    fields: [
      ['eventType', 'Event type'],
      ['eventDate', 'Event date'],
      ['guestCount', 'Guest count'],
      ['message', 'Message'],
    ],
  },
  {
    key: 'quickBuy',
    title: 'Quick Buy',
    fields: [
      ['occasion', 'Occasion'],
      ['groupSize', 'Group size'],
      ['deliveryDate', 'Delivery date'],
      ['mode', 'Mode'],
      ['total', 'Cart total'],
    ],
  },
  {
    key: 'partnerInquiry',
    title: 'Partner inquiry',
    fields: [
      ['businessName', 'Business'],
      ['businessType', 'Type'],
      ['source', 'Source'],
    ],
  },
  {
    key: 'leadMagnet',
    title: 'Lead magnet',
    fields: [['magnetTitle', 'Downloaded']],
  },
];

/**
 * Extract exactly what the lead submitted from the first matching metadata
 * surface — the "what did they actually fill out" view the operator asked for.
 * Returns null when the lead has no captured form (e.g. a bare pixel lead).
 */
export function extractSubmission(metadata: Record<string, unknown> | null): Submission | null {
  const m = asRec(metadata);
  if (!m) return null;
  for (const surface of SUBMISSION_SURFACES) {
    const data = asRec(m[surface.key]);
    if (!data) continue;
    const fields: SubmissionField[] = [];
    for (const [key, label] of surface.fields) {
      const value = fmtValue(data[key]);
      if (value) fields.push({ label, value });
    }
    if (fields.length > 0) return { title: surface.title, fields };
  }
  return null;
}

/**
 * Format a lead's event-date string for display, CT-safe. We read the calendar
 * Y-M-D off the front and build a *local* Date from those parts, so
 * `new Date('2026-08-15')`'s UTC-midnight parse (an off-by-one for CT evenings)
 * can't shift the day. Falls back to the raw string when it isn't a parseable
 * date — a surface could store free text.
 */
export function formatEventDate(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!m) return dateStr.trim();
  const local = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return local.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Human "days away" phrase for an event date, or null when the value can't be
 * parsed (the caller then shows just the formatted date). Lowercase because it
 * reads as a suffix — "Sat, Aug 15, 2026 · in 32 days".
 */
export function describeDaysAway(dateStr: string, now: Date): string | null {
  const days = daysUntilCT(dateStr, now);
  if (days == null) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `in ${days} days`;
}

/** True when the event has already passed (drives the muted-vs-accent color). */
export function eventIsPast(dateStr: string, now: Date): boolean {
  const days = daysUntilCT(dateStr, now);
  return days != null && days < 0;
}

/** kebab/snake occasion → Title Case ("bachelor-party" → "Bachelor Party"). */
export function humanizeOccasion(occasion: string): string {
  return occasion
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Full ISO timestamp → "Jul 14, 2026" (CT calendar — the business runs on CT). */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Chicago',
  });
}

/** Score breakdown map → "event proximity 30 · deal size 25 · …" (or "—"). */
export function formatScoreBreakdown(breakdown: Record<string, number> | null): string {
  if (!breakdown || Object.keys(breakdown).length === 0) return '—';
  return Object.entries(breakdown)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()} ${v}`)
    .join(' · ');
}

export interface ActivityChip {
  key: string;
  label: string;
  variant: HqBadgeVariant;
}

/** "today" / "1d ago" / "Nd ago" for a past ISO timestamp. */
function daysAgo(iso: string, now: Date): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const days = Math.floor((now.getTime() - then) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

/**
 * DraftOrder statuses meaning an invoice actually reached the customer. PENDING
 * (created-not-sent), EXPIRED and CANCELLED are excluded so the "Quote sent"
 * chip can't contradict the real "Invoice cancelled/expired" line the facts
 * panel shows right below it. Mirrors the DraftOrderStatus enum in schema.prisma.
 */
const QUOTE_SENT_STATUSES = new Set(['SENT', 'VIEWED', 'PAID', 'CONVERTED']);

/**
 * A handful of at-a-glance chips summarizing where a lead stands — quote sent,
 * our outreach recency, whether they opened it, and their site behavior. The
 * full detail still lives in the timeline; this is the scannable summary. Empty
 * array when there's no activity worth flagging (caller renders nothing).
 */
export function deriveActivitySummary(detail: LeadDetail, now: Date): ActivityChip[] {
  const { events, emailLogs, drafts, inboundEmails } = detail;
  const chips: ActivityChip[] = [];

  // A customer emailed us — the freshest "they're waiting on you" signal, so
  // it leads the strip.
  if (inboundEmails.length > 0) {
    const latest = inboundEmails.reduce((a, b) =>
      new Date(a.receivedAt).getTime() >= new Date(b.receivedAt).getTime() ? a : b,
    );
    const rel = daysAgo(latest.receivedAt, now);
    chips.push({ key: 'emailed-us', label: rel ? `Emailed us ${rel}` : 'Emailed us', variant: 'green' });
  }

  // A quote/invoice actually went out — not a bare draft or a dead (expired/
  // cancelled) one, which would misstate the lead's status.
  if (drafts.some((d) => QUOTE_SENT_STATUSES.has(d.status))) {
    chips.push({ key: 'quote', label: 'Quote sent', variant: 'blue' });
  }

  // Our most recent outbound email (emailLogs are outbound-only). The reduce —
  // rather than emailLogs[0] — so we don't depend on the API's sort order.
  if (emailLogs.length > 0) {
    const latest = emailLogs.reduce((a, b) =>
      new Date(a.createdAt).getTime() >= new Date(b.createdAt).getTime() ? a : b,
    );
    const rel = daysAgo(latest.createdAt, now);
    chips.push({ key: 'emailed', label: rel ? `Emailed ${rel}` : 'Emailed', variant: 'blue' });
  }

  // Did they open one of our emails? EmailStatus has no CLICKED (Resend click
  // tracking isn't wired), so OPENED is the strongest engagement signal we get.
  if (emailLogs.some((l) => l.status.toLowerCase() === 'opened')) {
    chips.push({ key: 'opened', label: 'Opened email', variant: 'green' });
  }

  // High-intent site behavior.
  if (events.some((e) => e.type === 'CHECKOUT_START')) {
    chips.push({ key: 'checkout', label: 'Started checkout', variant: 'amber' });
  }
  if (events.some((e) => e.type === 'FORM_SUBMIT' || e.type === 'STEP_COMPLETE')) {
    chips.push({ key: 'submitted', label: 'Submitted a form', variant: 'gray' });
  }
  const visits = events.filter((e) => e.type === 'PAGE_VIEW').length;
  if (visits > 0) {
    chips.push({
      key: 'visits',
      label: visits === 1 ? '1 site visit' : `${visits} site visits`,
      variant: 'gray',
    });
  }

  return chips;
}
