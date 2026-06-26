/**
 * Experiment Tracking API
 * POST /api/experiments/track
 *
 * Records impressions, clicks, and conversions for experiment variants
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  recordImpression,
  recordClick,
  recordConversion,
  getExperimentById,
} from '@/lib/experiments/experiment-service';

// Validation schema for tracking events
const TrackingEventSchema = z.object({
  type: z.enum(['impression', 'click', 'conversion']),
  experimentId: z.string().min(1),
  variantId: z.string().min(1), // This is the content ID (control, variant-a, etc.)
  metadata: z.object({
    buttonText: z.string().optional(),
    revenue: z.number().optional(),
  }).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = TrackingEventSchema.parse(body);

    const { type, experimentId, variantId, metadata } = validatedData;

    // Get experiment to find the database variant ID
    const experiment = await getExperimentById(experimentId);

    if (!experiment) {
      return NextResponse.json(
        { error: 'Experiment not found' },
        { status: 404 }
      );
    }

    // Resolve the variant. Self-serve hero tests pass the real DB variant id;
    // the legacy homepage hero passes a content id (control/variant-a/…). Accept
    // both: match the DB id first, then fall back to the name→content-id mapping.
    const dbVariant =
      experiment.variants.find((v) => v.id === variantId) ??
      experiment.variants.find((v) => mapVariantNameToContentId(v.name) === variantId);

    if (!dbVariant) {
      // Variant not found - this might happen if variant was deleted
      // Log but don't fail
      console.warn(`Variant not found for contentId: ${variantId}`);
      return NextResponse.json({ success: true, warning: 'Variant not found' });
    }

    // Record the event
    let success = false;

    switch (type) {
      case 'impression':
        success = await recordImpression(dbVariant.id);
        break;
      case 'click':
        success = await recordClick(dbVariant.id);
        break;
      case 'conversion':
        success = await recordConversion(dbVariant.id, metadata?.revenue);
        break;
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to record event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      type,
      experimentId,
      variantId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error tracking event:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}

/**
 * Map variant name from database to hero content ID
 */
function mapVariantNameToContentId(variantName: string): string {
  const normalized = variantName.toLowerCase().trim();

  if (normalized === 'control') return 'control';
  if (normalized === 'variant a') return 'variant-a';
  if (normalized === 'variant b') return 'variant-b';
  if (normalized === 'variant c') return 'variant-c';

  return 'control';
}
