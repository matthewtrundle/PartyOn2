/**
 * Experiment Assignment API
 * GET /api/experiments/assign?page=/&elementId=hero&visitorId=xxx
 *
 * Returns the assigned variant for a visitor
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveExperiment,
  assignVariantByWeight,
} from '@/lib/experiments/experiment-service';
import { mapVariantNameToContentId } from '@/lib/experiments/hero-variants';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page');
  const elementId = searchParams.get('elementId');
  const visitorId = searchParams.get('visitorId');

  // Validate required parameters
  if (!page || !elementId || !visitorId) {
    return NextResponse.json(
      { error: 'Missing required parameters: page, elementId, visitorId' },
      { status: 400 }
    );
  }

  try {
    // Get active experiment for this page/element
    const experiment = await getActiveExperiment(page, elementId);

    if (!experiment) {
      // No active experiment - return 200 with null values (not 404)
      // This is expected when no experiments are configured
      return NextResponse.json({
        experimentId: null,
        experimentName: null,
        variantId: null,
        variantName: null,
        variantDbId: null,
        message: 'No active experiment for this page/element',
      });
    }

    // Map variants to weight structure
    const variantWeights = experiment.variants.map((v) => ({
      id: v.id,
      weight: v.weight,
    }));

    // Assign variant based on visitor ID (deterministic)
    const assignedVariantId = assignVariantByWeight(
      visitorId,
      experiment.id,
      variantWeights
    );

    // Find the full variant data
    const assignedVariant = experiment.variants.find(
      (v) => v.id === assignedVariantId
    );

    if (!assignedVariant) {
      return NextResponse.json(
        { error: 'Failed to assign variant' },
        { status: 500 }
      );
    }

    // Map database variant ID to hero variant content ID
    // The variant name determines which hero content to use
    const variantContentId = mapVariantNameToContentId(assignedVariant.name);

    return NextResponse.json({
      experimentId: experiment.id,
      experimentName: experiment.name,
      variantId: variantContentId,
      variantName: assignedVariant.name,
      variantDbId: assignedVariant.id,
      // Self-serve hero copy stored on the variant (null = render page default).
      content: assignedVariant.content ?? null,
      goalMetric: experiment.goalMetric,
    });
  } catch (error) {
    console.error('Error assigning variant:', error);
    return NextResponse.json(
      { error: 'Failed to assign variant' },
      { status: 500 }
    );
  }
}

