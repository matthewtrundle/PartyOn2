/**
 * POST /api/v1/concierge/quote/[leadId]/checkout
 *
 * Creates a Stripe Checkout session for the 25% deposit and returns
 * the redirect URL. The success page (/concierge-quote/[leadId]/success)
 * verifies the session was paid and marks the quote as
 * status='deposit-paid' server-side, so we don't trust query params
 * from the client to unlock anything.
 *
 * MVP: no webhook wiring yet. If Stripe's server-side confirmation
 * matters (chargeback, dispute), we'd add a webhook handler in
 * src/app/api/webhooks/stripe with a `concierge-deposit` event
 * discriminator. Placeholder pricing means real money isn't moving
 * today anyway.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { prisma } from '@/lib/database/client';
import { computeQuoteTotals, type Quote } from '@/lib/concierge/quote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidLeadId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { leadId } = await params;
  if (!isValidLeadId(leadId)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      metadata: true,
    },
  });
  if (!lead) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
  const quote = meta.quote as Quote | undefined;
  if (!quote) {
    return NextResponse.json({ ok: false, error: 'no_quote' }, { status: 404 });
  }
  if (quote.status === 'deposit-paid') {
    return NextResponse.json(
      { ok: false, error: 'already_paid' },
      { status: 409 },
    );
  }

  const totals = computeQuoteTotals(quote);
  if (totals.depositAmount < 1) {
    return NextResponse.json(
      { ok: false, error: 'zero_deposit', detail: 'Enable at least one activity.' },
      { status: 400 },
    );
  }

  const partyLabel = quote.variant === 'bachelorette' ? 'Bachelorette' : 'Bachelor';
  const displayName =
    [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Concierge lead';

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://partyondelivery.com';
  const successUrl = `${origin}/concierge-quote/${leadId}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/concierge-quote/${leadId}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: lead.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(totals.depositAmount * 100),
            product_data: {
              name: `Premier Concierge · Austin ${partyLabel} Weekend — 25% Deposit`,
              description: `${quote.headcount} guests · ${quote.arrivalDate} → ${quote.departureDate} · booked by ${displayName}`,
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        source: 'concierge-quote-deposit',
        leadId,
        variant: quote.variant,
        depositAmount: String(totals.depositAmount),
        subtotal: String(totals.subtotal),
        remaining: String(totals.remaining),
      },
      payment_intent_data: {
        metadata: {
          source: 'concierge-quote-deposit',
          leadId,
        },
      },
    });

    // Save the session ID onto the quote so the success page can
    // verify against Stripe when the customer returns.
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        metadata: {
          ...meta,
          quote: {
            ...quote,
            stripeCheckoutSessionId: session.id,
            updatedAt: new Date().toISOString(),
          },
        } as never,
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error('[concierge/quote/checkout] Stripe failed', err);
    return NextResponse.json(
      { ok: false, error: 'stripe_error' },
      { status: 500 },
    );
  }
}
