/**
 * POST /api/v1/events/abandon-nudge/cancel
 *
 * Cancels a scheduled abandoned-cart nudge because the guest actually
 * finished their drink order.
 *
 * Why this exists: the drinks modal calls `clearCart()` on submit, but that
 * only touches localStorage — the server never hears about it, so the nudge
 * scheduled 30 minutes earlier still fires and tells someone who already
 * ordered to "finish your order". This is the completion signal.
 *
 * Unauthenticated, like its sibling, and that's fine here: the only thing this
 * endpoint can do is STOP mail. Worst case an attacker suppresses a nudge they
 * guessed the address for. It's still throttled, because it hits the DB.
 *
 * Every well-formed request gets a byte-identical `{ ok: true }` — not just the
 * same status code. Reporting which branch ran ('canceled' vs 'no-op') would
 * tell an attacker who guessed an email and a slug (slugs are public, they're
 * in the URL) whether that person has an unfinished drink order for that
 * party. Nothing reads the body — the modal fires this and drops the response
 * — so there is no cost to saying nothing. (CWE-204. Malformed bodies still
 * 400 and throttled callers still 429; neither depends on the address.)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { findLead } from '@/lib/leads/leadCapture';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { clientIpFrom } from '@/lib/group-orders-v2/client-ip';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  eventSlug: z.string().max(120),
  email: z.string().email().max(200),
});

/** The one and only success body. Every branch returns this, byte for byte. */
const OK = { ok: true } as const;

export async function POST(req: NextRequest) {
  if (!(await checkRateLimit('abandon-nudge-cancel', clientIpFrom(req), 15, 60))) {
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

  // findLead, not upsertLead — a cancel must never bring a Lead into existence.
  const lead = await findLead({ email: body.email });
  if (!lead) return NextResponse.json(OK);

  const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
  const abandon = meta.abandonedCart as
    | { eventSlug?: string; canceledAt?: string | null }
    | undefined;
  // Only clear the nudge for the event they just ordered for — a guest can be
  // invited to two parties, and finishing one shouldn't silence the other.
  if (!abandon || abandon.eventSlug !== body.eventSlug || abandon.canceledAt) {
    return NextResponse.json(OK);
  }

  // Stamp rather than delete. Dropping the key would also drop this lead's
  // "Event RSVP Cart" label on the leads board (source-taxonomy keys off the
  // presence of metadata.abandonedCart), and we'd lose the record that they
  // ever built a cart. The cron skips anything carrying canceledAt.
  //
  // Deliberately NOT reusing nudgeSentAt as the flag — it would say we sent a
  // nudge we never sent, and that field is what tells us the send happened.
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      metadata: {
        ...meta,
        abandonedCart: { ...abandon, canceledAt: new Date().toISOString() },
      } as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(OK);
}
