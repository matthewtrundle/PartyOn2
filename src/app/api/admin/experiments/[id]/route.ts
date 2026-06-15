/**
 * Experiment API - Get, Update, Delete
 * GET /api/admin/experiments/[id] - Get experiment details
 * PATCH /api/admin/experiments/[id] - Update experiment
 * DELETE /api/admin/experiments/[id] - Delete experiment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { z } from 'zod';

// Validation schema for updating an experiment
const UpdateExperimentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED']).optional(),
  goalMetric: z.enum(['cta_click', 'scroll_depth', 'conversion', 'revenue']).optional(),
  goalValue: z.string().optional(),
  winningVariant: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/experiments/[id]
 * Get a single experiment with all details
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    const experiment = await prisma.experiment.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { isControl: 'desc' },
        },
      },
    });

    if (!experiment) {
      return NextResponse.json(
        { error: 'Experiment not found' },
        { status: 404 }
      );
    }

    // Calculate metrics
    const totalImpressions = experiment.variants.reduce((sum, v) => sum + v.impressions, 0);
    const controlVariant = experiment.variants.find((v) => v.isControl);

    const startDate = experiment.startDate ? new Date(experiment.startDate) : null;
    const daysRunning = startDate
      ? Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate uplift for each non-control variant
    const variantsWithMetrics = experiment.variants.map((v) => {
      const clickRate = v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0;
      const conversionRate = v.impressions > 0 ? (v.conversions / v.impressions) * 100 : 0;

      let uplift = 0;
      if (!v.isControl && controlVariant && controlVariant.impressions > 0) {
        const controlRate = controlVariant.clicks / controlVariant.impressions;
        const variantRate = v.impressions > 0 ? v.clicks / v.impressions : 0;
        uplift = controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0;
      }

      return {
        ...v,
        clickRate: Math.round(clickRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        uplift: Math.round(uplift * 10) / 10,
      };
    });

    // Determine recommended action
    let recommendedAction = 'Waiting for data';
    if (totalImpressions >= 1000) {
      const bestNonControl = variantsWithMetrics
        .filter((v) => !v.isControl)
        .sort((a, b) => b.clickRate - a.clickRate)[0];

      if (bestNonControl && experiment.confidence && experiment.confidence >= 95) {
        recommendedAction = `Implement "${bestNonControl.name}" - statistically significant`;
      } else if (bestNonControl && experiment.confidence && experiment.confidence >= 80) {
        recommendedAction = 'Continue test - approaching significance';
      } else {
        recommendedAction = 'Continue test - more data needed';
      }
    } else {
      recommendedAction = `Need ${1000 - totalImpressions} more impressions`;
    }

    return NextResponse.json({
      ...experiment,
      variants: variantsWithMetrics,
      totalImpressions,
      daysRunning,
      recommendedAction,
    });
  } catch (error) {
    console.error('Error fetching experiment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiment' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/experiments/[id]
 * Update an experiment
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateExperimentSchema.parse(body);

    // Check if experiment exists
    const existing = await prisma.experiment.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Experiment not found' },
        { status: 404 }
      );
    }

    // Handle status transitions
    const updateData: Record<string, unknown> = { ...validatedData };

    if (validatedData.status === 'RUNNING' && existing.status === 'DRAFT') {
      updateData.startDate = new Date();
    }

    if (validatedData.status === 'COMPLETED' && !existing.endDate) {
      updateData.endDate = new Date();
    }

    const experiment = await prisma.experiment.update({
      where: { id },
      data: updateData,
      include: {
        variants: true,
      },
    });

    return NextResponse.json(experiment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating experiment:', error);
    return NextResponse.json(
      { error: 'Failed to update experiment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/experiments/[id]
 * Delete an experiment and its variants
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    // Check if experiment exists
    const existing = await prisma.experiment.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Experiment not found' },
        { status: 404 }
      );
    }

    // Prevent deleting active experiments
    if (existing.status === 'RUNNING') {
      return NextResponse.json(
        { error: 'Cannot delete an active experiment. Pause or complete it first.' },
        { status: 400 }
      );
    }

    // Delete experiment (variants cascade delete)
    await prisma.experiment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting experiment:', error);
    return NextResponse.json(
      { error: 'Failed to delete experiment' },
      { status: 500 }
    );
  }
}
