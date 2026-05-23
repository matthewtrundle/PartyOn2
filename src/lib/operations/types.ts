/**
 * Shared TS types for the Operations Director pipeline.
 *
 * These are the in-memory shapes the heuristic generators produce and the
 * store consumes. The DB row (Prisma OperationsRecommendation) is a thin
 * persisted version of OperationsRecommendationInput plus lifecycle columns.
 */

import type { ActionPayload, Evidence } from '@/lib/recommendations/card-types';

/**
 * Each of the 9 drift signals (§6) + pre-fulfillment shortage. Open string
 * union so future signals can be added without touching the DB schema.
 */
export type SignalKind =
  | 'receiving-lag'
  | 'pick-inventory-lag'
  | 'repeated-shorts'
  | 'negative-available'
  | 'velocity-anomaly'
  | 'ai-note-backlog'
  | 'variant-mismapping'
  | 'cost-coverage-gap'
  | 'cycle-count-overdue'
  | 'pre-fulfillment-shortage';

/**
 * Severity — Ops uses a 3-tier scale distinct from the shared 4-tier Severity
 * in card-types.ts. Map 'urgent'→'critical', 'high'→'high', 'normal'→'medium'
 * when rendering through the shared card.
 */
export type OpsSeverity = 'urgent' | 'high' | 'normal';

export type OpsTargetEntityType =
  | 'productVariant'
  | 'order'
  | 'draftOrder'
  | 'inventoryNote'
  | 'receivingInvoice'
  | 'vendor';

export interface OpsEvidence extends Evidence {
  metricName?: string;
  metricValue?: string | number;
  sourceLinks?: Array<{ label: string; href: string }>;
  note?: string;
}

/**
 * Generator output. Persisted via recommendation-store.upsertRecommendations.
 */
export interface OperationsRecommendationInput {
  signalKind: SignalKind;
  severity: OpsSeverity;
  title: string;
  evidence: OpsEvidence[];
  targetEntityType: OpsTargetEntityType;
  targetEntityId: string;
  actionPayload: ActionPayload;
  /** Optional override; default = `${signalKind}:${targetEntityId}`. */
  dedupeKey?: string;
  source?: 'auto-snapshot' | 'auto-hourly' | 'director';
}

/**
 * Audit trail entry on OperationsRecommendation.actionLog.
 *
 * Result vocabulary:
 *  - 'navigated'        operator clicked a deep-link action; we logged the click
 *                       and bumped status to `approved`. No mutation performed.
 *  - 'success'          apiCall executed and the underlying endpoint returned 2xx.
 *  - 'error'            apiCall failed; `errorMessage` carries the reason.
 *  - 'not_implemented'  apiCall kind exists in the dispatcher but the writer
 *                       isn't wired yet (Phase 1C scaffolds, Phase 1C-b ships).
 */
export interface ActionLogEntry {
  timestamp: string; // ISO
  actionKind?: string;
  actionLabel: string;
  result: 'navigated' | 'success' | 'error' | 'not_implemented';
  errorMessage?: string;
  relatedMovementId?: string;
  actor?: string;
}

export function buildDedupeKey(signalKind: SignalKind, targetEntityId: string): string {
  return `${signalKind}:${targetEntityId}`;
}

/**
 * Severity precedence — used when a re-detection wants to bump up an existing
 * rec. Higher index = louder.
 */
const SEVERITY_RANK: Record<OpsSeverity, number> = {
  normal: 0,
  high: 1,
  urgent: 2,
};

export function isHigherSeverity(a: OpsSeverity, b: OpsSeverity): boolean {
  return SEVERITY_RANK[a] > SEVERITY_RANK[b];
}

/**
 * Knock severity down one tier — used when a rec was previously rejected and
 * we want to surface again but quieter. Reason: noise tolerance — see §5d.
 */
export function knockDownSeverity(s: OpsSeverity): OpsSeverity {
  if (s === 'urgent') return 'high';
  if (s === 'high') return 'normal';
  return 'normal';
}
