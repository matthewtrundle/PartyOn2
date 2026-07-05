/**
 * Public Landing Page Quote / Invoice Endpoint
 *
 * Called by the Package Builder modal at the end of the wizard. Creates a
 * real Draft Order in Postgres (so the customer gets the same editable
 * invoice experience as admin-created quotes) and:
 *
 *   - mode=quote     → sends the fancy invoice email immediately, returns
 *                      `{ invoiceUrl, token, sent: true }`
 *   - mode=pay-now   → does NOT send email; returns `{ invoiceUrl, token }`
 *                      so the modal can redirect the customer straight to
 *                      the invoice page to enter delivery + pay
 *
 * Items submitted by handle (the Postgres product handle, which is stored
 * on each BuilderProduct via .sku). We look up the actual product +
 * default variant + current price server-side — never trust prices from
 * the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import { createDraftOrder, calculateDraftOrderAmounts } from '@/lib/draft-orders';
import { generateInvoiceEmail, generateInvoiceSubject } from '@/lib/email/templates/invoice';
import { getInvoiceTextOverrides } from '@/lib/email/template-content';
import { sendEmail } from '@/lib/email/resend-client';
import { attributionSchema, attributionNoteLine } from '@/lib/leads/attribution-schema';
import { cancelJobsForEmail, enqueueJourney } from '@/lib/followups/enqueue';
import { EmailType, DraftOrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ItemSchema = z.object({
  handle: z.string().min(1),
  qty: z.number().int().positive(),
  /** Set true when this line was added via the pre-checkout upsell overlay. */
  viaUpsell: z.boolean().optional(),
});

