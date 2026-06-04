/**
 * POST /api/v1/events/abandon-nudge
 *
 * Schedules an abandoned-cart email + SMS nudge for an invitee who:
 *   1. RSVPed to an event
 *   2. Added at least one drink to their cart
 *   3. Hasn't completed checkout
 *
 * Called from the EventDrinksMenuModal whenever the customer's cart goes
 * from 0 → 1 item. The endpoint records the intent to nudge in the Lead
 * row (via metadata) so the cron at /api/cron/event-abandoned-rsvps can
 * pick it up later and fire the actual send.
 *
 * Why not just send immediately? Customers usually finish their order in
 * the same session — sending instantly would be spam. We let them sit
 * for ~30 min first.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  eventSlug: z.string().max(120),
  eventTitle: z.string().max(200),
  firstName: z.string().max(80),
  lastName: z.string().max(80).optional().nullable(),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().nullable(),
  itemCount: z.number().int().min(1),
  cartTotal: z.number().min(0).optional(),
  resumeUrl: z.string().max(500),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 400 });
  }

  // Find or upsert the Lead row. We don't fire a lead-event here — the
  // EventInvitePage already fires CONTACT_FORM events for the RSVP. This
  // endpoint just decorates the Lead with abandoned-cart metadata.
  const existing = await prisma.lead.findFirst({
    where: { email: body.email.toLowerCase() },
    orderBy: { createdAt: 'desc' },
  });

  // 30-minute soft delay before the cron picks it up.
  const nudgeAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const abandonMeta = {
    eventSlug: body.eventSlug,
    eventTitle: body.eventTitle,
    itemCount: body.itemCount,
    cartTotal: body.cartTotal,
    resumeUrl: body.resumeUrl,
    nudgeAt,
    // Reset on every update so adding more items pushes the nudge back.
    nudgeSentAt: null as string | null,
  };

  if (existing) {
    const prevMeta = (existing.metadata as Record<string, unknown> | null) ?? {};
    // Don't reschedule if we've already sent a nudge for this exact event.
    const prevAbandon = prevMeta.abandonedCart as
      | typeof abandonMeta
      | undefined;
    if (
      prevAbandon &&
      prevAbandon.eventSlug === body.eventSlug &&
      prevAbandon.nudgeSentAt
    ) {
      return NextResponse.json({ ok: true, status: 'already-nudged' });
    }
    await prisma.lead.update({
      where: { id: existing.id },
      data: {
        firstName: existing.firstName ?? body.firstName,
        lastName: existing.lastName ?? body.lastName ?? null,
        phone: existing.phone ?? body.phone ?? null,
        metadata: { ...prevMeta, abandonedCart: abandonMeta },
        resumeCart: { itemCount: body.itemCount, cartTotal: body.cartTotal },
      },
    });
    return NextResponse.json({ ok: true, status: 'scheduled', leadId: existing.id });
  }

  const created = await prisma.lead.create({
    data: {
      email: body.email.toLowerCase(),
      phone: body.phone ?? null,
      firstName: body.firstName,
      lastName: body.lastName ?? null,
      status: 'PARTIAL',
      sourcePage: `/events/${body.eventSlug}`,
      sourceWidget: 'A_LA_CARTE',
      lastPage: `/events/${body.eventSlug}`,
      metadata: { abandonedCart: abandonMeta },
      resumeCart: { itemCount: body.itemCount, cartTotal: body.cartTotal },
    },
  });
  return NextResponse.json({ ok: true, status: 'scheduled', leadId: created.id });
}
