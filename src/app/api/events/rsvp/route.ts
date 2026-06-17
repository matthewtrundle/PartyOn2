import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';

/**
 * Validated shape of an RSVP submission from a one-off event invite page.
 * `event` is the invite slug (e.g. "dads-gone-wild") so a single table can
 * serve multiple invites.
 */
const RsvpSchema = z.object({
  event: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  adults: z.coerce.number().int().min(1).max(20),
  kids: z.coerce.number().int().min(0).max(20),
  dish: z.string().trim().max(120).optional(),
});

// Lightweight in-memory rate limit — this is a public, unauthenticated
// endpoint. KV is a no-op stub locally, so we don't rely on it here.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT_MAX) return true;
    entry.count++;
    return false;
  }
  hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  return false;
}

/**
 * POST /api/events/rsvp — persist a guest RSVP for a one-off event invite.
 * Public (no auth), with a honeypot field and basic per-IP rate limiting.
 * Returns `{ ok: true, id }` on success.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
    }

    // Honeypot — a hidden field bots tend to fill. Pretend success so we
    // don't tip them off, but persist nothing.
    if (body.website_url) {
      return NextResponse.json({ ok: true });
    }

    if (rateLimited(ip)) {
      return NextResponse.json(
        { ok: false, error: 'Too many submissions. Please try again in a minute.' },
        { status: 429 },
      );
    }

    const parsed = RsvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Please check your entries and try again.' },
        { status: 400 },
      );
    }

    const { event, name, adults, kids, dish } = parsed.data;

    const rsvp = await prisma.eventRsvp.create({
      data: {
        event,
        name,
        adults,
        kids,
        dish: dish && dish.length > 0 ? dish : null,
        totalHeads: adults + kids,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: rsvp.id });
  } catch (error) {
    console.error('[Event RSVP] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to save your RSVP. Please try again.' },
      { status: 500 },
    );
  }
}
