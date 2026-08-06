import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { sendEmail } from '@/lib/email/resend-client';
import { generateOrderConfirmationEmail } from '@/lib/email/templates/order-confirmation';
import {
  generateDeliveryEnRouteEmail,
  generateDeliveryCompletedEmail,
} from '@/lib/email/templates/delivery-update';
import { generateInvoiceEmail } from '@/lib/email/templates/invoice';
import { getInvoiceTextOverrides } from '@/lib/email/template-content';
import { generateAffiliateWelcomeEmail } from '@/lib/email/templates/affiliate-welcome';
import { generateAffiliateProspectEmail } from '@/lib/email/templates/affiliate-prospect';
import { dashboardLinkEmail } from '@/lib/email/templates/dashboard-link';
import { generateOrderCancellationEmail } from '@/lib/email/templates/order-cancellation';
import { EmailType } from '@prisma/client';

const SAMPLE_ORDER = {
  orderNumber: 1234,
  customerName: 'John Smith',
  customerEmail: 'john@example.com',
  items: [
    { title: "Tito's Vodka 750ml", variantTitle: null, quantity: 2, price: 24.99, totalPrice: 49.98 },
    { title: 'Corona Extra', variantTitle: '12 Pack', quantity: 1, price: 18.99, totalPrice: 18.99 },
    { title: 'Lime Wedges', variantTitle: null, quantity: 1, price: 4.99, totalPrice: 4.99 },
  ],
  subtotal: 73.96,
  deliveryFee: 15.0,
  taxAmount: 6.1,
  total: 95.06,
  deliveryDate: new Date('2026-02-10'),
  deliveryTime: '2-4 PM',
  deliveryAddress: {
    address1: '123 Lake Austin Blvd',
    address2: 'Apt 4B',
    city: 'Austin',
    province: 'TX',
    zip: '78703',
  },
  deliveryInstructions: 'Gate code is #1234. Leave at front door.',
};

const SAMPLE_INVOICE = {
  customerName: 'John Smith',
  deliveryDate: new Date('2026-02-15'),
  deliveryTime: '2-4 PM',
  deliveryAddress: '123 Lake Austin Blvd',
  deliveryCity: 'Austin',
  deliveryState: 'TX',
  deliveryZip: '78703',
  items: [
    { title: "Tito's Vodka 750ml", quantity: 2, price: 24.99 },
    { title: 'Corona Extra 12 Pack', quantity: 1, price: 18.99 },
    { title: 'Lime Wedges', quantity: 1, price: 4.99 },
  ],
  subtotal: 73.96,
  taxAmount: 6.1,
  deliveryFee: 15.0,
  discountAmount: 0,
  total: 95.06,
  invoiceUrl: 'https://partyondelivery.com/invoice/sample-token-123',
};

const SAMPLE_DELIVERY = {
  orderNumber: 1234,
  customerName: 'John Smith',
  driverName: 'Mike',
  estimatedArrival: '15 minutes',
  deliveryAddress: {
    address1: '123 Lake Austin Blvd',
    address2: 'Apt 4B',
    city: 'Austin',
    province: 'TX',
    zip: '78703',
  },
  trackingUrl: 'https://partyondelivery.com/track/abc123',
  deliveryDate: new Date('2026-02-10'),
  deliveryTime: '2-4 PM',
};

