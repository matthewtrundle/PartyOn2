/**
 * GET /api/ops/followups/copy — defaults + saved overrides + token docs for
 *                               the admin copy editor.
 * PUT /api/ops/followups/copy — save one step's override
 *                               { journeyKey, step, subject?, body? }.
 *                               Empty subject AND body resets to default.
 *
 * Ops-auth only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { DEFAULT_COPY, TOKEN_REFERENCE } from '@/lib/followups/copy';
import {
  getFollowUpCopyOverrides,
  saveFollowUpCopyOverride,
} from '@/lib/followups/copy-overrides';
import { JOURNEY_KEYS } from '@/lib/followups/journeys';
import type { JourneyKey } from '@/lib/followups/types';

const saveSchema = z.object({
  journeyKey: z.enum(JOURNEY_KEYS as [string, ...string[]]),
  step: z.number().int().min(1).max(2),
  subject: z.string().max(200).optional().default(''),
  body: z.string().max(8000).optional().default(''),
});

export async function GET() {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const overrides = await getFollowUpCopyOverrides();
    return NextResponse.json({
      success: true,
      defaults: DEFAULT_COPY,
      tokens: TOKEN_REFERENCE,
      overrides,
    });
  } catch (error) {
    console.error('[ops/followups/copy GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load copy' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = saveSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
    }
    const { journeyKey, step, subject, body } = parsed.data;

    // A step must actually exist to be overridden (e.g. no step 2 on
    // newsletter-welcome; event-quiz step 1 is intentionally empty).
    const defaults = DEFAULT_COPY[journeyKey as JourneyKey]?.[step - 1];
    if (!defaults || (!defaults.subject && !defaults.body)) {
      return NextResponse.json(
        { success: false, error: 'That journey step has no editable copy' },
        { status: 400 }
      );
    }

    const overrides = await saveFollowUpCopyOverride(
      journeyKey as JourneyKey,
      step,
      { subject, body },
      'admin'
    );
    return NextResponse.json({ success: true, overrides });
  } catch (error) {
    console.error('[ops/followups/copy PUT] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save copy' }, { status: 500 });
  }
}
