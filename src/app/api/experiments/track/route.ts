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
import { checkRateLimit } from '@/lib/security/rate-limit';
import { mapVariantNameToContentId } from '@/lib/experiments/hero-variants';

// Validation schema for tracking events
const TrackingEventSchema = z.object({
  type: z.enum(['impression', 'click', 'conversion']),
  experimentId: z.string().min(1),
  variantId: z.string().min(1), // This is the content ID (control, variant-a, etc.)
  metadata: z.object({
    buttonText: z.string().max(200).optional(),
    // Bounded — these counters feed the A/B winner readout, so an arbitrary
    // revenue number from a public endpoint must be clamped.
    revenue: z.number().finite().min(0).max(10_000).optional(),
  }).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Throttle: unauthenticated write path whose counters drive winner
    // declarations. A real visitor fires a handful of events per page view;
    // 60/min per IP is generous headroom while blunting counter-stuffing.
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const allowed = await checkRateLimit('experiment-track', ip, 60, 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

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

    // Only RUNNING experiments accept events — pages only fire these after a
    // live assignment, so anything else is noise or deliberate stuffing.
    if (experiment.status !== 'RUNNING') {
      return NextResponse.json({ success: true, warning: 'Experiment not running' });
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