const BodySchema = z.object({
  mode: z.enum(['quote', 'pay-now']),
  occasion: z.string().min(1), // bachelor | bachelorette | corporate | wedding (informational only)
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional().default(''),
  groupSize: z.number().int().positive(),
  deliveryDate: z.string().min(1), // ISO yyyy-mm-dd
  deliveryTime: z.string().optional().default('Afternoon (12pm–4pm)'),
  deliveryAddress: z.string().optional().default(''),
  deliveryCity: z.string().optional().default('Austin'),
  deliveryZip: z.string().optional().default(''),
  deliveryNotes: z.string().optional(),
  items: z.array(ItemSchema).min(1),
  /** Upsell A/B variant shown to this customer. Persisted to the draft order. */
  upsellVariantId: z.string().optional(),
  /** First-touch UTM + ad click ids captured client-side. DraftOrder has no
      metadata column, so this lands as a line in adminNotes (ops-only). */
  attribution: attributionSchema,
});

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'invalid_body', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const body = parsed.data;

    // Pay-now mode requires complete delivery details (Stripe will need a
    // shipping address). Quote mode is allowed without — customer can fill
    // them in on the editable invoice page.
    if (body.mode === 'pay-now') {
      if (!body.deliveryAddress || !body.deliveryZip) {
        return NextResponse.json(
          { success: false, error: 'missing_delivery_address' },
          { status: 400 },
        );
      }
    }

    // Look up every product by handle in a single round trip. Include the
    // first (default) variant so we can use real productId + variantId +
    // current retail price.
    const handles = [...new Set(body.items.map((i) => i.handle))];
    const products = await prisma.product.findMany({
      where: { handle: { in: handles } },
      include: {
        variants: { orderBy: { createdAt: 'asc' }, take: 1 },
        images: { take: 1, orderBy: { position: 'asc' } },
      },
    });
    const byHandle = Object.fromEntries(products.map((p) => [p.handle, p]));

    const items = body.items
      .map((it) => {
        const p = byHandle[it.handle];
        if (!p || !p.variants[0]) return null;
        return {
          productId: p.id,
          variantId: p.variants[0].id,
          title: p.title,
          variantTitle: p.variants[0].title,
          quantity: it.qty,
          price: Number(p.variants[0].price),
          imageUrl: p.images[0]?.url,
          // Persist upsell attribution into the items JSON so admin/reporting
          // can compute upsell revenue per draft order.
          viaUpsell: it.viaUpsell === true,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'no_resolvable_items' },
        { status: 400 },
      );
    }

    // Normalize the delivery date — accept either "yyyy-mm-dd" or ISO.
    const deliveryDate = new Date(body.deliveryDate);
    deliveryDate.setUTCHours(12, 0, 0, 0);

    // Compute subtotal + tax + delivery fee using the same helper the
    // admin invoice flow uses, so prices match exactly.
    const effectiveZip = body.deliveryZip || '78701';
    const amounts = calculateDraftOrderAmounts(items, effectiveZip, 30, 0);

    const draftOrder = await createDraftOrder({
      customerEmail: body.customerEmail,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      deliveryAddress: body.deliveryAddress || 'To be confirmed',
      deliveryCity: body.deliveryCity || 'Austin',
      deliveryState: 'TX',
      deliveryZip: effectiveZip,
      deliveryDate,
      deliveryTime: body.deliveryTime,
      deliveryNotes: body.deliveryNotes,
      items,
      subtotal: amounts.subtotal,
      taxAmount: amounts.taxAmount,
      deliveryFee: amounts.deliveryFee,
      discountAmount: amounts.discountAmount,
      createdBy: `landing:${body.occasion}`,
      adminNotes: [
        `Auto-generated from /austin-${body.occasion}-* landing page. Group size: ${body.groupSize}.`,
        attributionNoteLine(body.attribution),
      ]
        .filter(Boolean)
        .join('\n'),
    });

    // Tag the draft order with the upsell A/B variant the customer saw — the
    // service doesn't accept this field directly, so we patch it post-create.
    if (body.upsellVariantId) {
      try {
        await prisma.draftOrder.update({
          where: { id: draftOrder.id },
          data: { upsellVariantId: body.upsellVariantId },
        });
      } catch (err) {
        console.error('[landing/quote] failed to set upsellVariantId:', err);
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://partyondelivery.com';
    const invoiceUrl = `${baseUrl}/invoice/${draftOrder.token}`;

    // Quote mode: send the fancy invoice email immediately.
    let emailSent = false;
    if (body.mode === 'quote') {
      try {
        const savedOverrides = await getInvoiceTextOverrides();
        const html = generateInvoiceEmail({
          customerName: draftOrder.customerName,
          deliveryDate: draftOrder.deliveryDate,
          deliveryTime: draftOrder.deliveryTime,
          deliveryAddress: draftOrder.deliveryAddress,
          deliveryCity: draftOrder.deliveryCity,
          deliveryState: draftOrder.deliveryState,
          deliveryZip: draftOrder.deliveryZip,
          items: draftOrder.items,
          subtotal: draftOrder.subtotal,
          taxAmount: draftOrder.taxAmount,
          deliveryFee: draftOrder.deliveryFee,
          discountAmount: draftOrder.discountAmount,
          discountCode: draftOrder.discountCode,
          total: draftOrder.total,
          invoiceUrl,
        }, savedOverrides);
        const subject = generateInvoiceSubject(Number(draftOrder.total));

        await sendEmail({
          to: draftOrder.customerEmail,
          subject,
          html,
          type: EmailType.INVOICE,
          draftOrderId: draftOrder.id,
        });

        // Mark as sent
        await prisma.draftOrder.update({
          where: { id: draftOrder.id },
          data: { status: DraftOrderStatus.SENT, sentAt: new Date() },
        });
        emailSent = true;

        // Fast-path follow-up enqueue (the engine sweep would catch this
        // draft anyway — this just gets the +24h clock started with a richer
        // payload). Flag-gated at send time; deduped on draft id.
        try {
          await enqueueJourney('unpaid-invoice', {
            email: draftOrder.customerEmail,
            entityId: draftOrder.id,
            draftOrderId: draftOrder.id,
            phone: body.customerPhone || null,
            payload: {
              firstName: (draftOrder.customerName ?? '').trim().split(/\s+/)[0] || null,
              deliveryDate: draftOrder.deliveryDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                timeZone: 'America/Chicago',
              }),
              invoicePath: `/invoice/${draftOrder.token}`,
            },
          });
        } catch (err) {
          console.warn('[landing/quote] unpaid-invoice enqueue failed:', err);
        }
      } catch (err) {
        console.error('[landing/quote] Failed to send invoice email:', err);
        // Don't fail the request — the customer still got an invoiceUrl
      }
    }

    // Either mode: this email now has a real draft order, so any pending
    // abandoned-quote nudge is moot — the invoice conversation owns the thread.
    try {
      await cancelJobsForEmail(body.customerEmail, 'draft-created', 'abandoned-quote');
    } catch (err) {
      console.warn('[landing/quote] abandoned-quote cancel failed:', err);
    }

    return NextResponse.json({
      success: true,
      mode: body.mode,
      token: draftOrder.token,
      invoiceUrl,
      sent: emailSent,
      total: Number(draftOrder.total),
    });
  } catch (err) {
    console.error('[landing/quote] error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
