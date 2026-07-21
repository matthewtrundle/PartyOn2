/**
 * Lead Flow board — shared DTO types (Prisma-free so the /admin/leads client
 * components can import them; the server aggregation lives in board-data.ts).
 */

import type { Temperature } from './scoring';
import type { PipelineStage } from './pipeline-types';

export interface BoardLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: PipelineStage | null;
  sortOrder: number;
  score: number | null;
  temperature: Temperature | null;
  occasion: string | null;
  eventDate: string | null;
  headcount: number | null;
  budgetPerPerson: number | null;
  sourceWidget: string | null;
  sourcePage: string | null;
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
  q?: string;
  showSnoozed?: boolean;
  includePartial?: boolean;
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
  OTHER: 'Site',
};

/**
 * Pseudo-source filter values (not LeadSourceWidget members) — resolved in
 * applyFilters() via tags: PARTNER = partner leads only, CONSUMER = exclude
 * partner leads.
 */
export const SOURCE_FILTER_PARTNER = 'PARTNER';
export const SOURCE_FILTER_CONSUMER = 'CONSUMER';
