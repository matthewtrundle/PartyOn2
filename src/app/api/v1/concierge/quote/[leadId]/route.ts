/**
 * GET  /api/v1/concierge/quote/[leadId]  → returns current quote
 * PATCH /api/v1/concierge/quote/[leadId] → replaces the quote body
 *
 * Persists to Lead.metadata.quote so no schema change is required.
 * Refuses writes once the deposit has been paid (status=deposit-paid) —
 * once the customer commits, changes go through the concierge, not
 * self-serve.
 *
 * CORS-open so the same quote page could later ship on
 * premierconcierge.co and PATCH cross-domain.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/client';
import type { ActivityKey, Quote, QuoteItem } from '@/lib/concierge/quote';
import { ACTIVITY_CATALOG } from '@/lib/concierge/quote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const quoteItemSchema = z.object({
  activityKey: z.string().min(1),
  enabled: z.boolean(),
  headcount: z.number().int().min(1).max(500),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledTime: z.string().max(20),
  notes: z.string().max(2000),
});

const patchSchema = z.object({
  quote: z.object({
    variant: z.enum(['bachelor', 'bachelorette']),
    createdAt: z.string(),
    updatedAt: z.string(),
    headcount: z.number().int().min(1).max(500),
    arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    items: z.array(quoteItemSchema).min(1).max(30),
    status: z.enum(['draft', 'accepted', 'deposit-paid']),
    stripeCheckoutSessionId: z.string().optional(),
    depositPaidAt: z.string().optional(),
  }),
});

function isValidLeadId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { leadId } = await params;
  if (!isValidLeadId(leadId)) {
    return NextResponse.json(
      { ok: false, error: 'not_found' },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { metadata: true },
  });
  if (!lead) {
    return NextResponse.json(
      { ok: false, error: 'not_found' },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
  const quote = meta.quote as Quote | undefined;
  if (!quote) {
    return NextResponse.json(
      { ok: false, error: 'no_quote' },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  return NextResponse.json({ ok: true, quote }, { headers: CORS_HEADERS });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { leadId } = await params;
  if (!isValidLeadId(leadId)) {
    return NextResponse.json(
      { ok: false, error: 'not_found' },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'invalid_body', detail: String(err) },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { metadata: true },
  });
  if (!lead) {
    return NextResponse.json(
      { ok: false, error: 'not_found' },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
  const existing = meta.quote as Quote | undefined;

  // Freeze once the deposit is paid — changes go through the concierge
  // from that point on.
  if (existing?.status === 'deposit-paid') {
    return NextResponse.json(
      { ok: false, error: 'locked_after_deposit' },
      { status: 409, headers: CORS_HEADERS },
    );
  }

  // Drop any items with unknown activity keys — the client can't
  // invent activities the catalog doesn't offer. Narrows the type too.
  const validKeys = new Set(Object.keys(ACTIVITY_CATALOG));
  const cleanedItems: QuoteItem[] = body.quote.items
    .filter((it) => validKeys.has(it.activityKey))
    .map((it) => ({
      ...it,
      activityKey: it.activityKey as ActivityKey,
    }));

  // Preserve the server-side fields (Stripe session, deposit-paid ts,
  // status if it was upgraded) so the client can't roll them back.
  const nextQuote: Quote = {
    ...body.quote,
    items: cleanedItems,
    status: existing?.status ?? body.quote.status,
    stripeCheckoutSessionId:
      existing?.stripeCheckoutSessionId ?? body.quote.stripeCheckoutSessionId,
    depositPaidAt: existing?.depositPaidAt ?? body.quote.depositPaidAt,
    updatedAt: new Date().toISOString(),
  };

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      metadata: {
        ...meta,
        quote: nextQuote,
      } as never,
    },
  });

  return NextResponse.json({ ok: true, quote: nextQuote }, { headers: CORS_HEADERS });
}
