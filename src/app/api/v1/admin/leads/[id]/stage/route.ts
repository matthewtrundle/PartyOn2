/**
 * PATCH /api/v1/admin/leads/[id]/stage — move a card on the Lead Flow board.
 *
 * Body: { stage, sortOrder?, lostReason? }. All moves route through
 * transitionStage (single writer: audit LeadEvent, side-effect stamps,
 * score recompute). Tray promotions (stage was NULL) are allowed for any
 * lead with contact info.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { PIPELINE_STAGES } from '@/lib/leads/pipeline-types';
import { transitionStage } from '@/lib/leads/pipeline';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({
  stage: z.enum(PIPELINE_STAGES),
  sortOrder: z.number().finite().optional(),
  lostReason: z.string().max(200).nullable().optional(),
  // Only the two human-initiated origins are accepted over the wire. The
  // system values ('auto' | 'order' | 'enroll' | 'reopen' | 'reply' | 'touch')
  // are deliberately excluded so a client can never forge an audit record that
  // claims a sweep or a payment made the move.
  via: z.enum(['drag', 'queue']).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_body' }, { status: 400 });
  }

  const result = await transitionStage(id, body.stage, {
    via: body.via ?? 'drag',
    sortOrder: body.sortOrder,
    lostReason: body.lostReason ?? undefined,
  });

  if (!result.ok) {
    const status = result.reason === 'lead-not-found' ? 404 : 400;
    return NextResponse.json({ success: false, error: result.reason }, { status });
  }
  return NextResponse.json({
    success: true,
    data: { moved: result.moved, reason: result.reason ?? null, lead: result.lead ?? null },
  });
}
