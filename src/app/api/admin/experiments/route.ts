/**
 * Experiments API - List and Create
 * GET /api/admin/experiments - List all experiments with variants
 * POST /api/admin/experiments - Create a new experiment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { computeSignificance, type VariantStat } from '@/lib/analytics/experiment-significance';

// Hero-copy payload an operator can set per variant (all fields optional —
// an absent field falls back to the page's default copy).
const VariantContentSchema = z.object({
  eyebrow: z.string().max(200).optional(),
  headline: z.string().max(300).optional(),
  subhead: z.string().max(500).optional(),
  ctaText: z.string().max(120).optional(),
});

// Validation schema for creating an experiment
const CreateExperimentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  page: z.string().min(1, 'Page is required'),
  elementId: z.string().min(1, 'Element ID is required'),
  goalMetric: z.enum(['cta_click', 'scroll_depth', 'conversion', 'revenue']),
  goalValue: z.string().optional(),
  variants: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    isControl: z.boolean().default(false),
    weight: z.number().min(0).max(100).default(50),
    content: VariantContentSchema.optional(),
  })).min(2, 'At least 2 variants required'),
});

/**
 * Per-variant success count for the significance test: for click-style goals the
 * "success" is a click; for conversion/revenue goals it's a recorded conversion.
 */
function successCount(
  goalMetric: string,
  v: { clicks: number; conversions: number }
): number {
  return goalMetric === 'cta_click' || goalMetric === 'scroll_depth' ? v.clicks : v.conversions;
}

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

    const where: Record<string, unknown> = {};

    if (status && ['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED'].includes(status)) {
      where.status = status;
    }

    if (page) {
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
    });

    // Transform to include calculated metrics
    const transformedExperiments = experiments.map((exp) => {
      const totalImpressions = exp.variants.reduce((sum, v) => sum + v.impressions, 0);
      const controlVariant = exp.variants.find((v) => v.isControl);
      const bestVariant = exp.variants.reduce((best, v) => {
        if (v.isControl) return best;
        const vRate = v.impressions > 0 ? v.clicks / v.impressions : 0;
        const bestRate = best && best.impressions > 0 ? best.clicks / best.impressions : 0;
        return vRate > bestRate ? v : best;
      }, null as typeof exp.variants[0] | null);

      let uplift = 0;
      if (controlVariant && bestVariant && controlVariant.impressions > 0 && bestVariant.impressions > 0) {
        const controlRate = controlVariant.clicks / controlVariant.impressions;
        const bestRate = bestVariant.clicks / bestVariant.impressions;
        uplift = controlRate > 0 ? ((bestRate - controlRate) / controlRate) * 100 : 0;
      }

      const startDate = exp.startDate ? new Date(exp.startDate) : null;
      const daysRunning = startDate
        ? Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Two-proportion z-test significance over the variant counters, using the
      // goal-appropriate success count (clicks for click goals, conversions otherwise).
      const sigStats: VariantStat[] = exp.variants.map((v) => ({
        id: v.id,
        name: v.name,
        isControl: v.isControl,
        impressions: v.impressions,
        conversions: successCount(exp.goalMetric, v),
      }));
      const significance = computeSignificance(sigStats);

      return {
        ...exp,
        totalImpressions,
        uplift: Math.round(uplift * 10) / 10,
        daysRunning,
        significance,
        variants: exp.variants.map((v) => ({
          ...v,
          clickRate: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
          conversionRate: v.impressions > 0 ? (v.conversions / v.impressions) * 100 : 0,
        })),
      };
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
