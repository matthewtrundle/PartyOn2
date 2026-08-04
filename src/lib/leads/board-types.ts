/**
 * Lead Flow board — shared DTO types (Prisma-free so the /admin/leads client
 * components can import them; the server aggregation lives in board-data.ts).
 */

import type { Temperature } from './scoring';
import type { PipelineStage } from './pipeline-types';
import type { NextAction } from './next-action';
import type { LeadChannel } from './source-taxonomy';

export interface BoardLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: PipelineStage | null;
  /** @deprecated Ordering is score-first since 2026-07 (compareBoardCards); drag never persisted a sort. */
  sortOrder: number;
  score: number | null;
  temperature: Temperature | null;
  occasion: string | null;
  eventDate: string | null;
  headcount: number | null;
  budgetPerPerson: number | null;
  sourceWidget: string | null;
  /** Filter key: the widget, or `CONTACT_FORM:<surface>` for the split intents. */
  sourceKey: string;
  /** Display label — splits CONTACT_FORM into Quote Request / Chat / Event Quiz / Contact Form. */
  sourceLabel: string;
  /** How they reached us — paid / partner / organic / … (see source-taxonomy). */
  channel: LeadChannel;
  /** Which form was submitted; null when nothing recorded one. */
  formKey: string | null;
  formLabel: string | null;
  sourcePage: string | null;
  /**
   * A business reached out, not a customer. Derived server-side because
   * /api/partners/inquiry is shared with consumer landers, so the widget
   * alone can't tell them apart. Drives the PARTNER/CONSUMER filters.
   */
  isB2b: boolean;
  /** Segmentation tags — partner-prospect / partner-active / vertical. */
  tags: string[];
  owner: string | null;
  needsResponse: boolean;
  hasFollowUp: boolean;
  isDuplicate: boolean;
  snoozedUntil: string | null;
  lastContactedAt: string | null;
  lastActivityAt: string | null;
  lostReason: string | null;
  createdAt: string;
  stageChangedAt: string | null;
  /** Suggest-Lost chip: event date passed or quiet for 30 days. */
  suggestLost: boolean;
  /** Dashboard cart chip + link — set when the lead has a group dashboard. */
  cart: { shareCode: string; total: number; itemCount: number } | null;
  /** Affiliate badge (Premier etc.) — lead's own stamp, else its dashboard's. */
  affiliate: { name: string; code: string } | null;
  /** Premier Party Cruises lead — splits the NEW column so the ad funnel is separable. */
  isPremier: boolean;
  /** Paid-traffic marker: Google/Meta/Bing click id or a cpc/paid medium. */
  adsClick: boolean;
  /** Suggested next move (CALL/TEXT/EMAIL/REPLY + why); null on closed/snoozed. */
  nextAction: NextAction | null;
  /** Outreach touches logged (board replies + logged calls/texts). */
  touchCount: number;
  /** Whole days the card has sat in its current stage (open stages only). */
  daysInStage: number | null;
  /** True once an open card has aged past the stalled threshold. */
  stalled: boolean;
}

export interface BoardKpis {
  newThisWeek: number;
  hot: number;
  needsResponse: number;
  won30d: number;
  lost30d: number;
  conversionPct: number | null;
}

export interface BoardData {
  columns: Record<PipelineStage, BoardLead[]>;
  closedCounts: { won: number; lost: number };
  tray: BoardLead[];
  kpis: BoardKpis;
  generatedAt: string;
}

export interface BoardFilters {
  temp?: Temperature;
  occasion?: string;
  source?: string;
  /** How they reached us. Set instead of `source`, never alongside it. */
  channel?: LeadChannel;
  /** Exact formKey — set by clicking a row in the Sources panel. */
  form?: string;
  q?: string;
  showSnoozed?: boolean;
  includePartial?: boolean;
}

/**
 * Hot→cold within a column: score desc, unscored sink to the bottom, newest
 * first on ties. The operator works each column top-down daily.
 *
 * Lives here rather than in board-data.ts so the client-side work queue can
 * reuse it — board-data.ts imports Prisma and is server-only.
 */
export function compareBoardCards(a: BoardLead, b: BoardLead): number {
  const scoreDiff = (b.score ?? -1) - (a.score ?? -1);
  if (scoreDiff !== 0) return scoreDiff;
  return b.createdAt.localeCompare(a.createdAt);
}

/** Human labels for the board columns. */
export const STAGE_LABELS: Record<PipelineStage, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  QUOTE_SENT: 'Quote Sent',
  WON: 'Won',
  LOST: 'Lost',
};

/** Source-widget labels for cards/filters. */
export const SOURCE_LABELS: Record<string, string> = {
  QUICK_BUY: 'Quick Buy',
  PACKAGE_BUILDER: 'Package Builder',
  A_LA_CARTE: 'A La Carte',
  CALL_BOOKING: 'Call Booking',
  EMAIL_SIGNUP: 'Email Signup',
  CONTACT_FORM: 'Contact / Quote',
  DRINK_CALCULATOR: 'Calculator',
  PARTNER_FAREHARBOR_WEBHOOK: 'Partner',
  PARTNER_EMAIL_OPTIN: 'Partner',
  PARTNER_LANDING_PAGE: 'Concierge',
  GROUP_DASHBOARD: 'Party Dashboard',
  PARTNER_INQUIRY: 'B2B / Partner',
  OPS_INVOICE: 'Ops Invoice',
  LEAD_MAGNET: 'Lead Magnet',
  INBOUND_EMAIL: 'Inbound Email',
  PARTNER_OUTREACH: 'Partner Prospect',
  WAYNE_CHAT: 'Wayne Chat',
  OTHER: 'Site',
};

/**
 * Pseudo-source filter values (not LeadSourceWidget members) — resolved in
 * applyFilters() via tags: PARTNER = partner leads only, CONSUMER = exclude
 * partner leads.
 */
export const SOURCE_FILTER_PARTNER = 'PARTNER';
export const SOURCE_FILTER_CONSUMER = 'CONSUMER';
