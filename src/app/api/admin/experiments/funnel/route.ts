/**
 * GET /api/admin/experiments/funnel
 *
 * Aggregates LeadEvent rows into a funnel + per-experiment-variant
 * breakdown. Powers the "Experiments & Funnels" tab in Brian's Stuff.
 *
 * Query params:
 *   page          (optional) restrict to events fired on a specific path
 *   experiment    (optional) only count events that match this experimentKey
 *   sinceDays     (optional, default 14) lookback window
 *
 * Returns:
 *   {
 *     window: { sinceDays, since, until },
 *     steps: [{ step, count, sessions }, ...],
 *     experiments: [
 *       {
 *         key, label, variants: [
 *           { variant, sessions, conversions, conversionRate, byStep: { step: count } }
 *         ],
 *         significance?: { winner, confidence }
 *       }
 *     ]
 *   }
 */
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/database/client';
import { Prisma } from '@prisma/client';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import {
  EXPERIMENTS,
  type ExperimentDef,
} from '@/lib/experiments/registry';
import { DEFAULT_FUNNEL, type FunnelStep } from '@/lib/experiments/funnelSteps';
import { computeSignificance } from '@/lib/analytics/experiment-significance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FunnelRow = { step: string; count: number; sessions: number };
type VariantStats = {
  variant: string;
  label: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
  byStep: Record<string, number>;
};

export async function GET(req: NextRequest) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const page = url.searchParams.get('page');
  const expFilter = url.searchParams.get('experiment');
  const sinceDays = Math.min(
    Math.max(parseInt(url.searchParams.get('sinceDays') ?? '14', 10) || 14, 1),
    90,
  );
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  // Pull every funnel-tagged LeadEvent in the window. We rely on the
  // JSON `metadata.funnelStep` path being populated by the funnelTrack
  // helper. Filter narrows the query if a page or experiment is given.
  const where: Prisma.LeadEventWhereInput = {
    occurredAt: { gte: since },
    metadata: { not: Prisma.JsonNull },
  };
  if (page) where.page = page;

  const events = await prisma.leadEvent.findMany({
    where,
    select: {
      id: true,
      sessionId: true,
      page: true,
      metadata: true,
      occurredAt: true,
      type: true,
      fieldName: true,
    },
    take: 50_000, // hard cap to keep the query bounded
    orderBy: { occurredAt: 'desc' },
  });

  type Meta = {
    funnelStep?: FunnelStep;
    experimentKey?: string;
    variant?: string;
  };

  // Tally for the default funnel (no experiment filter).
  const stepSessions: Record<string, Set<string>> = {};
  const stepCounts: Record<string, number> = {};

  // Tally per experiment → variant → step.
  type ExpTally = {
    sessions: Set<string>;
    conversions: Set<string>;
    byStep: Record<string, Set<string>>;
  };
  const perExperiment: Record<string, Record<string, ExpTally>> = {};

  for (const ev of events) {
    const meta = (ev.metadata as Meta | null) ?? {};
    const step = meta.funnelStep ?? (ev.fieldName as FunnelStep | undefined);
    if (!step) continue;
    const sid = ev.sessionId ?? `lead:${ev.id}`;

    if (expFilter) {
      if (meta.experimentKey !== expFilter) continue;
    }

    if (!stepSessions[step]) stepSessions[step] = new Set();
    stepSessions[step].add(sid);
    stepCounts[step] = (stepCounts[step] ?? 0) + 1;

    if (meta.experimentKey && meta.variant) {
      perExperiment[meta.experimentKey] ??= {};
      const variants = perExperiment[meta.experimentKey];
      variants[meta.variant] ??= {
        sessions: new Set(),
        conversions: new Set(),
        byStep: {},
      };
      const t = variants[meta.variant];
      t.sessions.add(sid);
      t.byStep[step] ??= new Set() as unknown as never;
      // byStep stores a Set; we cast to Set<string> for typing.
      (t.byStep[step] as unknown as Set<string>).add(sid);
      if (step === 'conversion') t.conversions.add(sid);
    }
  }

  // Build the funnel array in canonical order.
  const steps: FunnelRow[] = DEFAULT_FUNNEL.map((step) => ({
    step,
    count: stepCounts[step] ?? 0,
    sessions: stepSessions[step]?.size ?? 0,
  }));

  // Flatten experiments — bake significance (control vs each test cell).
  const experiments = EXPERIMENTS.filter((e) => !expFilter || e.key === expFilter).map(
    (e: ExperimentDef) => {
      const tallies = perExperiment[e.key] ?? {};
      const variants: VariantStats[] = e.variants.map((v) => {
        const t = tallies[v.key];
        const sessions = t?.sessions.size ?? 0;
        const conversions = t?.conversions.size ?? 0;
        const byStep: Record<string, number> = {};
        if (t) {
          for (const [s, set] of Object.entries(t.byStep)) {
            byStep[s] = (set as unknown as Set<string>).size;
          }
        }
        return {
          variant: v.key,
          label: v.label,
          sessions,
          conversions,
          conversionRate: sessions === 0 ? 0 : conversions / sessions,
          byStep,
        };
      });

      // Significance — feed every variant into the two-proportion z-test.
      // Caller arrays must include one row per variant with isControl set
      // on the first one (registry convention).
      const sig = computeSignificance(
        variants.map((v, idx) => ({
          id: v.variant,
          name: v.label,
          isControl: idx === 0,
          impressions: v.sessions,
          conversions: v.conversions,
        })),
      );

      return {
        key: e.key,
        label: e.label,
        hypothesis: e.hypothesis,
        primaryMetric: e.primaryMetric,
        pages: e.pages,
        status: e.status,
        variants,
        significance: sig,
      };
    },
  );

  return NextResponse.json({
    ok: true,
    window: {
      sinceDays,
      since: since.toISOString(),
      until: new Date().toISOString(),
    },
    page: page ?? null,
    steps,
    experiments,
  });
}
