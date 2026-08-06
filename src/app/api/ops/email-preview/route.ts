import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { generateOrderConfirmationEmail } from '@/lib/email/templates/order-confirmation';
import {
  generateDeliveryEnRouteEmail,
  generateDeliveryCompletedEmail,
} from '@/lib/email/templates/delivery-update';
import { generateInvoiceEmail, type InvoiceTextOverrides } from '@/lib/email/templates/invoice';
import { getInvoiceTextOverrides } from '@/lib/email/template-content';
import { generateAffiliateWelcomeEmail } from '@/lib/email/templates/affiliate-welcome';
import { generateAffiliateProspectEmail } from '@/lib/email/templates/affiliate-prospect';
import { dashboardLinkEmail } from '@/lib/email/templates/dashboard-link';
import { generateOrderCancellationEmail } from '@/lib/email/templates/order-cancellation';

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

export async function GET(request: NextRequest) {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const type = request.nextUrl.searchParams.get('type') || 'order-confirmation';

  let html = '';

  switch (type) {
    case 'order-confirmation':
      html = generateOrderConfirmationEmail(SAMPLE_ORDER);
      break;

    case 'delivery-en-route':
      html = generateDeliveryEnRouteEmail(SAMPLE_DELIVERY);
      break;

    case 'delivery-completed':
      html = generateDeliveryCompletedEmail(SAMPLE_DELIVERY);
      break;

    case 'payment-failed':
      html = generatePaymentFailedHtml('John Smith', 'Card declined by issuing bank');
      break;

    case 'refund-processed':
      html = generateRefundHtml('John Smith', 1234, 95.06, 'Order cancelled by customer');
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
      break;

    case 'invoice': {
      const overrides = await getInvoiceTextOverrides();
      html = generateInvoiceEmail(SAMPLE_INVOICE, overrides);
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
      break;

    case 'affiliate-prospect':
      html = generateAffiliateProspectEmail({
        contactName: 'Jane Doe',
        businessName: 'Sunset Bar & Grill',
      });
      break;

    case 'dashboard-link': {
      const result = dashboardLinkEmail('https://partyondelivery.com/dashboard/SAMPLE123', "John's Bachelor Party");
      html = result.html;
      break;
    }

    default:
      html = '<p>Unknown email type</p>';
  }

  return NextResponse.json({ html });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireOpsAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { type, textOverrides } = body;

    if (type === 'invoice') {
      const html = generateInvoiceEmail(SAMPLE_INVOICE, textOverrides as InvoiceTextOverrides);
      return NextResponse.json({ html });
    }

    if (type === 'affiliate-prospect') {
      const html = generateAffiliateProspectEmail({
        contactName: body.contactName || 'Jane Doe',
        businessName: body.businessName || 'Sunset Bar & Grill',
        introText: body.introText || undefined,
      });
      return NextResponse.json({ html });
    }

    return NextResponse.json({ error: 'Only invoice and affiliate-prospect types support live preview' }, { status: 400 });
  } catch (error) {
    console.error('[Email Preview POST] Error:', error);
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
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
