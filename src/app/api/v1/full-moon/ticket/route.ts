/**
 * POST /api/v1/full-moon/ticket
 *
 * Sells a $59 Lake Travis Full Moon Party ticket (×quantity) via Stripe.
 * Creates a zeroed DraftOrder (no delivery fee, no tax) for the DRAFT ticket
 * product, then a Stripe Checkout Session that rides the existing
 * `draft_order_invoice` webhook (which creates the Order + confirmation email
 * + GHL). `eventTicket=1` metadata tells the webhook to skip the delivery task.
 *
 * Gated by FULL_MOON_TICKETS_LIVE=1 — nothing is purchasable until an operator
 * flips it on (Stripe is on live keys). Public endpoint: rate-limited + a
 * honeypot to blunt card-testing/abuse, and an idempotency key to prevent
 * double charges on retries.
 */
import { NextRequest, NextResponse } from 'next/server';
import { DraftOrderStatus } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { stripe } from '@/lib/stripe/client';
import { createDraftOrder, updateDraftOrderStatus } from '@/lib/draft-orders';
import type { DraftOrderItem } from '@/lib/draft-orders/types';
import { checkRateLimit } from '@/lib/security/rate-limit';
import {
  computeTicketAmounts,
  ticketIdempotencyKey,
  TicketPurchaseSchema,
  EVENT_TICKET_METADATA_FLAG,
} from '@/lib/full-moon/ticket';
import { EVENT, TICKET_PRODUCT_HANDLE } from '@/components/full-moon/event';

export const dynamic = 'force-dynamic';

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Not on sale until an operator sets the flag on the deployment (fails closed).
  if (process.env.FULL_MOON_TICKETS_LIVE !== '1') {
    return NextResponse.json({ success: false, error: 'Tickets are not on sale yet.' }, { status: 403 });
  }

  // Throttle per IP — this creates DraftOrders + live Stripe sessions.
  const allowed = await checkRateLimit('full-moon-ticket', clientIp(request), 8, 60);
  if (!allowed) {
    return NextResponse.json({ success: false, error: 'Too many attempts — give it a minute and try again.' }, { status: 429 });
  }

  const parsed = TicketPurchaseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Please check your details and try again.' }, { status: 400 });
  }
  const body = parsed.data;

  // Honeypot filled → silently reject (bot).
  if (body.hp_ticket_note) {
    return NextResponse.json({ success: false, error: 'Please check your details and try again.' }, { status: 400 });
  }

  try {
    // Resolve the DRAFT ticket product by handle (server-authoritative price).
    const product = await prisma.product.findUnique({
      where: { handle: TICKET_PRODUCT_HANDLE },
      include: { variants: { orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    const variant = product?.variants[0];
    if (!product || !variant) {
      return NextResponse.json({ success: false, error: 'Tickets are unavailable right now.' }, { status: 503 });
    }

    const { quantity, subtotal, unitAmountCents } = computeTicketAmounts(Number(variant.price), body.quantity);

    const item: DraftOrderItem = {
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      quantity,
      price: Number(variant.price),
    };

    // Zeroed draft — no delivery fee, no tax. The delivery fields double as the
    // event location/time so the confirmation email reads sensibly.
    const draft = await createDraftOrder({
      customerEmail: body.email,
      customerName: body.name,
      customerPhone: body.phone,
      deliveryAddress: 'Lake Travis marina — exact dock + pin sent by text',
      deliveryCity: 'Austin',
      deliveryState: 'TX',
      deliveryZip: '78734',
      deliveryDate: new Date(`${EVENT.isoDate}T20:00:00`),
      deliveryTime: EVENT.castOff,
      items: [item],
      subtotal,
      taxAmount: 0,
      deliveryFee: 0,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://partyondelivery.com';

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card', 'link'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Lake Travis Full Moon Party — Ticket',
                description: `${EVENT.dateLabel} · sunset cruise + moonrise dance party on Lake Travis · BYOB via Party On Delivery`,
              },
              unit_amount: unitAmountCents,
            },
            quantity,
          },
        ],
        customer_email: body.email,
        phone_number_collection: { enabled: true },
        billing_address_collection: 'required',
        metadata: {
          type: 'draft_order_invoice',
          draftOrderId: draft.id,
          draftOrderToken: draft.token,
          [EVENT_TICKET_METADATA_FLAG]: '1',
          ageConfirmed: '1',
          ...(body.attribution?.landingPage ? { landingPage: body.attribution.landingPage } : {}),
          ...(body.attribution?.utmSource ? { utmSource: body.attribution.utmSource } : {}),
          ...(body.attribution?.utmCampaign ? { utmCampaign: body.attribution.utmCampaign } : {}),
        },
        success_url: `${baseUrl}/full-moon?ticket=success`,
        cancel_url: `${baseUrl}/full-moon?ticket=cancelled`,
      },
      // Same email + quantity within ~5 min resolves to one session → one charge.
      { idempotencyKey: ticketIdempotencyKey(body.email, quantity, Date.now()) },
    );

    await updateDraftOrderStatus(draft.id, draft.status as DraftOrderStatus, {
      stripeCheckoutSessionId: session.id,
    });

    return NextResponse.json({ success: true, checkoutUrl: session.url });
  } catch (error) {
    // Never log PII (name/email/phone); just the failure.
    console.error('[FullMoon Ticket] checkout creation failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Something went wrong creating your checkout.' }, { status: 500 });
  }
}
