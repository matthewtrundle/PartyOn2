/**
 * Draft Orders API
 * GET: List draft orders
 * POST: Create new draft order
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDraftOrder, listDraftOrders, calculateDraftOrderAmounts } from '@/lib/draft-orders';
import { markLeadStatus, upsertLead } from '@/lib/leads/leadCapture';
import { enrollLeadIfEligible } from '@/lib/leads/pipeline';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { DraftOrderStatus } from '@prisma/client';
import { prisma } from '@/lib/database/client';

const DraftOrderItemSchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  title: z.string(),
  variantTitle: z.string().optional(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  imageUrl: z.string().optional(),
});

const CreateDraftOrderSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().min(1),
  deliveryCity: z.string().min(1),
  deliveryState: z.string().default('TX'),
  deliveryZip: z.string().min(5),
  deliveryDate: z.string().transform((str) => { const d = new Date(str); d.setUTCHours(12, 0, 0, 0); return d; }),
  deliveryTime: z.string().min(1),
  deliveryNotes: z.string().optional(),
  items: z.array(DraftOrderItemSchema).min(1),
  deliveryFee: z.number().min(0).default(30),
  originalDeliveryFee: z.number().min(0).optional().nullable(),
  discountAmount: z.number().min(0).default(0),
  discountCode: z.string().optional(),
  createdBy: z.string().optional(),
  adminNotes: z.string().optional(),
  groupOrderId: z.string().optional(),
  affiliateId: z.string().optional(),
  affiliateCode: z.string().optional(),
  expiresInDays: z.number().int().positive().optional(),
});

/**
 * GET /api/v1/admin/draft-orders
 * List draft orders with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') as DraftOrderStatus | null;
    const customerEmail = searchParams.get('customerEmail') || undefined;
    const groupOrderId = searchParams.get('groupOrderId') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const orderBy = (searchParams.get('orderBy') as 'createdAt' | 'updatedAt' | 'deliveryDate') || 'createdAt';
    const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';

    const result = await listDraftOrders({
      status: status || undefined,
      customerEmail,
      groupOrderId,
      search,
      limit,
      offset,
      orderBy,
      order,
    });

    // Fetch latest email status for each draft order
    const draftOrderIds = result.draftOrders.map((d) => d.id);
    let emailStatusMap: Record<string, string> = {};

    if (draftOrderIds.length > 0) {
      const latestEmails = await prisma.$queryRaw<
        { draft_order_id: string; status: string }[]
      >`
        SELECT DISTINCT ON (draft_order_id) draft_order_id, status
        FROM email_logs
        WHERE draft_order_id = ANY(${draftOrderIds}::text[])
        ORDER BY draft_order_id, created_at DESC
      `;

      emailStatusMap = Object.fromEntries(
        latestEmails.map((e) => [e.draft_order_id, e.status])
      );
    }

    const dataWithEmailStatus = result.draftOrders.map((d) => ({
      ...d,
      emailStatus: emailStatusMap[d.id] || null,
    }));

    return NextResponse.json({
      success: true,
      data: dataWithEmailStatus,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.draftOrders.length < result.total,
      },
    });
  } catch (error) {
    console.error('[Draft Orders API] List error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list draft orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/draft-orders
 * Create a new draft order
 */
export async function POST(request: NextRequest) {
  try {
    // Defense in depth: middleware already gates /api/v1/admin/**, but this
    // route creates invoices + mirrors leads — carry its own ops-auth so a
    // future middleware-matcher change can't silently expose it.
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = CreateDraftOrderSchema.parse(body);

    // Calculate amounts from items
    const amounts = calculateDraftOrderAmounts(
      validated.items,
      validated.deliveryZip,
      validated.deliveryFee,
      validated.discountAmount
    );

    // Calculate expiration date if specified
    let expiresAt: Date | undefined;
    if (validated.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validated.expiresInDays);
    }

    const draftOrder = await createDraftOrder({
      ...validated,
      subtotal: amounts.subtotal,
      taxAmount: amounts.taxAmount,
      deliveryFee: amounts.deliveryFee,
      discountAmount: amounts.discountAmount,
      expiresAt,
    });

    // Lead Flow board: an ops invoice to a brand-new contact had no Lead, so
    // QUOTE_SENT tracking missed them entirely (2026-07-13 audit gap #7).
    // Hooked HERE, not in the draft-orders lib — the full-moon ticket path
    // calls the lib directly and must stay lead-free. Group-attached drafts
    // skip (the dashboard-host mirror owns those). Card enters NEW; the
    // existing sweepQuoteSent moves it to QUOTE_SENT once the invoice is
    // SENT/VIEWED. Never throws.
    if (!validated.groupOrderId) {
      try {
        const [cFirst, ...cRest] = validated.customerName.split(/\s+/);
        const lead = await upsertLead(
          {
            email: validated.customerEmail,
            phone: validated.customerPhone || null,
            firstName: cFirst || null,
            lastName: cRest.join(' ') || null,
          },
          { sourcePage: '/ops/orders/create', sourceWidget: 'OPS_INVOICE' },
        );
        if (lead) {
          const prevMeta = (lead.metadata as Record<string, unknown> | null) ?? {};
          // Ops acted, not the customer — only claim provenance when the
          // lead has none (null/OTHER); never clobber a real widget.
          const upgradeWidget = lead.sourceWidget === null || lead.sourceWidget === 'OTHER';
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              draftOrderId: draftOrder.id,
              ...(upgradeWidget ? { sourceWidget: 'OPS_INVOICE' } : {}),
              metadata: {
                ...prevMeta,
                opsInvoice: {
                  draftOrderId: draftOrder.id,
                  deliveryDate: validated.deliveryDate.toISOString().slice(0, 10),
                  submittedAt: new Date().toISOString(),
                },
              },
            },
          });
          if (lead.status === 'PARTIAL' || lead.status === 'ANONYMOUS') {
            await markLeadStatus(lead.id, 'SUBMITTED');
          } else {
            await enrollLeadIfEligible(lead.id);
          }
        }
      } catch (leadErr) {
        console.warn('[Draft Orders API] lead mirror failed:', leadErr);
      }
    }

    // Generate invoice URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://partyondelivery.com';
    const invoiceUrl = `${baseUrl}/invoice/${draftOrder.token}`;

    return NextResponse.json({
      success: true,
      data: {
        ...draftOrder,
        invoiceUrl,
      },
    });
  } catch (error) {
    console.error('[Draft Orders API] Create error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create draft order' },
      { status: 500 }
    );
  }
}
