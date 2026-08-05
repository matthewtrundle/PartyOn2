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
 *
 * TRUST BOUNDARY: this route is unauthenticated, so nothing it stores may
 * reach an outbound message verbatim. It used to accept `eventTitle` and
 * `resumeUrl` from the body, which meant an anonymous caller could pick both
 * the copy AND the link in a domain-authenticated email — phishing on our own
 * sending reputation (CWE-601). Both are now read off the event registry using
 * the caller's `eventSlug`, which must resolve to one of ours. The only
 * caller-supplied strings that survive are the names, and those go through
 * `sanitizeName`.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { getDemoEvent } from '@/lib/events/demoEvents';
import { sanitizeName, upsertLead } from '@/lib/leads/leadCapture';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { clientIpFrom } from '@/lib/group-orders-v2/client-ip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// No `eventTitle` / `resumeUrl` here on purpose — see TRUST BOUNDARY above.
// Zod strips unknown keys, so a still-deployed older client that sends them
// is silently ignored rather than 400'd.
const schema = z.object({
  eventSlug: z.string().max(120),
  firstName: z.string().max(80),
  lastName: z.string().max(80).optional().nullable(),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().nullable(),
  itemCount: z.number().int().min(1),
  cartTotal: z.number().min(0).optional(),
});

/**
 * The one and only success body. Every branch returns this, byte for byte.
 *
 * Telling the caller which branch ran ('scheduled' vs 'already-nudged') would
 * reveal whether a guessed email already has a nudge for a given party — the
 * slug is public, it's in the page URL. The old body also echoed the internal
 * leadId. Nothing reads any of it: the modal fires this and drops the
 * response. Same reasoning as the /cancel sibling (CWE-204).
 */
const OK = { ok: true } as const;

export async function POST(req: NextRequest) {
  // Unauthenticated and now several DB round trips per call (the shared writer
  // runs a fragment-merge scan), so throttle before parsing the body. Uses the
  // audited resolver, which prefers platform-set headers over the forgeable
  // x-forwarded-for.
  if (!(await checkRateLimit('abandon-nudge', clientIpFrom(req), 15, 60))) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again shortly.' },
      { status: 429 },
    );
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 400 });
  }

  // Sanitize the public-capture names before any Lead write. This route writes
  // firstName/lastName directly (not via upsertLead), and the abandoned-cart
  // cron drops the stored firstName straight into an outbound SMS — so an
  // unsanitized name here is a text-injection vector (security review, #297).
  const firstName = sanitizeName(body.firstName);
  const lastName = sanitizeName(body.lastName);

  // The slug is the one thing the caller names, and it has to be one of ours.
  // Rejecting here (rather than letting the cron fall back to "soon"/"the
  // venue") means a made-up event can never schedule mail at all.
  const event = getDemoEvent(body.eventSlug);
  if (!event) {
    return NextResponse.json({ ok: false, error: 'Unknown event' }, { status: 400 });
  }

  // Find or create the Lead through the shared writer rather than a local
  // findFirst + create. That buys email normalization (this route used to
  // match on a raw lowercased string, so a lead stored via any other path
  // could be missed and duplicated), phone matching, and the keystroke
  // fragment merge. We don't fire a lead-event here — the EventInvitePage
  // already fires CONTACT_FORM events for the RSVP. This endpoint just
  // decorates the Lead with abandoned-cart metadata.
  const eventPage = `/events/${body.eventSlug}`;
  const lead = await upsertLead(
    {
      email: body.email,
      phone: body.phone ?? null,
      firstName,
      lastName,
    },
    { sourcePage: eventPage, sourceWidget: 'A_LA_CARTE' },
  );
  if (!lead) {
    return NextResponse.json(
      { ok: false, error: 'Could not resolve a lead for this address' },
      { status: 400 },
    );
  }

  // 30-minute soft delay before the cron picks it up.
  const nudgeAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // Title comes off the registry, not the body. No resumeUrl is stored at all —
  // the cron rebuilds the link from the slug, so there is nothing here for an
  // attacker to point somewhere else.
  const abandonMeta = {
    eventSlug: body.eventSlug,
    eventTitle: event.title,
    itemCount: body.itemCount,
    cartTotal: body.cartTotal,
    nudgeAt,
    // Reset on every update so adding more items pushes the nudge back.
    nudgeSentAt: null as string | null,
  };

  const prevMeta = (lead.metadata as Record<string, unknown> | null) ?? {};
  // Don't reschedule if we've already sent a nudge for this exact event.
  const prevAbandon = prevMeta.abandonedCart as typeof abandonMeta | undefined;
  if (
    prevAbandon &&
    prevAbandon.eventSlug === body.eventSlug &&
    prevAbandon.nudgeSentAt
  ) {
    return NextResponse.json(OK);
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      metadata: { ...prevMeta, abandonedCart: abandonMeta },
      resumeCart: { itemCount: body.itemCount, cartTotal: body.cartTotal },
    },
  });
  return NextResponse.json(OK);
}