const SUBJECT_MAP: Record<string, string> = {
  'order-confirmation': '[TEST] Order Confirmed - #1234',
  'delivery-en-route': '[TEST] Your Order #1234 is On Its Way!',
  'delivery-completed': '[TEST] Delivery Complete - Order #1234',
  'payment-failed': '[TEST] Payment Issue - Party On Delivery',
  'refund-processed': '[TEST] Refund Processed - Order #1234',
  'order-cancelled': '[TEST] Order Cancelled - #1234',
  'invoice': '[TEST] Your Invoice from Party On Delivery - $95.06',
  'affiliate-welcome': '[TEST] Welcome to the Party On Delivery Partner Program!',
  'dashboard-link': "[TEST] Your Party On Delivery Dashboard for John's Bachelor Party",
  'affiliate-prospect': '[TEST] Partner Program - Party On Delivery',
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { type, to } = body;

    if (!to || !type) {
      return NextResponse.json({ error: 'Missing email address or type' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    let html = '';
    let emailType: EmailType = EmailType.ORDER_CONFIRMATION;

    switch (type) {
      case 'order-confirmation':
        html = generateOrderConfirmationEmail(SAMPLE_ORDER);
        emailType = EmailType.ORDER_CONFIRMATION;
        break;
      case 'delivery-en-route':
        html = generateDeliveryEnRouteEmail(SAMPLE_DELIVERY);
        emailType = EmailType.DELIVERY_EN_ROUTE;
        break;
      case 'delivery-completed':
        html = generateDeliveryCompletedEmail(SAMPLE_DELIVERY);
        emailType = EmailType.DELIVERY_COMPLETED;
        break;
      case 'payment-failed':
        html = generatePaymentFailedHtml('John Smith', 'Card declined by issuing bank');
        emailType = EmailType.PAYMENT_FAILED;
        break;
      case 'refund-processed':
        html = generateRefundHtml('John Smith', 1234, 95.06, 'Order cancelled by customer');
        emailType = EmailType.REFUND_PROCESSED;
        break;
      case 'order-cancelled':
        html = generateOrderCancellationEmail({
          customerName: 'John Smith',
          orderNumber: 1234,
          total: 95.06,
          customNote: 'We apologize for the inconvenience. Please let us know if you would like to place a new order.',
          refundIssued: true,
          refundAmount: 95.06,
          items: [
            { title: "Tito's Vodka 750ml", quantity: 2, price: 24.99 },
            { title: 'Corona Extra 12 Pack', quantity: 1, price: 18.99 },
            { title: 'Lime Wedges', quantity: 1, price: 4.99 },
          ],
          deliveryDate: 'Saturday, February 15, 2026',
        });
        emailType = EmailType.ORDER_CANCELLED;
        break;
      case 'invoice': {
        const overrides = await getInvoiceTextOverrides();
        html = generateInvoiceEmail(SAMPLE_INVOICE, overrides);
        emailType = EmailType.INVOICE;
        break;
      }
      case 'affiliate-welcome':
        html = generateAffiliateWelcomeEmail({
          contactName: 'Jane Doe',
          businessName: 'Sunset Bar & Grill',
          code: 'SUNSET',
          referralLink: 'https://partyondelivery.com/partners/sunset?ref=SUNSET',
          dashboardLink: 'https://partyondelivery.com/affiliate/login',
        });
        emailType = EmailType.AFFILIATE_WELCOME;
        break;
      case 'affiliate-prospect':
        html = generateAffiliateProspectEmail({
          contactName: body.contactName || 'Jane Doe',
          businessName: body.businessName || 'Sunset Bar & Grill',
          introText: body.introText || undefined,
        });
        emailType = EmailType.AFFILIATE_WELCOME;
        break;
      case 'dashboard-link': {
        const dlResult = dashboardLinkEmail('https://partyondelivery.com/dashboard/SAMPLE123', "John's Bachelor Party");
        html = dlResult.html;
        emailType = EmailType.WELCOME;
        break;
      }
      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
    }

    let subject = SUBJECT_MAP[type] || '[TEST] Party On Delivery';
    // Allow sending prospect emails without [TEST] prefix
    if (type === 'affiliate-prospect' && body.live) {
      subject = 'Partner Program - Party On Delivery';
    }

    const emailId = await sendEmail({
      to,
      subject,
      html,
      text: `This is a test email from Party On Delivery. Type: ${type}`,
      type: emailType,
      metadata: { test: true, type },
    });

    if (emailId) {
      return NextResponse.json({ success: true, emailId });
    } else {
      return NextResponse.json({ error: 'Failed to send email. Check RESEND_API_KEY.' }, { status: 500 });
    }
  } catch (error) {
    console.error('[Email Preview Send] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}

function generatePaymentFailedHtml(customerName: string, errorMessage: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed - Party On Delivery</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #1a1a1a; padding: 32px; text-align: center;">
              <img src="https://partyondelivery.com/images/pod-logo-2025.png" alt="Party On Delivery" width="180" style="width: 180px; max-width: 100%; height: auto; margin-bottom: 12px;" />
              <p style="color: #ffffff; margin: 0; font-size: 14px; letter-spacing: 0.05em;">PREMIUM ALCOHOL DELIVERY</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fef2f2; padding: 24px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <div style="font-size: 48px; margin-bottom: 8px;">&#9888;</div>
              <h2 style="margin: 0; color: #991b1b; font-size: 24px;">Payment Issue</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #1a1a1a;">Hi ${customerName},</p>
              <p style="margin: 0 0 16px; font-size: 16px; color: #666;">We were unable to process your payment.</p>
              <div style="background-color: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">Error Details</p>
                <p style="margin: 4px 0 0; font-size: 14px; color: #666;">${errorMessage}</p>
              </div>
              <p style="margin: 16px 0; font-size: 16px; color: #666;">Please try again with a different payment method.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 24px; text-align: center;">
              <a href="https://partyondelivery.com/order" style="display: inline-block; background-color: #D4AF37; color: #1a1a1a; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Try Again</a>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px; text-align: center;">
              <p style="margin: 0; color: #D4AF37; font-size: 14px;">Need help?</p>
              <p style="margin: 8px 0 0; color: #ffffff; font-size: 14px;">Reply to this email or contact support@partyondelivery.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function generateRefundHtml(customerName: string, orderNumber: number, amount: number, reason: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Refund Processed - Party On Delivery</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #1a1a1a; padding: 32px; text-align: center;">
              <img src="https://partyondelivery.com/images/pod-logo-2025.png" alt="Party On Delivery" width="180" style="width: 180px; max-width: 100%; height: auto; margin-bottom: 12px;" />
              <p style="color: #ffffff; margin: 0; font-size: 14px; letter-spacing: 0.05em;">PREMIUM ALCOHOL DELIVERY</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #dbeafe; padding: 24px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <div style="font-size: 48px; margin-bottom: 8px;">&#128181;</div>
              <h2 style="margin: 0; color: #1e40af; font-size: 24px;">Refund Processed</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #1a1a1a;">Hi ${customerName},</p>
              <p style="margin: 0 0 16px; font-size: 16px; color: #666;">We've processed a refund for your order <strong>#${orderNumber}</strong>.</p>
              <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center;">
                <p style="margin: 0; color: #166534; font-size: 14px;">Refund Amount</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">$${amount.toFixed(2)}</p>
              </div>
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 0; color: #666; font-size: 14px;">Reason</p>
                <p style="margin: 4px 0 0; font-size: 14px; color: #1a1a1a;">${reason}</p>
              </div>
              <p style="margin: 16px 0; font-size: 14px; color: #666;">Please allow 5-10 business days for the refund to appear.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px; text-align: center;">
              <p style="margin: 0; color: #D4AF37; font-size: 14px;">Questions about your refund?</p>
              <p style="margin: 8px 0 0; color: #ffffff; font-size: 14px;">Reply to this email or contact support@partyondelivery.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
