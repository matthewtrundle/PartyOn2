/**
 * Lead Flow board — rule-based temperature scoring.
 *
 * Pure module (no Prisma): the caller gathers the inputs, this computes a
 * 0–100 score + per-factor breakdown. The score is STORED on the lead
 * (recomputed on pipeline writes + the daily cron so recency/proximity
 * decay); the hot/warm/cold label is always DERIVED here so thresholds stay
 * tweakable without a backfill.
 *
 * Thresholds intentionally match the CoreLinq CRM fork (hot ≥70, warm ≥40 —
 * fork apps/web/app/api/analytics/contacts/route.ts) so scores port at
 * cutover.
 *
 * Factor budget (sums to 100):
 *   event-date proximity 30 · deal size 25 · source quality 20 ·
 *   activity recency 15 · engagement depth 10
 */

export const SCORE_THRESHOLDS = { hot: 70, warm: 40 } as const;

export type Temperature = 'hot' | 'warm' | 'cold';

/** Label for a stored score; null when the lead has never been scored. */
export function temperatureFor(score: number | null | undefined): Temperature | null {
  if (score == null) return null;
  if (score >= SCORE_THRESHOLDS.hot) return 'hot';
  if (score >= SCORE_THRESHOLDS.warm) return 'warm';
  return 'cold';
}

export interface ScoreBreakdown {
  eventProximity: number;
  dealSize: number;
  sourceQuality: number;
  recency: number;
  engagement: number;
}

export interface LeadScoringInput {
  sourceWidget?: string | null;
  /** Lead.metadata — surface payloads live under conciergeQuiz / chatQuiz /
      eventQuiz / contactForm / unifiedQuote. */
  metadata?: unknown;
  resumeCart?: unknown;
  createdAt: Date;
  /** Bumped by recordEvent; the only recency signal besides createdAt. */
  lastActivityAt?: Date | null;
  /** Aggregated from lead_events by the caller (never scanned here). */
  engagement?: {
    hasCheckoutStart?: boolean;
    formSubmitCount?: number;
  };
  /** Injectable clock for tests. */
  now?: Date;
}

type Meta = Record<string, unknown>;

function asObject(v: unknown): Meta | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Meta) : null;
}

function metaSection(meta: unknown, key: string): Meta | null {
  const m = asObject(meta);
  return m ? asObject(m[key]) : null;
}

/** America/Chicago YYYY-MM-DD for a Date (same convention as ops cooler-grouping). */
export function dateStrCT(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Whole days from "today in CT" to a YYYY-MM-DD event date. String-compare
 * safe: both sides become UTC-noon instants so `new Date('YYYY-MM-DD')`'s
 * UTC-midnight off-by-one (a real bug for CT evenings) can't happen.
 * Null when the value isn't a parseable date.
 */
export function daysUntilCT(dateStr: string, now: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!m) return null;
  const event = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStrCT(now));
  if (!t) return null;
  const today = Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]), 12);
  return Math.round((event - today) / 86_400_000);
}

/** First surface payload that carries an event date, in intent order. */
function extractEventDate(meta: unknown): string | null {
  const candidates = [
    metaSection(meta, 'conciergeQuiz')?.arrivalDate,
    metaSection(meta, 'chatQuiz')?.deliveryDate,
    metaSection(meta, 'unifiedQuote')?.deliveryDate,
    metaSection(meta, 'contactForm')?.eventDate,
    metaSection(meta, 'groupDashboard')?.deliveryDate,
    metaSection(meta, 'opsInvoice')?.deliveryDate,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c;
  }
  return null;
}

