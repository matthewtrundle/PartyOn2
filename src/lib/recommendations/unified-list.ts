/**
 * Unified recommendation queue — merges Marketing/SEO (RecommendationItem)
 * and Operations (OperationsRecommendation) into the shared
 * RecommendationCardData shape so a single triage UI can render any domain.
 *
 * Per OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md §11 #1 (resolved decision):
 *   "ONE QUEUE WITH FILTER CHIPS. Shared RecommendationCard component
 *    renders each domain's card style."
 */

import { prisma } from '@/lib/database/client';
import type { Prisma } from '@prisma/client';
import type {
  ActionPayload,
  RecommendationCardData,
  Severity,
} from './card-types';
import type {
  EffortTier,
  RecommendationStatus,
  RiskTier,
} from './lifecycle';
import type { ActionLogEntry, OpsEvidence, OpsSeverity } from '@/lib/operations/types';

export type DomainFilter = 'all' | 'marketing' | 'seo' | 'operations';

export interface UnifiedListOpts {
  domain?: DomainFilter;
  status?: RecommendationStatus | RecommendationStatus[];
  limit?: number;
}

export interface UnifiedListResult {
  data: RecommendationCardData[];
  counts: Record<'marketing' | 'seo' | 'operations', number>;
  detectorRanAt: {
    marketing: string | null;
    seo: string | null;
    operations: string | null;
  };
}

const SEVERITY_RANK: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

/** Ops 3-tier → shared 4-tier severity. */
function mapOpsSeverity(s: OpsSeverity): Severity {
  if (s === 'urgent') return 'critical';
  if (s === 'high') return 'high';
  return 'medium';
}

/**
 * Marketing recs don't carry severity directly. Derive one from risk +
 * impact so unified sorting puts hard-stop / high-impact items near urgent
 * ops recs.
 */
function deriveMarketingSeverity(
  riskTier: RiskTier,
  impactDollarsMonthly: number | null
): Severity {
  if (riskTier === 'hard_stop') return 'high';
  if (impactDollarsMonthly != null && impactDollarsMonthly >= 1000) return 'high';
  if (impactDollarsMonthly != null && impactDollarsMonthly >= 250) return 'medium';
  return 'low';
}

/** Build a readable body block from ops evidence rows. */
function bodyFromEvidence(evidence: OpsEvidence[]): string {
  const lines: string[] = [];
  for (const e of evidence) {
    if (e.note) lines.push(e.note);
    if (e.metricName && e.metricValue !== undefined && e.metricValue !== null) {
      lines.push(`${e.metricName}: ${e.metricValue}`);
    }
  }
  return lines.join('\n');
}

function isRiskTier(x: unknown): x is RiskTier {
  return x === 'autonomous' || x === 'recommend' || x === 'hard_stop';
}

function isEffortTier(x: unknown): x is EffortTier {
  return x === 's' || x === 'm' || x === 'l';
}

function isRecommendationStatus(x: unknown): x is RecommendationStatus {
  return (
    x === 'open' || x === 'approved' || x === 'shipped' ||
    x === 'rejected' || x === 'invalidated' || x === 'snoozed'
  );
}

interface RecommendationItemRow {
  id: string;
  domain: string;
  source: string;
  generatedAt: Date;
  title: string;
  body: string | null;
  segment: string | null;
  metric: string | null;
  currentValue: string | null;
  targetValue: string | null;
  impactDollarsMonthly: number | null;
  effortTier: string | null;
  riskTier: string;
  status: string;
  shippedAt: Date | null;
  notes: string | null;
  resultMetricBefore: Prisma.JsonValue | null;
  resultMetricAfter: Prisma.JsonValue | null;
}

function mapMarketing(row: RecommendationItemRow): RecommendationCardData {
  const riskTier: RiskTier = isRiskTier(row.riskTier) ? row.riskTier : 'recommend';
  const effortTier: EffortTier | null = isEffortTier(row.effortTier) ? row.effortTier : null;
  const status: RecommendationStatus = isRecommendationStatus(row.status) ? row.status : 'open';
  const before = (row.resultMetricBefore ?? null) as RecommendationCardData['resultMetricBefore'];
  const after = (row.resultMetricAfter ?? null) as RecommendationCardData['resultMetricAfter'];
  const domain: 'marketing' | 'seo' = row.domain === 'seo' ? 'seo' : 'marketing';
  return {
    id: row.id,
    domain,
    source: row.source,
    generatedAt: row.generatedAt.toISOString(),
    title: row.title,
    body: row.body,
    segment: row.segment,
    metric: row.metric,
    currentValue: row.currentValue,
    targetValue: row.targetValue,
    impactDollarsMonthly: row.impactDollarsMonthly,
    effortTier,
    riskTier,
    status,
    shippedAt: row.shippedAt?.toISOString() ?? null,
    notes: row.notes,
    resultMetricBefore: before,
    resultMetricAfter: after,
    actionPayload: null,
    severity: deriveMarketingSeverity(riskTier, row.impactDollarsMonthly),
  };
}

interface OperationsRow {
  id: string;
  signalKind: string;
  severity: string;
  title: string;
  evidence: Prisma.JsonValue;
  targetEntityType: string;
  targetEntityId: string;
  actionPayload: Prisma.JsonValue;
  status: string;
  source: string;
  dismissReason: string | null;
  shippedAt: Date | null;
  createdAt: Date;
}

