/**
 * GET  /api/ops/followups/flags — master + per-journey flag states with
 *                                 queue counts for the admin dashboard.
 * POST /api/ops/followups/flags — toggle one flag { key, enabled }.
 *
 * Ops-auth only (/api/ops is NOT middleware-guarded — every route here must
 * gate itself).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import {
  FEATURE_FLAGS,
  enableFeature,
  disableFeature,
  type FeatureFlagKey,
} from '@/lib/features/feature-flags';
import { JOURNEYS } from '@/lib/followups/journeys';
import { getJourneyQueueCounts } from '@/lib/followups/attribution';

const TOGGLEABLE_KEYS = [
  FEATURE_FLAGS.FOLLOWUPS_MASTER,
  ...JOURNEYS.map((j) => j.featureFlag),
] as const;

const toggleSchema = z.object({
  key: z.enum(TOGGLEABLE_KEYS as unknown as [string, ...string[]]),
  enabled: z.boolean(),
});

export async function GET() {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const [flags, counts] = await Promise.all([
      prisma.featureFlag.findMany({
        where: { key: { in: [...TOGGLEABLE_KEYS] } },
      }),
      getJourneyQueueCounts(),
    ]);
    const enabledByKey = new Map(flags.map((f) => [f.key, f.enabled]));
    const countsByJourney = new Map(counts.map((c) => [c.journeyKey, c]));

    return NextResponse.json({
      success: true,
      master: {
        key: FEATURE_FLAGS.FOLLOWUPS_MASTER,
        enabled: enabledByKey.get(FEATURE_FLAGS.FOLLOWUPS_MASTER) ?? false,
      },
      journeys: JOURNEYS.map((j) => ({
        key: j.key,
        label: j.label,
        description: j.description,
        phase: j.phase,
        steps: j.steps.length,
        featureFlag: j.featureFlag,
        enabled: enabledByKey.get(j.featureFlag) ?? false,
        counts: countsByJourney.get(j.key) ?? {
          journeyKey: j.key,
          scheduled: 0,
          sent: 0,
          canceled: 0,
          suppressed: 0,
          failed: 0,
        },
      })),
    });
  } catch (error) {
    console.error('[ops/followups/flags GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load flags' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = toggleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
    }
    const { key, enabled } = parsed.data;
    if (enabled) {
      await enableFeature(key as FeatureFlagKey);
    } else {
      await disableFeature(key as FeatureFlagKey);
    }
    console.log(`[ops/followups] flag ${key} -> ${enabled ? 'ON' : 'OFF'}`);
    return NextResponse.json({ success: true, key, enabled });
  } catch (error) {
    console.error('[ops/followups/flags POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to toggle flag' }, { status: 500 });
  }
}
