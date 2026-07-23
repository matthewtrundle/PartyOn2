/**
 * Lead Flow board — read-side aggregation for /admin/leads.
 *
 * One round trip builds the whole board: columns grouped by stage (Won/Lost
 * capped to the last 30 days), the "Uncommitted" tray (PARTIAL leads with
 * contact info), KPI tiles, and per-card facts. Needs-response and follow-up
 * flags come from two grouped queries over the boarded ids — never a per-card
 * scan of lead_events.
 */

import { Prisma, type Lead } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { dateStrCT, extractLeadFacts, temperatureFor, SCORE_THRESHOLDS } from './scoring';
import { isNewsletterOnly, sweepEnrollSubmitted } from './pipeline';
import { ACTIVE_STAGES, PIPELINE_STAGES, type PipelineStage } from './pipeline-types';
import { SOURCE_LABELS } from './board-types';
import type { BoardData, BoardFilters, BoardKpis, BoardLead } from './board-types';
import { SOURCE_FILTER_CONSUMER, SOURCE_FILTER_PARTNER } from './board-types';
import { isPartnerLead } from './partner-tags';
import { loadBoardJoins } from './board-joins';
import { nextActionFor } from './next-action';

export type { BoardData, BoardFilters, BoardKpis, BoardLead } from './board-types';

const CLOSED_WINDOW_DAYS = 30;
const TRAY_LIMIT = 60;

/** All-time Won/Lost tallies as returned by the pipelineStage groupBy. */
interface StageCount {
  pipelineStage: string | null;
  _count: { _all: number };
}

function displayName(lead: Lead): string {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim();
  return name || lead.email || lead.phone || 'Unknown lead';
}

/**
 * CONTACT_FORM is one widget covering four distinct capture flows — split it by
 * the metadata surface so the card shows the real intent (a quote request reads
 * very differently from a quiz). Precedence follows scoring's intent order.
 * Every other widget passes through to its SOURCE_LABELS name. `key` is what the
 * board filter matches on; `label` is what the card shows.
 */
const CONTACT_FORM_SURFACES: ReadonlyArray<{ meta: string; key: string; label: string }> = [
  { meta: 'unifiedQuote', key: 'CONTACT_FORM:quote', label: 'Quote Request' },
  { meta: 'chatQuiz', key: 'CONTACT_FORM:chat', label: 'Chat' },
  { meta: 'eventQuiz', key: 'CONTACT_FORM:quiz', label: 'Event Quiz' },
  { meta: 'contactForm', key: 'CONTACT_FORM:contact', label: 'Contact Form' },
];

/** unifiedQuote.source (quote/start zod enum) → sub-flow display label. */
const QUOTE_FLOW_LABELS: Record<string, string> = {
  chat: 'Quote · Chat',
  'package-builder': 'Quote · Builder',
  'event-quiz': 'Quote · Quiz',
  'landing-quote': 'Quote · Landing',
};