function extractHeadcount(meta: unknown): number | null {
  const candidates = [
    metaSection(meta, 'conciergeQuiz')?.headcount,
    metaSection(meta, 'chatQuiz')?.headcount,
    metaSection(meta, 'unifiedQuote')?.headcount,
    metaSection(meta, 'contactForm')?.guestCount,
  ];
  for (const c of candidates) {
    const n = typeof c === 'number' ? c : parseInt(String(c ?? ''), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Dollars per person parsed from the concierge budget chip ("$150–300", "300+"). */
function extractBudgetPerPerson(meta: unknown): number | null {
  const raw = metaSection(meta, 'conciergeQuiz')?.budgetPerPerson;
  if (typeof raw !== 'string') return null;
  const m = /(\d{2,5})/.exec(raw.replace(/[,\s]/g, ''));
  return m ? Number(m[1]) : null;
}

export interface LeadFacts {
  occasion: string | null;
  eventDate: string | null;
  headcount: number | null;
  budgetPerPerson: number | null;
}

/**
 * Card-facing facts extracted from the per-surface metadata payloads.
 * Shared by the board API so extraction rules live in exactly one place.
 */
export function extractLeadFacts(meta: unknown): LeadFacts {
  const occasionCandidates = [
    metaSection(meta, 'conciergeQuiz')?.partyType,
    metaSection(meta, 'chatQuiz')?.partyType,
    metaSection(meta, 'unifiedQuote')?.partyType,
    metaSection(meta, 'eventQuiz')?.partyType,
    metaSection(meta, 'contactForm')?.eventType,
    metaSection(meta, 'groupDashboard')?.partyType,
    metaSection(meta, 'partnerInquiry')?.businessType,
  ];
  let occasion: string | null = null;
  for (const c of occasionCandidates) {
    if (typeof c === 'string' && c.trim()) {
      occasion = c.trim();
      break;
    }
  }
  return {
    occasion,
    eventDate: extractEventDate(meta),
    headcount: extractHeadcount(meta),
    budgetPerPerson: extractBudgetPerPerson(meta),
  };
}

function eventProximityPoints(meta: unknown, now: Date): number {
  // event-quiz has no date — only a today/tomorrow/future chip.
  const timing = metaSection(meta, 'eventQuiz')?.timing;
  if (timing === 'today' || timing === 'tomorrow') return 30;

  const dateStr = extractEventDate(meta);
  if (!dateStr) return 4; // no date known — mild default, not zero
  const days = daysUntilCT(dateStr, now);
  if (days == null) return 4;
  if (days < 0) return 0; // event already happened
  if (days <= 7) return 30;
  if (days <= 14) return 26;
  if (days <= 30) return 20;
  if (days <= 60) return 12;
  if (days <= 90) return 6;
  return 4;
}

function dealSizePoints(meta: unknown): number {
  const headcount = extractHeadcount(meta);
  let pts = 0;
  if (headcount != null) {
    if (headcount >= 50) pts += 15;
    else if (headcount >= 20) pts += 12;
    else if (headcount >= 10) pts += 8;
    else if (headcount >= 5) pts += 4;
  }
  const budget = extractBudgetPerPerson(meta);
  if (budget != null) {
    if (budget >= 300) pts += 10;
    else if (budget >= 150) pts += 6;
    else if (budget > 0) pts += 3;
  }
  return Math.min(pts, 25);
}

function sourceQualityPoints(sourceWidget: string | null | undefined, meta: unknown): number {
  const m = asObject(meta) ?? {};
  if (m.conciergeQuiz) return 20; // full questionnaire w/ budget + dates
  if (m.unifiedQuote) return 16; // asked for a real quote
  if (m.groupDashboard) return 16; // built a party dashboard — strong intent
  if (m.chatQuiz) return 14;
  if (m.eventQuiz) return 12;
  if (m.contactForm) return 10;
  switch (sourceWidget) {
    case 'QUICK_BUY':
    case 'PACKAGE_BUILDER':
    case 'CALL_BOOKING':
    case 'GROUP_DASHBOARD':
    case 'OPS_INVOICE':
      return 16;
    case 'PARTNER_LANDING_PAGE':
    case 'PARTNER_FAREHARBOR_WEBHOOK':
    case 'PARTNER_EMAIL_OPTIN':
    case 'PARTNER_INQUIRY':
    case 'INBOUND_EMAIL': // a customer who emails info@ is a real inquiry
      return 14;
    case 'DRINK_CALCULATOR':
      return 12;
    case 'A_LA_CARTE':
    case 'CONTACT_FORM':
      return 10;
    case 'LEAD_MAGNET':
      return 6; // freebie popup — real intent only when a phone came with it
    case 'EMAIL_SIGNUP':
      return 2; // newsletter subscriber, not a party inquiry
    default:
      return 8;
  }
}

function recencyPoints(input: LeadScoringInput, now: Date): number {
  // NEVER fall back to updatedAt: the daily rescore writes the lead row and
  // bumps @updatedAt, which would pin recency fresh forever (review #2).
  const last = input.lastActivityAt ?? input.createdAt;
  const hours = (now.getTime() - last.getTime()) / 3_600_000;
  if (hours < 0) return 15; // clock skew — treat as fresh
  if (hours <= 24) return 15;
  if (hours <= 72) return 12;
  if (hours <= 168) return 8; // 7 days
  if (hours <= 336) return 5; // 14 days
  if (hours <= 720) return 2; // 30 days
  return 0;
}

function engagementPoints(input: LeadScoringInput): number {
  let pts = 0;
  if (input.engagement?.hasCheckoutStart) pts += 4;
  if (input.resumeCart != null) pts += 3;
  if ((input.engagement?.formSubmitCount ?? 0) >= 2) pts += 3;
  return Math.min(pts, 10);
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Compute the rule-based temperature score for a lead. Pure — pass `now` in
 * tests.
 */
export function computeLeadScore(input: LeadScoringInput): {
  score: number;
  breakdown: ScoreBreakdown;
} {
  const now = input.now ?? new Date();
  const breakdown: ScoreBreakdown = {
    eventProximity: eventProximityPoints(input.metadata, now),
    dealSize: dealSizePoints(input.metadata),
    sourceQuality: sourceQualityPoints(input.sourceWidget, input.metadata),
    recency: recencyPoints(input, now),
    engagement: engagementPoints(input),
  };
  const score = clamp(
    breakdown.eventProximity +
      breakdown.dealSize +
      breakdown.sourceQuality +
      breakdown.recency +
      breakdown.engagement,
  );
  return { score, breakdown };
}
