/**
 * Send Amendment Invoice API
 * POST /api/v1/admin/orders/[id]/send-amendment
 * Sends the amendment invoice email and updates amendment resolution
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { getDraftOrderById, updateDraftOrderStatus } from '@/lib/draft-orders';
import { generateInvoiceEmail, generateInvoiceSubject } from '@/lib/email/templates/invoice';
import { getInvoiceTextOverrides } from '@/lib/email/template-content';
import { sendEmail } from '@/lib/email/resend-client';
import { EmailType } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const { amendmentId } = body as { amendmentId: string };

    if (!amendmentId) {
      return NextResponse.json(
        { success: false, error: 'amendmentId is required' },
        { status: 400 }
      );
    }

    // Get the amendment
    const amendment = await prisma.orderAmendment.findUnique({
      where: { id: amendmentId },
    });

    if (!amendment || amendment.orderId !== orderId) {
      return NextResponse.json(
        { success: false, error: 'Amendment not found' },
        { status: 404 }
      );
    }

    if (!amendment.draftOrderId) {
      return NextResponse.json(
        { success: false, error: 'No invoice associated with this amendment' },
        { status: 400 }
      );
    }

    // Get the draft order
    const draftOrder = await getDraftOrderById(amendment.draftOrderId);
    if (!draftOrder) {
      return NextResponse.json(
        { success: false, error: 'Draft order not found' },
        { status: 404 }
      );
    }

    if (['PAID', 'CONVERTED', 'CANCELLED', 'EXPIRED'].includes(draftOrder.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot send invoice for a ${draftOrder.status.toLowerCase()} draft order` },
        { status: 400 }
      );
    }

    // Generate invoice URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://partyondelivery.com';
    const invoiceUrl = `${baseUrl}/invoice/${draftOrder.token}`;

    // Load saved text overrides
    const textOverrides = await getInvoiceTextOverrides();

    // Get order number for subject
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    });

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
      personalNote: `This is an updated invoice for your order #${order?.orderNumber || 'N/A'}. Additional items have been added to your delivery.`,
    }, textOverrides);

    const emailSubject = `Updated Invoice - Order #${order?.orderNumber || 'N/A'} (${generateInvoiceSubject(Number(draftOrder.total))})`;

    const resendId = await sendEmail({
      to: draftOrder.customerEmail,
      subject: emailSubject,
      html,
      type: EmailType.INVOICE,
      draftOrderId: draftOrder.id,
    });

    if (!resendId) {
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

    // Update draft order status to SENT
    await updateDraftOrderStatus(draftOrder.id, 'SENT', { sentAt: new Date() });

    // Update amendment resolution to INVOICE_SENT
    await prisma.orderAmendment.update({
      where: { id: amendmentId },
      data: { resolution: 'INVOICE_SENT' },
    });

    return NextResponse.json({
      success: true,
      data: {
        emailId: resendId,
        invoiceUrl,
        sentTo: draftOrder.customerEmail,
      },
    });
  } catch (error) {
    console.error('[Send Amendment API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send amendment invoice' },
      { status: 500 }
    );
  }
}