function mapOperations(row: OperationsRow): RecommendationCardData {
  const sev: OpsSeverity = row.severity === 'urgent' || row.severity === 'high' ? row.severity : 'normal';
  const status: RecommendationStatus = isRecommendationStatus(row.status) ? row.status : 'open';
  const evidence = Array.isArray(row.evidence) ? (row.evidence as unknown as OpsEvidence[]) : [];
  const action = (row.actionPayload && typeof row.actionPayload === 'object'
    ? row.actionPayload as unknown as ActionPayload
    : null);
  return {
    id: row.id,
    domain: 'ops',
    source: row.source,
    generatedAt: row.createdAt.toISOString(),
    title: row.title,
    body: bodyFromEvidence(evidence),
    segment: null,
    metric: row.signalKind,
    currentValue: null,
    targetValue: null,
    impactDollarsMonthly: null,
    effortTier: null,
    // Ops recs are operator-confirmed inline actions — `recommend` keeps the
    // existing "operator clicks to act" semantics on the shared card.
    riskTier: 'recommend',
    status,
    shippedAt: row.shippedAt?.toISOString() ?? null,
    notes: row.dismissReason,
    resultMetricBefore: null,
    resultMetricAfter: null,
    actionPayload: action,
    severity: mapOpsSeverity(sev),
  };
}

/**
 * Load merged recs across Marketing/SEO + Operations. The unified queue is
 * additive — Marketing's existing pipeline remains untouched.
 */
export async function listUnifiedRecommendations(
  opts: UnifiedListOpts = {}
): Promise<UnifiedListResult> {
  const domain: DomainFilter = opts.domain ?? 'all';
  const limit = Math.min(500, Math.max(1, opts.limit ?? 250));
  const statuses = opts.status
    ? Array.isArray(opts.status) ? opts.status : [opts.status]
    : (['open', 'approved'] as RecommendationStatus[]);

  const includeOps = domain === 'all' || domain === 'operations';
  const includeMarketing = domain === 'all' || domain === 'marketing' || domain === 'seo';

  const marketingDomainFilter =
    domain === 'marketing' ? { domain: 'marketing' } :
    domain === 'seo' ? { domain: 'seo' } :
    {};

  const [marketingRows, opsRows, latestOpsSnap, latestMarketingSnap] = await Promise.all([
    includeMarketing
      ? prisma.recommendationItem.findMany({
          where: { status: { in: statuses }, ...marketingDomainFilter },
          orderBy: [{ generatedAt: 'desc' }],
          take: limit,
        })
      : Promise.resolve([] as RecommendationItemRow[]),
    includeOps
      ? prisma.operationsRecommendation.findMany({
          where: { status: { in: statuses } },
          orderBy: [{ createdAt: 'desc' }],
          take: limit,
        })
      : Promise.resolve([] as OperationsRow[]),
    prisma.operationsSnapshot.findFirst({ orderBy: { capturedAt: 'desc' }, select: { capturedAt: true } }),
    prisma.analyticsSnapshot.findFirst({ orderBy: { date: 'desc' }, select: { date: true } }),
  ]);

  const mapped = [
    ...marketingRows.map(mapMarketing),
    ...opsRows.map(mapOperations),
  ];

  mapped.sort((a, b) => {
    const sa = SEVERITY_RANK[a.severity ?? 'low'];
    const sb = SEVERITY_RANK[b.severity ?? 'low'];
    if (sa !== sb) return sb - sa;
    return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
  });

  const counts = { marketing: 0, seo: 0, operations: 0 };
  for (const r of mapped) {
    if (r.status !== 'open' && r.status !== 'approved') continue;
    if (r.domain === 'ops') counts.operations += 1;
    else if (r.domain === 'seo') counts.seo += 1;
    else if (r.domain === 'marketing') counts.marketing += 1;
  }

  return {
    data: mapped,
    counts,
    detectorRanAt: {
      operations: latestOpsSnap?.capturedAt.toISOString() ?? null,
      marketing: latestMarketingSnap?.date.toISOString() ?? null,
      seo: latestMarketingSnap?.date.toISOString() ?? null,
    },
  };
}

/**
 * Look up a rec by id across both tables. Returns the domain so the caller
 * knows which store handles the mutation.
 */
export async function findRecommendationLocation(
  id: string
): Promise<{ domain: 'ops' | 'marketing-seo'; status: RecommendationStatus } | null> {
  const ops = await prisma.operationsRecommendation.findUnique({
    where: { id },
    select: { status: true },
  });
  if (ops) {
    return {
      domain: 'ops',
      status: isRecommendationStatus(ops.status) ? ops.status : 'open',
    };
  }
  const mkt = await prisma.recommendationItem.findUnique({
    where: { id },
    select: { status: true },
  });
  if (mkt) {
    return {
      domain: 'marketing-seo',
      status: isRecommendationStatus(mkt.status) ? mkt.status : 'open',
    };
  }
  return null;
}

/** Extracted for testing — caller passes the unverified shape. */
export function isExecutableStatus(status: RecommendationStatus): boolean {
  return status === 'open' || status === 'approved';
}

/** Pure helper exported for tests. */
export function buildActionLogEntry(input: {
  actionKind: string;
  actionLabel: string;
  result: 'navigated' | 'success' | 'error' | 'not_implemented';
  errorMessage?: string;
}): ActionLogEntry {
  return {
    timestamp: new Date().toISOString(),
    actionKind: input.actionKind,
    actionLabel: input.actionLabel,
    result: input.result,
    errorMessage: input.result === 'not_implemented'
      ? 'apiCall actions not yet implemented (Phase 1C-b)'
      : input.errorMessage,
  };
}
