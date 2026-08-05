/**
 * GET /api/cron/event-abandoned-rsvps
 *
 * Vercel cron. Runs every 15 minutes. Scans Lead rows for:
 *   - status === 'PARTIAL'
 *   - metadata.abandonedCart.nudgeAt < now()
 *   - metadata.abandonedCart.nudgeSentAt is null
 *
 * For each match:
 *   - Sends the abandoned-cart email via Resend
 *   - Stamps metadata.abandonedCart.nudgeSentAt so we don't re-send
 *
 * Returns a small JSON summary for observability.
 *
 * Auth: requires CRON_SECRET in the Authorization header (Vercel sets
 * this automatically for scheduled cron jobs).
 *
 * NO SMS. This used to also fire a GHL/CoreLinq text. The phone number comes
 * from an unauthenticated form, there is no Lead.smsConsent column, and the
 * payload carried no consent flag — so every text went to an unverified
 * number with no opt-in record (TCPA). Re-add only behind a real opt-in.
 *
 * Nothing an anonymous caller wrote is trusted at read time: the event must
 * still resolve in the registry, the title comes from that registry entry, and
 * the link is rebuilt from the slug rather than read out of the stored row.
 * That also neutralizes rows written before those checks existed.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/database/client';
import { sendEmailDetailed } from '@/lib/email/resend-client';
import { eventAbandonedCartEmail } from '@/lib/email/templates/event-abandoned-cart';
import { getDemoEvent } from '@/lib/events/demoEvents';
import { resolveSameOriginUrl } from '@/lib/followups/links';
import {
  buildOneClickUnsubscribeUrl,
  buildPreferencesUrl,
} from '@/lib/followups/suppression';
import { SITE_BASE_URL } from '@/lib/followups/types';
import { EmailType } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * How stale a pending nudge may be before we drop it instead of sending.
 * Two jobs: nobody wants "finish your order" three weeks late, and it stops a
 * backlog of never-sent rows from going out all at once after a deploy.
 */
const MAX_NUDGE_AGE_MS = 24 * 60 * 60 * 1000;

type AbandonedCartMeta = {
  eventSlug: string;
  eventTitle: string;
  itemCount: number;
  cartTotal?: number;
  nudgeAt: string;
  nudgeSentAt: string | null;
  /** Set by /abandon-nudge/cancel when the guest completed their order. */
  canceledAt?: string | null;
};

function fmtDateLine(iso: string, tz: string) {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: tz })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })}`;
  } catch {
    return iso;
  }
}

export async function GET(req: NextRequest) {
  // Fail CLOSED. This was `if (CRON_SECRET && ...)`, so an unset env var turned
  // a route that sends real mail into a public GET. Matches the other crons.
  const auth = req.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Without the secret the unsubscribe link carries an empty token and fails
  // verification — an unsubscribe link that doesn't work is its own CAN-SPAM
  // problem, so don't send at all. Same stance as the follow-up engine.
  if (!process.env.UNSUBSCRIBE_SECRET) {
    return NextResponse.json(
      { ok: false, error: 'missing env: UNSUBSCRIBE_SECRET' },
      { status: 503 },
    );
  }

  const now = Date.now();
  const candidates = await prisma.lead.findMany({
    where: {
      // No `status: 'PARTIAL'` filter. It looked like a safety guard but was
      // the opposite: the RSVP form promotes the lead to SUBMITTED, so every
      // genuine RSVPer was skipped and the only rows that ever qualified were
      // those whose sole touch was the unauthenticated POST. Real completion
      // is checked per-lead below.
      status: { not: 'CONVERTED' },
      orderId: null,
      // Resume cart exists — sanity guard so we don't email empty carts.
      NOT: { resumeCart: { equals: null as never } },
    },
    take: 200,
    orderBy: { updatedAt: 'asc' },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const lead of candidates) {
    const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
    const ac = meta.abandonedCart as AbandonedCartMeta | undefined;
    if (!ac) {
      skipped++;
      continue;
    }
    if (ac.nudgeSentAt) {
      skipped++;
      continue;
    }
    // They finished the order — /abandon-nudge/cancel stamped this.
    if (ac.canceledAt) {
      skipped++;
      continue;
    }
    const nudgeAtMs = ac.nudgeAt ? new Date(ac.nudgeAt).getTime() : NaN;
    if (!nudgeAtMs || Number.isNaN(nudgeAtMs) || nudgeAtMs > now) {
      skipped++;
      continue;
    }
    if (now - nudgeAtMs > MAX_NUDGE_AGE_MS) {
      skipped++;
      continue;
    }
    if (!lead.email) {
      skipped++;
      continue;
    }

    // Pull event details. Demo phase — just hits the in-memory registry.
    // Real version will pull from a future Event table.
    //
    // An unresolvable slug is now a skip rather than a send with "soon" / "the
    // venue" filled in. That's the read-time guard for rows written before the
    // writer validated slugs.
    const event = getDemoEvent(ac.eventSlug);
    if (!event) {
      skipped++;
      continue;
    }

    // Title and link both come from the registry entry, never from the stored
    // row — a stored `resumeUrl` (which the writer no longer even records) is
    // ignored outright. resolveSameOriginUrl is belt-and-braces on a value we
    // now build ourselves; it's the same guard the follow-up engine uses on
    // this exact kind of sink (CWE-601).
    const resumeUrl = resolveSameOriginUrl(
      `/events/${ac.eventSlug}`,
      SITE_BASE_URL,
    ).toString();

    // AbandonedCartMeta is a compile-time cast over untyped JSON, not a runtime
    // check — coerce the numerics rather than trusting it. itemCount reaches the
    // HTML body without escaping (it's typed as a number), so a string here
    // would be an injection sink.
    const rawCount = Number(ac.itemCount);
    const itemCount = Number.isFinite(rawCount) ? Math.max(1, Math.trunc(rawCount)) : 1;
    const cartTotal =
      typeof ac.cartTotal === 'number' && Number.isFinite(ac.cartTotal)
        ? ac.cartTotal
        : undefined;

    const tpl = eventAbandonedCartEmail({
      firstName: lead.firstName ?? 'there',
      eventTitle: event.title,
      eventDateLine: fmtDateLine(event.startsAt, event.timezone),
      eventVenue: event.venue,
      eventAddress: event.address,
      resumeUrl,
      unsubscribeUrl: buildPreferencesUrl(lead.email),
      itemCount,
      cartTotal,
    });

    try {
      const result = await sendEmailDetailed({
        to: lead.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        type: EmailType.WELCOME, // reuse — no enum migration needed
        metadata: {
          flow: 'event-abandoned-cart',
          eventSlug: ac.eventSlug,
          leadId: lead.id,
        },
        tags: [
          { name: 'flow', value: 'event_abandoned_cart' },
          { name: 'event_slug', value: ac.eventSlug.replace(/[^a-zA-Z0-9_-]/g, '_') },
        ],
        headers: {
          'List-Unsubscribe': `<${buildOneClickUnsubscribeUrl(lead.email)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        // This is marketing, not transactional — a prior unsubscribe, bounce,
        // or spam complaint must stop it.
        respectSuppression: true,
      });

      // Stamp suppressed rows too, otherwise the same lead is rescanned and
      // re-skipped every 15 minutes forever.
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          metadata: {
            ...meta,
            abandonedCart: { ...ac, nudgeSentAt: new Date().toISOString() },
          },
        },
      });
      if (result.suppressed) skipped++;
      else sent++;
    } catch (err) {
      console.error('[event-abandoned-cart] send failed', err);
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: candidates.length,
    sent,
    skipped,
    failed,
    at: new Date().toISOString(),
  });
}
