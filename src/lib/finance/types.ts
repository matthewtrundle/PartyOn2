/**
 * Shared TS types for the Finance Director pipeline.
 *
 * Mirrors src/lib/operations/types.ts. The DB row (Prisma FinanceRecommendation)
 * is a thin persisted version of FinanceRecommendationInput plus lifecycle
 * columns.
 */

import type { ActionPayload, Evidence } from '@/lib/recommendations/card-types';

/**
 * The 12 financial signals from the buildout brief §8. Signals 2/5/6 are
 * deferred (Phase 1B cancelled / Phase 3 not yet built / Phase 4 not yet built)
 * — kept here as union members so adding their detectors later doesn't
 * require touching this type.
 */
export type FinanceSignalKind =
  | 'stripe-payout-unmatched'    // 1
  // | 'distributor-invoice-past-due' // 2 — REMOVED (Phase 1B cancelled)
  | 'cash-runway-low'            // 3
  | 'gross-margin-trending-down' // 4
  // | 'sales-tax-accrual-high'   // 5 — needs Phase 4 (tax remittance log)
  // | 'contractor-near-1099'     // 6 — needs Phase 3 (Contractor model)
  | 'opex-category-spiking'      // 7
  | 'affiliate-commission-aging' // 8
  | 'discount-overuse'           // 9
  | 'untouched-bank-transaction' // 10
  | 'qb-sync-error'              // 11
  | 'plaid-sync-error';          // 12

export type FinanceSeverity = 'urgent' | 'high' | 'normal';

export type FinanceTargetEntityType =
  | 'stripePayout'
  | 'plaidTransaction'
  | 'qbCategory'
  | 'discountCode'
  | 'affiliateCommissionBatch'
  | 'plaidItem'
  | 'intuitConnection'
  | 'snapshot';

export interface FinanceEvidence extends Evidence {
  metricName?: string;
  metricValue?: string | number;
  sourceLinks?: Array<{ label: string; href: string }>;
  note?: string;
}

export interface FinanceRecommendationInput {
  signalKind: FinanceSignalKind;
  severity: FinanceSeverity;
  title: string;
  evidence: FinanceEvidence[];
  targetEntityType: FinanceTargetEntityType;
  targetEntityId: string;
  actionPayload: ActionPayload;
  /** Optional override; default = `${signalKind}:${targetEntityId}`. */
  dedupeKey?: string;
  source?: 'auto-snapshot' | 'director';
}

/**
 * Audit-log entry on FinanceRecommendation.actionLog.
 */
export interface ActionLogEntry {
  timestamp: string;
  actionKind?: string;
  actionLabel: string;
  result: 'navigated' | 'success' | 'error' | 'not_implemented';
  errorMessage?: string;
  actor?: string;
}

export function buildDedupeKey(
  signalKind: FinanceSignalKind,
  targetEntityId: string
): string {
  return `${signalKind}:${targetEntityId}`;
}

const SEVERITY_RANK: Record<FinanceSeverity, number> = {
  normal: 0,
  high: 1,
  urgent: 2,
};

export function isHigherSeverity(a: FinanceSeverity, b: FinanceSeverity): boolean {
  return SEVERITY_RANK[a] > SEVERITY_RANK[b];
}

export function knockDownSeverity(s: FinanceSeverity): FinanceSeverity {
  if (s === 'urgent') return 'high';
  if (s === 'high') return 'normal';
  return 'normal';
}
