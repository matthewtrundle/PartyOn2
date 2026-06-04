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
 *   - Fires the GHL SMS webhook (if configured) for a text nudge
 *   - Stamps metadata.abandonedCart.nudgeSentAt so we don't re-send
 *
 * Returns a small JSON summary for observability.
 *
 * Auth: requires CRON_SECRET in the Authorization header (Vercel sets
 * this automatically for scheduled cron jobs).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/database/client';
import { sendEmail } from '@/lib/email/resend-client';
import { eventAbandonedCartEmail } from '@/lib/email/templates/event-abandoned-cart';
import { getDemoEvent } from '@/lib/events/demoEvents';
import { EmailType } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GHL_WEBHOOK_URL = process.env.GHL_DASHBOARD_WEBHOOK_URL;
const CRON_SECRET = process.env.CRON_SECRET;

type AbandonedCartMeta = {
  eventSlug: string;
  eventTitle: string;
  itemCount: number;
  cartTotal?: number;
  resumeUrl: string;
  nudgeAt: string;
  nudgeSentAt: string | null;
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
  // Auth — accept either Vercel-cron auth or our own CRON_SECRET header.
  const auth = req.headers.get('authorization');
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const candidates = await prisma.lead.findMany({
    where: {
      status: 'PARTIAL',
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
    if (!ac.nudgeAt || new Date(ac.nudgeAt).getTime() > now) {
      skipped++;
      continue;
    }
    if (!lead.email) {
      skipped++;
      continue;
    }

    // Pull event details. Demo phase — just hits the in-memory registry.
    // Real version will pull from a future Event table.
    const event = getDemoEvent(ac.eventSlug);
    const eventDateLine = event
      ? fmtDateLine(event.startsAt, event.timezone)
      : 'soon';
    const venue = event?.venue ?? 'the venue';
    const address = event?.address ?? '';
    const resumeUrl = ac.resumeUrl.startsWith('http')
      ? ac.resumeUrl
      : `https://partyondelivery.com${ac.resumeUrl}`;

    const tpl = eventAbandonedCartEmail({
      firstName: lead.firstName ?? 'there',
      eventTitle: ac.eventTitle,
      eventDateLine,
      eventVenue: venue,
      eventAddress: address,
      resumeUrl,
      itemCount: ac.itemCount,
      cartTotal: ac.cartTotal,
    });

    try {
      await sendEmail({
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
      });

      // Fire SMS via GHL if we have the webhook + a phone number.
      if (GHL_WEBHOOK_URL && lead.phone) {
        try {
          await fetch(GHL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              event: 'event.abandoned_cart',
              first_name: lead.firstName ?? '',
              last_name: lead.lastName ?? '',
              email: lead.email,
              phone: lead.phone,
              sms_message: `Hey ${lead.firstName ?? 'there'} — your drink order for ${ac.eventTitle} isn't locked in yet. Finish here: ${resumeUrl}`,
              event_slug: ac.eventSlug,
              event_title: ac.eventTitle,
              resume_url: resumeUrl,
            }),
          });
        } catch (err) {
          console.warn('[event-abandoned-cart] GHL SMS failed', err);
        }
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          metadata: {
            ...meta,
            abandonedCart: { ...ac, nudgeSentAt: new Date().toISOString() },
          },
        },
      });
      sent++;
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
