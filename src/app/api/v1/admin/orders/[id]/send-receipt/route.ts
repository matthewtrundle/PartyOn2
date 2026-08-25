/**
 * Send Receipt Email API
 * POST: Send receipt email to customer for a paid order
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { generateReceiptEmail, generateReceiptSubject } from '@/lib/email/templates/receipt';
import { sendEmail, formatDate } from '@/lib/email/resend-client';
import { EmailType } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    let bodyParams: { to?: string; cc?: string[] } = {};
    try {
      bodyParams = (await request.json()) || {};
    } catch {
      // No body — use defaults
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.financialStatus !== 'PAID') {
      return NextResponse.json(
        { success: false, error: `Cannot send receipt for an unpaid order (status: ${order.financialStatus})` },
        { status: 400 }
      );
    }

    const recipientEmail = bodyParams.to || order.customerEmail || order.customer?.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'No email address available for this order' },
        { status: 400 }
      );
    }

    const addr = order.deliveryAddress as { address1?: string; city?: string; province?: string; zip?: string } | null;
    const addressParts = [
      addr?.address1,
      addr?.city,
      [addr?.province, addr?.zip].filter(Boolean).join(' '),
    ].filter(Boolean);
    const deliveryAddress = addressParts.join(', ') || 'N/A';

    const paymentDate = formatDate(order.createdAt);

    const html = generateReceiptEmail({
      orderNumber: order.orderNumber,
      customerName: order.customerName || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Customer',
      customerEmail: recipientEmail,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime || 'Scheduled delivery',
      deliveryAddress,
      items: order.items.map((item) => ({
        title: item.title,
        variantTitle: item.variantTitle,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      deliveryFee: order.deliveryFee,
      discountAmount: order.discountAmount,
      discountCode: order.discountCode,
      tipAmount: order.tipAmount,
      total: order.total,
      paymentDate,
      transactionId: order.stripePaymentIntentId,
    });

    const subject = generateReceiptSubject(order.orderNumber);

    const resendId = await sendEmail({
      to: recipientEmail,
      cc: bodyParams.cc,
      subject,
      html,
      type: EmailType.RECEIPT,
      orderId: id,
      customerId: order.customerId,
    });

    if (!resendId) {
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Receipt sent successfully',
      data: {
        emailId: resendId,
        sentTo: recipientEmail,
      },
    });
  } catch (error) {
    console.error('[Send Receipt] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send receipt' },
      { status: 500 }
    );
  }
}
