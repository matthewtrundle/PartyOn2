/**
 * Send Draft Order Invoice API
 * POST: Send invoice email to customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { getDraftOrderById, updateDraftOrderStatus } from '@/lib/draft-orders';
import { generateInvoiceEmail, generateInvoiceSubject, InvoiceTextOverrides } from '@/lib/email/templates/invoice';
import { getInvoiceTextOverrides } from '@/lib/email/template-content';
import { sendEmail } from '@/lib/email/resend-client';
import { EmailType } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/admin/draft-orders/[id]/send
 * Send invoice email to customer
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    // Parse optional body params for customization
    let bodyParams: {
      cc?: string[];
      subject?: string;
      textOverrides?: InvoiceTextOverrides;
      personalNote?: string;
    } = {};
    try {
      const body = await request.json();
      bodyParams = body || {};
    } catch {
      // No body or invalid JSON — use defaults
    }

    // Get draft order
    const draftOrder = await getDraftOrderById(id);
    if (!draftOrder) {
      return NextResponse.json(
        { success: false, error: 'Draft order not found' },
        { status: 404 }
      );
    }

    // Check if can be sent
    if (['PAID', 'CONVERTED', 'CANCELLED', 'EXPIRED'].includes(draftOrder.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot send invoice for a ${draftOrder.status.toLowerCase()} draft order` },
        { status: 400 }
      );
    }

    // Generate invoice URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://partyondelivery.com';
    const invoiceUrl = `${baseUrl}/invoice/${draftOrder.token}`;

    // Load saved text overrides, then layer on any per-send overrides
    const savedOverrides = await getInvoiceTextOverrides();
    const textOverrides = { ...savedOverrides, ...bodyParams.textOverrides };

    // Generate email from template
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
      personalNote: bodyParams.personalNote,
    }, textOverrides);

    const emailSubject = bodyParams.subject || generateInvoiceSubject(Number(draftOrder.total));

    // Send email via centralized sendEmail (logs to EmailLog automatically)
    const resendId = await sendEmail({
      to: draftOrder.customerEmail,
      cc: bodyParams.cc,
      subject: emailSubject,
      html,
      type: EmailType.INVOICE,
      draftOrderId: id,
    });

    if (!resendId) {
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

    // Update draft order status to SENT
    await updateDraftOrderStatus(id, 'SENT', { sentAt: new Date() });

    return NextResponse.json({
      success: true,
      message: 'Invoice sent successfully',
      data: {
        emailId: resendId,
        invoiceUrl,
        sentTo: draftOrder.customerEmail,
      },
    });
  } catch (error) {
    console.error('[Draft Order Send] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send invoice' },
      { status: 500 }
    );
  }
}
