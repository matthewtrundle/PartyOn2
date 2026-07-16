/**
 * Experiments API - List and Create
 * GET /api/admin/experiments - List all experiments with variants
 * POST /api/admin/experiments - Create a new experiment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { CreateExperimentSchema } from '@/lib/experiments/experiment-schemas';
import { transformExperiment } from '@/lib/analytics/experiment-transform';
import { getTrailingExposureRates } from '@/lib/analytics/variant-rollup';

/**
 * GET /api/admin/experiments
 * List all experiments with their variants
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = searchParams.get('page');
    // `pages=` (comma-separated) scopes to a set of routes — the analytics hub
    // uses it because one tab can span several physical heroes (e.g. weddings
    // = /weddings + /wedding-drink-calculator + /austin-wedding-weekend-delivery).
    const pages = searchParams.get('pages');

    const where: Record<string, unknown> = {};

    if (status && ['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED'].includes(status)) {
      where.status = status;
    }

    if (pages) {
      const paths = pages.split(',').map((p) => p.trim()).filter(Boolean);
      if (paths.length > 0) where.page = { in: paths };
    } else if (page) {
      where.page = page;
    }

    const experiments = await prisma.experiment.findMany({
      where,
      include: {
        variants: {
          orderBy: { isControl: 'desc' },
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 100,
    });

    // Trailing 7-day exposure counts feed the projected-decision-date math;
    // the transform falls back to lifetime counters when the stream is empty.
    const exposureCounts = await getTrailingExposureRates(
      experiments.map((e) => e.id),
      7
    );

    // Per-row guard: one pathological row (counters are publicly writable)
    // must degrade to a skipped row, never blank the whole tab.
    const now = new Date();
    const transformedExperiments = experiments.flatMap((exp) => {
      try {
        return [transformExperiment(exp, now, exposureCounts)];
      } catch (e) {
        console.error(`experiments GET: transform failed for ${exp.id}:`, e);
        return [];
      }
    });

    // Group by status for summary
    const summary = {
      active: transformedExperiments.filter((e) => e.status === 'RUNNING').length,
      paused: transformedExperiments.filter((e) => e.status === 'PAUSED').length,
      completed: transformedExperiments.filter((e) => e.status === 'COMPLETED').length,
      draft: transformedExperiments.filter((e) => e.status === 'DRAFT').length,
    };

    return NextResponse.json({
      experiments: transformedExperiments,
      summary,
    });
  } catch (error) {
    console.error('Error fetching experiments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/experiments
 * Create a new experiment with variants
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const validatedData = CreateExperimentSchema.parse(body);

    // Ensure weights sum to 100
    const totalWeight = validatedData.variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      return NextResponse.json(
        { error: 'Variant weights must sum to 100' },
        { status: 400 }
      );
    }

    // Ensure exactly one control variant
    const controlCount = validatedData.variants.filter((v) => v.isControl).length;
    if (controlCount !== 1) {
      return NextResponse.json(
        { error: 'Exactly one variant must be marked as control' },
        { status: 400 }
      );
    }

    const experiment = await prisma.experiment.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        page: validatedData.page,
        elementId: validatedData.elementId,
        goalMetric: validatedData.goalMetric,
        goalValue: validatedData.goalValue,
        status: 'DRAFT',
        variants: {
          create: validatedData.variants.map((v) => ({
            name: v.name,
            description: v.description,
            isControl: v.isControl,
            weight: v.weight,
            content: v.content ?? undefined,
          })),
        },
      },
      include: {
        variants: true,
      },
    });

    return NextResponse.json(experiment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating experiment:', error);
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    );
  }
}