/** groupDashboard.source (DashboardSource enum) → provenance display label. */
const DASHBOARD_SOURCE_LABELS: Record<string, string> = {
  WEBHOOK: 'Dashboard · Boat Webhook',
  PARTNER_PAGE: 'Dashboard · Partner',
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** 'premier-party-cruises' → 'Premier Party Cruises' (badge/label casing). */
function titleCaseSlug(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Card source label with sheet-level precision. Filter KEYS are frozen (saved
 * filters/URLs keep working); only LABELS gain detail from the metadata the
 * capture routes already store (operator ask 2026-07-23: the board must show
 * exactly where a lead came from, like the ops sheet does).
 */
export function refineSource(
  sourceWidget: string | null,
  metadata: unknown,
): { key: string; label: string } {
  const widget = sourceWidget ?? 'OTHER';
  const m = asRecord(metadata);
  if (m) {
    if (widget === 'CONTACT_FORM') {
      for (const s of CONTACT_FORM_SURFACES) {
        if (m[s.meta] == null) continue;
        if (s.meta === 'unifiedQuote') {
          const flow = asRecord(m.unifiedQuote)?.source;
          const flowLabel = typeof flow === 'string' ? QUOTE_FLOW_LABELS[flow] : undefined;
          return { key: s.key, label: flowLabel ?? s.label };
        }
        return { key: s.key, label: s.label };
      }
    }
    if (widget === 'QUICK_BUY') {
      const occasion = asRecord(m.quickBuy)?.occasion;
      if (typeof occasion === 'string' && occasion) {
        return { key: widget, label: `Quick Buy · ${titleCaseSlug(occasion)}` };
      }
    }
    if (widget === 'PARTNER_LANDING_PAGE') {
      // Premier concierge quiz beats the partner-slug fallback: those leads
      // carry BOTH partner='premier-concierge' and the quiz surface.
      const quizParty = asRecord(m.conciergeQuiz)?.partyType;
      if (typeof quizParty === 'string' && quizParty) {
        return { key: widget, label: `Concierge · ${titleCaseSlug(quizParty)}` };
      }
      if (typeof m.partner === 'string' && m.partner && m.partner !== 'premier-concierge') {
        return { key: widget, label: `Partner · ${titleCaseSlug(m.partner)}` };
      }
    }
    if (widget === 'GROUP_DASHBOARD') {
      const src = asRecord(m.groupDashboard)?.source;
      const label = typeof src === 'string' ? DASHBOARD_SOURCE_LABELS[src] : undefined;
      if (label) return { key: widget, label };
    }
  }
  return { key: widget, label: SOURCE_LABELS[widget] ?? 'Site' };
}

const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid'] as const;
const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid']);

/**
 * Paid-traffic detector for the card's "Ads" chip: an ad-platform click id
 * in metadata.attribution, or a paid utm_medium. Pure; exported for tests.
 */
export function isAdsLead(lead: {
  utmMedium: string | null;
  metadata: unknown;
}): boolean {
  if (lead.utmMedium && PAID_MEDIUMS.has(lead.utmMedium.toLowerCase())) return true;
  const attribution = asRecord(asRecord(lead.metadata)?.attribution);
  if (!attribution) return false;
  return CLICK_ID_KEYS.some((k) => typeof attribution[k] === 'string' && attribution[k]);
}

/** Reply-flag freshness window: signals older than this stop flagging red. */
export const REPLY_WINDOW_DAYS = 7;

/** Open card sitting this long in a stage gets the stalled tint. */
export const STALLED_STAGE_DAYS = 7;

/**
 * Red "Reply needed" gate: a customer signal (form submit, inbound email,
 * site activity — anything that bumps lastActivityAt) that is BOTH fresh
 * (≤ REPLY_WINDOW_DAYS) and unanswered (no outbound contact since). Stale
 * leads stop flagging so red always means "act now" — before the window,
 * ~310 of 313 open leads were red (operator decision 2026-07-23). Kept in
 * lockstep with getHotLeadsNeedingReply's SQL so the nav badge and the
 * board's "Needs response" KPI can never disagree (review #9).
 */
export function needsReply(
  lead: { lastContactedAt: Date | null; lastActivityAt: Date | null; createdAt: Date },
  now: Date,
): boolean {
  const signalAt = lead.lastActivityAt ?? lead.createdAt;
  if (now.getTime() - signalAt.getTime() > REPLY_WINDOW_DAYS * 86_400_000) return false;
  return lead.lastContactedAt === null || signalAt > lead.lastContactedAt;
}

/**
 * Project a Lead row onto its board card. Pure given the flags in `ctx`
 * (exported for tests — needs-response and suggest-lost derivations live
 * here).
 */
export function toBoardLead(
  lead: Lead,
  ctx: {
    hasFollowUp: boolean;
    isDuplicate: boolean;
    now: Date;
    cart?: BoardLead['cart'];
    affiliate?: BoardLead['affiliate'];
    touchCount?: number;
  },
): BoardLead {
  const facts = extractLeadFacts(lead.metadata);
  const source = refineSource(lead.sourceWidget, lead.metadata);
  const needsResponse = needsReply(lead, ctx.now);
  // CT calendar day, not UTC — a 7pm CT board view must not mark today's
  // event as already passed (review #6).
  const eventPassed =
    facts.eventDate != null && facts.eventDate.slice(0, 10) < dateStrCT(ctx.now);
  const quietMs = ctx.now.getTime() - (lead.lastActivityAt ?? lead.createdAt).getTime();
  const isOpenStage =
    lead.pipelineStage !== 'WON' && lead.pipelineStage !== 'LOST' && lead.pipelineStage !== null;
  const stage = (lead.pipelineStage as PipelineStage | null) ?? null;
  const temperature = temperatureFor(lead.leadScore);
  // Days the card has sat in its current stage — the "stalled deal" signal.
  const daysInStage =
    isOpenStage && lead.stageChangedAt
      ? Math.floor((ctx.now.getTime() - lead.stageChangedAt.getTime()) / 86_400_000)
      : null;
  return {
    id: lead.id,
    name: displayName(lead),
    email: lead.email,
    phone: lead.phone,
    stage,
    sortOrder: lead.boardSortOrder,
    score: lead.leadScore,
    temperature,
    occasion: facts.occasion,
    eventDate: facts.eventDate,
    headcount: facts.headcount,
    budgetPerPerson: facts.budgetPerPerson,
    sourceWidget: lead.sourceWidget,
    sourceKey: source.key,
    sourceLabel: source.label,
    sourcePage: lead.sourcePage,
    tags: lead.tags ?? [],
    owner: lead.owner,
    needsResponse: isOpenStage ? needsResponse : false,
    hasFollowUp: ctx.hasFollowUp,
    isDuplicate: ctx.isDuplicate,
    snoozedUntil: lead.snoozedUntil?.toISOString() ?? null,
    lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
    lastActivityAt: lead.lastActivityAt?.toISOString() ?? null,
    lostReason: lead.lostReason,
    createdAt: lead.createdAt.toISOString(),
    stageChangedAt: lead.stageChangedAt?.toISOString() ?? null,
    suggestLost: isOpenStage && (eventPassed || quietMs > 30 * 86_400_000),
    cart: ctx.cart ?? null,
    affiliate: ctx.affiliate ?? null,
    adsClick: isAdsLead(lead),
    nextAction: nextActionFor({
      needsResponse: isOpenStage ? needsResponse : false,
      hasPhone: Boolean(lead.phone),
      hasEmail: Boolean(lead.email),
      temperature,
      eventDate: facts.eventDate,
      stage,
      snoozedUntil: lead.snoozedUntil?.toISOString() ?? null,
      now: ctx.now,
    }),
    touchCount: ctx.touchCount ?? 0,
    daysInStage,
    stalled: daysInStage != null && daysInStage >= STALLED_STAGE_DAYS,
  };
}

function applyFilters(cards: BoardLead[], f: BoardFilters, now: Date): BoardLead[] {
  return cards.filter((c) => {
    if (f.temp && c.temperature !== f.temp) return false;
    if (f.occasion && (c.occasion ?? '').toLowerCase() !== f.occasion.toLowerCase()) return false;
    if (f.source === SOURCE_FILTER_PARTNER) {
      if (!isPartnerLead(c.tags) && c.sourceWidget !== 'PARTNER_OUTREACH') return false;
    } else if (f.source === SOURCE_FILTER_CONSUMER) {
      if (isPartnerLead(c.tags) || c.sourceWidget === 'PARTNER_OUTREACH') return false;
    } else if (f.source && c.sourceKey !== f.source) return false;
    if (!f.showSnoozed && c.snoozedUntil && new Date(c.snoozedUntil) > now) return false;
    if (f.q) {
      const hay = `${c.name} ${c.email ?? ''} ${c.phone ?? ''}`.toLowerCase();
      if (!hay.includes(f.q.toLowerCase())) return false;
    }
    return true;
  });
}

/**
 * Count of hot, unanswered, un-snoozed leads — shared by the nav badge and
 * the /ops/today triage row. Raw SQL because Prisma can't compare two
 * columns (last_activity_at > last_contacted_at). Returns the oldest wait so
 * the triage row can escalate to red past 48h.
 */
export async function getHotLeadsNeedingReply(): Promise<{
  count: number;
  oldestWaitHours: number | null;
}> {
  // Threshold + stage list interpolated from the shared constants (still
  // bind parameters) so tweaking SCORE_THRESHOLDS never leaves this stale.
  const stages = Prisma.join(ACTIVE_STAGES.map((s) => Prisma.sql`${s}`));
  const rows = await prisma.$queryRaw<
    Array<{ count: number; oldest: Date | null }>
  >`
    SELECT COUNT(*)::int AS count,
           -- "waiting since" = the unanswered activity, not the stage age
           MIN(COALESCE(last_activity_at, stage_changed_at)) AS oldest
    FROM leads
    WHERE pipeline_stage IN (${stages})
      AND lead_score >= ${SCORE_THRESHOLDS.hot}
      AND (snoozed_until IS NULL OR snoozed_until <= NOW())
      AND (
        last_contacted_at IS NULL
        OR (last_activity_at IS NOT NULL AND last_activity_at > last_contacted_at)
      )
      -- Same freshness window as needsReply() — stale signals stop flagging.
      AND COALESCE(last_activity_at, created_at) > NOW() - make_interval(days => ${REPLY_WINDOW_DAYS})
  `;
  const row = rows[0];
  if (!row || row.count === 0) return { count: 0, oldestWaitHours: null };
  const oldestWaitHours = row.oldest
    ? (Date.now() - row.oldest.getTime()) / 3_600_000
    : null;
  return { count: row.count, oldestWaitHours };
}

/**
 * The three parallel board reads: active + recently-closed cards, all-time
 * Won/Lost tallies (no window — the column header shows the true total), and
 * the uncommitted tray when requested.
 */
async function fetchBoardRows(
  includePartial: boolean,
  closedFloor: Date,
): Promise<{ boarded: Lead[]; closedCountsRaw: StageCount[]; tray: Lead[] }> {
  const [boarded, closedCountsRaw, tray] = await Promise.all([
    prisma.lead.findMany({
      where: {
        OR: [
          { pipelineStage: { in: ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTE_SENT'] } },
          { pipelineStage: { in: ['WON', 'LOST'] }, stageChangedAt: { gte: closedFloor } },
        ],
      },
      // Hot→cold so a >500 board truncates the coldest, never the hottest.
      // boardSortOrder is deliberately ignored: within-column drag order was
      // never persisted (the client only ever sent stage changes).
      orderBy: [{ leadScore: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 500,
    }),
    prisma.lead.groupBy({
      by: ['pipelineStage'],
      where: { pipelineStage: { in: ['WON', 'LOST'] } },
      _count: { _all: true },
    }),
    includePartial
      ? prisma.lead.findMany({
          where: {
            pipelineStage: null,
            status: 'PARTIAL',
            OR: [{ email: { not: null } }, { phone: { not: null } }],
          },
          orderBy: { updatedAt: 'desc' },
          take: TRAY_LIMIT,
        })
      : Promise.resolve([] as Lead[]),
  ]);
  return { boarded, closedCountsRaw, tray };
}

/**
 * Per-card flags that need the whole result set: active follow-up jobs
 * (one grouped query) and duplicate-email detection across boarded + tray.
 */
async function loadCardFlags(all: Lead[]): Promise<{
  followUpLeads: Set<string>;
  emailCounts: Map<string, number>;
  touchCounts: Map<string, number>;
}> {
  const ids = all.map((l) => l.id);
  const [followUps, touchRows] = await Promise.all([
    prisma.followUpJob.groupBy({
      by: ['leadId'],
      where: { leadId: { in: ids }, status: { in: ['scheduled', 'sent'] } },
      _count: { _all: true },
    }),
    // Outreach touches = board replies + logged calls/texts. One grouped raw
    // query over the CUSTOM events (Prisma can't group by a JSON path).
    ids.length
      ? prisma.$queryRaw<Array<{ lead_id: string; n: number }>>`
          SELECT lead_id, COUNT(*)::int AS n
          FROM lead_events
          WHERE lead_id IN (${Prisma.join(ids)})
            AND type = 'CUSTOM'
            AND metadata->>'kind' IN ('email.reply', 'outreach.logged')
          GROUP BY lead_id
        `
      : Promise.resolve([]),
  ]);
  const emailCounts = new Map<string, number>();
  for (const l of all) {
    const key = l.email?.toLowerCase();
    if (key) emailCounts.set(key, (emailCounts.get(key) ?? 0) + 1);
  }
  return {
    followUpLeads: new Set(followUps.flatMap((r) => (r.leadId ? [r.leadId] : []))),
    emailCounts,
    touchCounts: new Map(touchRows.map((r) => [r.lead_id, r.n])),
  };
}

/**
 * Hot→cold within a column: score desc, unscored sink to the bottom, newest
 * first on ties. The operator works each column top-down daily.
 */
export function compareBoardCards(a: BoardLead, b: BoardLead): number {
  const scoreDiff = (b.score ?? -1) - (a.score ?? -1);
  if (scoreDiff !== 0) return scoreDiff;
  return b.createdAt.localeCompare(a.createdAt);
}

/** Group boarded cards into stage columns, then filter and sort hot→cold. */
export function buildColumns(
  boarded: Lead[],
  toCard: (lead: Lead) => BoardLead,
  filters: BoardFilters,
  now: Date,
): Record<PipelineStage, BoardLead[]> {
  const columns = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s, [] as BoardLead[]]),
  ) as Record<PipelineStage, BoardLead[]>;
  for (const lead of boarded) {
    const card = toCard(lead);
    if (card.stage) columns[card.stage].push(card);
  }
  for (const stage of PIPELINE_STAGES) {
    columns[stage] = applyFilters(columns[stage], filters, now).sort(compareBoardCards);
  }
  return columns;
}

/**
 * KPI tiles from the (already filtered) columns. Won/Lost tiles read the
 * 30-day columns, NOT the all-time closed counts — "this month's win rate".
 */
export function computeKpis(
  columns: Record<PipelineStage, BoardLead[]>,
  now: Date,
): BoardKpis {
  const weekFloor = new Date(now.getTime() - 7 * 86_400_000);
  const open = (['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTE_SENT'] as const).flatMap(
    (s) => columns[s],
  );
  const won30d = columns.WON.length;
  const lost30d = columns.LOST.length;
  const closedTotal = won30d + lost30d;
  return {
    newThisWeek: open.filter((c) => new Date(c.createdAt) >= weekFloor).length,
    hot: open.filter((c) => c.temperature === 'hot').length,
    needsResponse: open.filter((c) => c.needsResponse).length,
    won30d,
    lost30d,
    conversionPct: closedTotal > 0 ? Math.round((won30d / closedTotal) * 100) : null,
  };
}

/** All-time Won/Lost totals for the column headers. */
export function summarizeClosedCounts(raw: StageCount[]): { won: number; lost: number } {
  return {
    won: raw.find((r) => r.pipelineStage === 'WON')?._count._all ?? 0,
    lost: raw.find((r) => r.pipelineStage === 'LOST')?._count._all ?? 0,
  };
}

/** Build the full board payload. Runs the enroll sweep first so it's always fresh. */
export async function getBoardData(filters: BoardFilters = {}): Promise<BoardData> {
  const now = new Date();
  await sweepEnrollSubmitted().catch(() => undefined);

  const closedFloor = new Date(now.getTime() - CLOSED_WINDOW_DAYS * 86_400_000);
  const { boarded, closedCountsRaw, tray } = await fetchBoardRows(
    filters.includePartial === true,
    closedFloor,
  );
  const all = [...boarded, ...tray];
  const [{ followUpLeads, emailCounts, touchCounts }, { cartByLeadId, affiliateByLeadId }] =
    await Promise.all([loadCardFlags(all), loadBoardJoins(all)]);

  const toCard = (lead: Lead): BoardLead =>
    toBoardLead(lead, {
      hasFollowUp: followUpLeads.has(lead.id),
      isDuplicate: (emailCounts.get(lead.email?.toLowerCase() ?? '') ?? 0) > 1,
      now,
      cart: cartByLeadId.get(lead.id) ?? null,
      affiliate: affiliateByLeadId.get(lead.id) ?? null,
      touchCount: touchCounts.get(lead.id) ?? 0,
    });

  const columns = buildColumns(boarded, toCard, filters, now);
  const trayCards = applyFilters(
    tray.filter((l) => !isNewsletterOnly(l)).map(toCard),
    filters,
    now,
  );

  return {
    columns,
    closedCounts: summarizeClosedCounts(closedCountsRaw),
    tray: trayCards,
    kpis: computeKpis(columns, now),
    generatedAt: now.toISOString(),
  };
}
