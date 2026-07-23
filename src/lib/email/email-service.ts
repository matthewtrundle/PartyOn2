/**
 * Email Service
 * Centralized service for sending all transactional emails
 */

import { EmailType } from '@prisma/client';
import { sendEmail } from './resend-client';
import {
  generateOrderConfirmationEmail,
  generateOrderConfirmationText,
  OrderConfirmationData,
} from './templates/order-confirmation';
import {
  generateDeliveryEnRouteEmail,
  generateDeliveryEnRouteText,
  generateDeliveryCompletedEmail,
  generateDeliveryCompletedText,
  DeliveryUpdateData,
} from './templates/delivery-update';
import {
  generateOrderCancellationEmail,
  generateOrderCancellationText,
  OrderCancellationData,
} from './templates/order-cancellation';
import {
  generatePartnerOnePagerEmail,
  generatePartnerOnePagerEmailText,
} from './templates/partner-onepager';
import fs from 'fs/promises';
import path from 'path';

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  data: OrderConfirmationData,
  options?: { cc?: string[] }
): Promise<string | null> {
  const html = generateOrderConfirmationEmail(data);
  const text = generateOrderConfirmationText(data);

  return sendEmail({
    to: data.customerEmail,
    ...(options?.cc && options.cc.length > 0 ? { cc: options.cc } : {}),
    subject: `Order Confirmed - #${data.orderNumber}`,
    html,
    text,
    type: EmailType.ORDER_CONFIRMATION,
    metadata: {
      orderNumber: data.orderNumber,
      customerName: data.customerName,
    },
  });
}

/**
 * Send delivery en route notification
 */
export async function sendDeliveryEnRouteEmail(
  customerEmail: string,
  data: DeliveryUpdateData
): Promise<string | null> {
  const html = generateDeliveryEnRouteEmail(data);
  const text = generateDeliveryEnRouteText(data);

  return sendEmail({
    to: customerEmail,
    subject: `Your Order #${data.orderNumber} is On Its Way!`,
    html,
    text,
    type: EmailType.DELIVERY_EN_ROUTE,
    metadata: {
      orderNumber: data.orderNumber,
      driverName: data.driverName,
    },
  });
}

/**
 * Send delivery completed notification
 */
export async function sendDeliveryCompletedEmail(
  customerEmail: string,
  data: DeliveryUpdateData
): Promise<string | null> {
  const html = generateDeliveryCompletedEmail(data);
  const text = generateDeliveryCompletedText(data);

  return sendEmail({
    to: customerEmail,
    subject: `Delivery Complete - Order #${data.orderNumber}`,
    html,
    text,
    type: EmailType.DELIVERY_COMPLETED,
    metadata: {
      orderNumber: data.orderNumber,
    },
  });
}

/**
 * Send payment failed notification
 */
export async function sendPaymentFailedEmail(
  customerEmail: string,
  customerName: string,
  errorMessage?: string
): Promise<string | null> {
  const html = `
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

          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 32px; text-align: center;">
              <img src="https://partyondelivery.com/images/pod-logo-2025.png" alt="Party On Delivery" width="180" style="width: 180px; max-width: 100%; height: auto; margin-bottom: 12px;" />
              <p style="color: #ffffff; margin: 0; font-size: 14px; letter-spacing: 0.05em;">PREMIUM ALCOHOL DELIVERY</p>
            </td>
          </tr>

          <!-- Error Banner -->
          <tr>
            <td style="background-color: #fef2f2; padding: 24px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <div style="font-size: 48px; margin-bottom: 8px;">&#9888;</div>
              <h2 style="margin: 0; color: #991b1b; font-size: 24px;">Payment Issue</h2>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #1a1a1a;">
                Hi ${customerName},
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; color: #666;">
                We were unable to process your payment. This can happen for several reasons:
              </p>
              <ul style="margin: 0 0 16px; padding: 0 0 0 20px; color: #666;">
                <li>Insufficient funds</li>
                <li>Card declined by bank</li>
                <li>Incorrect card information</li>
                <li>Card expired</li>
              </ul>
              ${
                errorMessage
                  ? `
                <div style="background-color: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                  <p style="margin: 0; color: #991b1b; font-size: 14px;">Error Details</p>
                  <p style="margin: 4px 0 0; font-size: 14px; color: #666;">${errorMessage}</p>
                </div>
              `
                  : ''
              }
              <p style="margin: 16px 0; font-size: 16px; color: #666;">
                Please try again with a different payment method or contact your bank if the issue persists.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 24px 24px; text-align: center;">
              <a href="https://partyondelivery.com/products" style="display: inline-block; background-color: #D4AF37; color: #1a1a1a; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Try Again
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px; text-align: center;">
              <p style="margin: 0; color: #D4AF37; font-size: 14px;">Need help?</p>
              <p style="margin: 8px 0 0; color: #ffffff; font-size: 14px;">Reply to this email or contact us at support@partyondelivery.com</p>
              <p style="margin: 16px 0 0; color: #666; font-size: 12px;">&copy; ${new Date().getFullYear()} Party On Delivery. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
PARTY ON DELIVERY
Payment Issue

Hi ${customerName},

We were unable to process your payment. This can happen for several reasons:
- Insufficient funds
- Card declined by bank
- Incorrect card information
- Card expired

${errorMessage ? `Error Details: ${errorMessage}\n` : ''}
Please try again with a different payment method or contact your bank if the issue persists.

Try again at: https://partyondelivery.com/products

Need help? Reply to this email or contact support@partyondelivery.com

Party On Delivery
Premium Alcohol Delivery
  `.trim();

  return sendEmail({
    to: customerEmail,
    subject: 'Payment Issue - Party On Delivery',
    html,
    text,
    type: EmailType.PAYMENT_FAILED,
    metadata: {
      customerName,
      errorMessage,
    },
  });
}

/**
 * Normalized partner inquiry data
 */
export interface PartnerInquiryData {
  contactName: string;
  email: string;
  phone?: string;
  businessName?: string;
  businessType?: string;
  partnerType?: string;
  website?: string;
  message?: string;
  notes?: string;
  eventTypes?: string;
  serviceArea?: string;
  guestCount?: string;
  timeframe?: string;
  eventDate?: string;
  venue?: string;
  numberOfRooms?: string;
  monthlyVolume?: string;
  currentProvider?: string;
  interests?: string;
  source?: string;
  submittedAt?: string;
}

/**
 * Send partner inquiry notification to business owner
 */
/**
 * Escape untrusted text before interpolating it into an HTML email body. The
 * partner-inquiry fields below come from a public, unauthenticated form and are
 * rendered in an email ops staff open and trust — so every lead-supplied value
 * must be neutralized (CWE-79).
 */
function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendPartnerInquiryNotification(
  data: PartnerInquiryData
): Promise<string | null> {
  const notifyEmail = process.env.RESEND_FROM_EMAIL || 'info@partyondelivery.com';

  // Build rows only for fields that have values
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Contact Name', value: data.contactName },
    { label: 'Email', value: data.email },
  ];

  if (data.phone) rows.push({ label: 'Phone', value: data.phone });
  if (data.businessName) rows.push({ label: 'Business Name', value: data.businessName });
  if (data.businessType) rows.push({ label: 'Business Type', value: data.businessType });
  if (data.partnerType) rows.push({ label: 'Partner Type', value: data.partnerType });
  if (data.website) rows.push({ label: 'Website', value: data.website });
  if (data.eventDate) rows.push({ label: 'Event Date', value: data.eventDate });
  if (data.venue) rows.push({ label: 'Venue', value: data.venue });
  if (data.eventTypes) rows.push({ label: 'Event Types', value: data.eventTypes });
  if (data.guestCount) rows.push({ label: 'Guest Count', value: data.guestCount });
  if (data.serviceArea) rows.push({ label: 'Service Area', value: data.serviceArea });
  if (data.timeframe) rows.push({ label: 'Timeframe', value: data.timeframe });
  if (data.numberOfRooms) rows.push({ label: 'Number of Rooms', value: data.numberOfRooms });
  if (data.monthlyVolume) rows.push({ label: 'Monthly Volume', value: data.monthlyVolume });
  if (data.currentProvider) rows.push({ label: 'Current Provider', value: data.currentProvider });
  if (data.interests) rows.push({ label: 'Interests', value: data.interests });
  if (data.message) rows.push({ label: 'Message', value: data.message });
  if (data.notes) rows.push({ label: 'Notes', value: data.notes });
  if (data.source) rows.push({ label: 'Source Page', value: data.source });

  const tableRows = rows.map(r =>
    `<tr>
      <td style="padding: 10px 16px; font-weight: 600; color: #1a1a1a; border-bottom: 1px solid #e5e5e5; white-space: nowrap; vertical-align: top;">${r.label}</td>
      <td style="padding: 10px 16px; color: #374151; border-bottom: 1px solid #e5e5e5;">${escapeHtml(r.value)}</td>
    </tr>`
  ).join('\n');

  const textRows = rows.map(r => `${r.label}: ${r.value}`).join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
            <td style="background-color: #fef3c7; padding: 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h2 style="margin: 0; color: #92400e; font-size: 22px;">New Partnership Inquiry</h2>
              <p style="margin: 6px 0 0; color: #a16207; font-size: 14px;">${escapeHtml(data.partnerType || 'General')} &middot; ${new Date(data.submittedAt || Date.now()).toLocaleString('en-US', { timeZone: 'America/Chicago' })}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${tableRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 24px; text-align: center;">
              <a href="mailto:${escapeHtml(data.email)}" style="display: inline-block; background-color: #D4AF37; color: #1a1a1a; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Reply to ${escapeHtml(data.contactName.split(' ')[0])}
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1a1a1a; padding: 16px; text-align: center;">
              <p style="margin: 0; color: #666; font-size: 12px;">&copy; ${new Date().getFullYear()} Party On Delivery</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
NEW PARTNERSHIP INQUIRY
${data.partnerType || 'General'}

${textRows}

Submitted: ${data.submittedAt || new Date().toISOString()}
  `.trim();

  return sendEmail({
    to: notifyEmail,
    subject: `New Partner Inquiry: ${data.contactName} - ${data.partnerType || 'General'}`,
    html,
    text,
    type: EmailType.PARTNER_INQUIRY,
    metadata: {
      contactName: data.contactName,
      email: data.email,
      partnerType: data.partnerType,
      source: data.source,
    },
  });
}

/**
 * Send the partner one-pager email — the outbound to the partner who signed
 * up via /partners/vacation-rentals (or scanned a QR on a Premier boat).
 *
 * Loads the PDF attachment from `public/email-assets/pod-partner-onepager.pdf`,
 * interpolates the Calendly URL into the HTML template, and tags the send
 * for campaign attribution.
 */
export interface PartnerOnePagerEmailOptions {
  /** Partner's email address */
  to: string;
  /** Optional partner / property-management company name (for logging only) */
  companyName?: string;
  /** Source slug for tag attribution (e.g. 'vacation-rental-onepager') */
  source?: string;
  /** Optional QR id from the boat / placement */
  signupQrId?: string;
}

// Default partner Calendly URL — appears in the email body, so it's not
// a secret. Hardcoded fallback so the send can never silently fail just
// because the env var is missing.
const DEFAULT_PARTNER_CALENDLY_URL = 'https://123.partyondelivery.com/partnership-call';

export async function sendPartnerOnePagerEmail(
  options: PartnerOnePagerEmailOptions
): Promise<string | null> {
  const { to, companyName, source, signupQrId } = options;

  const calendlyUrl = process.env.PARTNER_CALENDLY_URL?.trim() || DEFAULT_PARTNER_CALENDLY_URL;

  // Mailto-based unsubscribe — keeps things simple, no separate page needed.
  const unsubscribeMailto = `mailto:info@partyondelivery.com?subject=${encodeURIComponent('Unsubscribe — Partner Email')}&body=${encodeURIComponent(`Please remove ${to} from the partner program list.`)}`;

  const html = generatePartnerOnePagerEmail({
    calendlyUrl,
    unsubscribeUrl: unsubscribeMailto,
  });
  const text = generatePartnerOnePagerEmailText({
    calendlyUrl,
    unsubscribeUrl: unsubscribeMailto,
  });

  const pdfPath = path.join(process.cwd(), 'public/email-assets/pod-partner-onepager.pdf');
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await fs.readFile(pdfPath);
  } catch (err) {
    console.error('[Partner One-Pager] Failed to read PDF attachment at', pdfPath, err);
    return null;
  }

  return sendEmail({
    to,
    subject: 'Your POD partner one-pager',
    html,
    text,
    type: EmailType.PARTNER_INQUIRY,
    attachments: [
      {
        filename: 'POD-Partner-OnePager.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
    tags: [
      { name: 'campaign', value: 'partner-program' },
      { name: 'source', value: source || 'vacation-rental-onepager' },
    ],
    headers: {
      'List-Unsubscribe': `<${unsubscribeMailto}>`,
    },
    metadata: {
      to,
      companyName,
      source,
      signupQrId,
    },
  });
}

/**
 * Send refund processed notification
 */
export async function sendRefundProcessedEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: number,
  refundAmount: number | string,
  reason?: string
): Promise<string | null> {
  const { formatCurrency } = await import('./resend-client');

  const html = `
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

          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 32px; text-align: center;">
              <img src="https://partyondelivery.com/images/pod-logo-2025.png" alt="Party On Delivery" width="180" style="width: 180px; max-width: 100%; height: auto; margin-bottom: 12px;" />
              <p style="color: #ffffff; margin: 0; font-size: 14px; letter-spacing: 0.05em;">PREMIUM ALCOHOL DELIVERY</p>
            </td>
          </tr>

          <!-- Info Banner -->
          <tr>
            <td style="background-color: #dbeafe; padding: 24px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <div style="font-size: 48px; margin-bottom: 8px;">&#128181;</div>
              <h2 style="margin: 0; color: #1e40af; font-size: 24px;">Refund Processed</h2>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #1a1a1a;">
                Hi ${customerName},
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; color: #666;">
                We've processed a refund for your order <strong>#${orderNumber}</strong>.
              </p>

              <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center;">
                <p style="margin: 0; color: #166534; font-size: 14px;">Refund Amount</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">${formatCurrency(refundAmount)}</p>
              </div>

              ${
                reason
                  ? `
                <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                  <p style="margin: 0; color: #666; font-size: 14px;">Reason</p>
                  <p style="margin: 4px 0 0; font-size: 14px; color: #1a1a1a;">${reason}</p>
                </div>
              `
                  : ''
              }

              <p style="margin: 16px 0; font-size: 14px; color: #666;">
                Please allow 5-10 business days for the refund to appear on your original payment method.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px; text-align: center;">
              <p style="margin: 0; color: #D4AF37; font-size: 14px;">Questions about your refund?</p>
              <p style="margin: 8px 0 0; color: #ffffff; font-size: 14px;">Reply to this email or contact us at support@partyondelivery.com</p>
              <p style="margin: 16px 0 0; color: #666; font-size: 12px;">&copy; ${new Date().getFullYear()} Party On Delivery. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
PARTY ON DELIVERY
Refund Processed

Hi ${customerName},

We've processed a refund for your order #${orderNumber}.

Refund Amount: ${formatCurrency(refundAmount)}
${reason ? `Reason: ${reason}\n` : ''}
Please allow 5-10 business days for the refund to appear on your original payment method.

Questions? Reply to this email or contact support@partyondelivery.com

Party On Delivery
Premium Alcohol Delivery
  `.trim();

  return sendEmail({
    to: customerEmail,
    subject: `Refund Processed - Order #${orderNumber}`,
    html,
    text,
    type: EmailType.REFUND_PROCESSED,
    orderId: undefined, // Could be passed if available
    metadata: {
      orderNumber,
      refundAmount,
      reason,
    },
  });
}

/**
 * Send the Lake Travis Full Moon Party roll-forward refund email.
 *
 * Used when the event is postponed for not hitting its minimum: the cruise
 * rolls to the next full moon and every ticket is refunded in full. Framed as
 * a postponement (not a generic order refund) so buyers understand why their
 * ticket was refunded and that no action is needed.
 */
export async function sendFullMoonRefundEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: number,
  refundAmount: number | string,
): Promise<string | null> {
  const { formatCurrency } = await import('./resend-client');
  const rawFirstName = (customerName || 'there').trim().split(/\s+/)[0] || 'there';
  // Escape before interpolating into the HTML body (buyer-controlled name).
  const firstNameHtml = rawFirstName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Full Moon Party — Postponed &amp; Refunded</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #1a1a1a; padding: 32px; text-align: center;">
              <img src="https://partyondelivery.com/images/pod-logo-2025.png" alt="Party On Delivery" width="180" style="width: 180px; max-width: 100%; height: auto; margin-bottom: 12px;" />
              <p style="color: #ffffff; margin: 0; font-size: 14px; letter-spacing: 0.05em;">LAKE TRAVIS FULL MOON PARTY</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #1a1a1a;">Hi ${firstNameHtml},</p>
              <p style="margin: 0 0 16px; font-size: 16px; color: #666;">
                This full moon cruise didn't reach the guest minimum we need to safely cast off, so we're
                <strong>rolling it forward to the next full moon</strong>. There's nothing you need to do.
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; color: #666;">
                We've <strong>refunded your ticket (order #${orderNumber}) in full</strong>.
              </p>
              <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center;">
                <p style="margin: 0; color: #166534; font-size: 14px;">Refund Amount</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">${formatCurrency(refundAmount)}</p>
              </div>
              <p style="margin: 16px 0; font-size: 14px; color: #666;">
                Please allow 5-10 business days for the refund to appear on your original payment method.
                We'll send the next date your way soon — we'd love to have you aboard.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px; text-align: center;">
              <p style="margin: 0; color: #D4AF37; font-size: 14px;">Questions?</p>
              <p style="margin: 8px 0 0; color: #ffffff; font-size: 14px;">Reply to this email or contact us at support@partyondelivery.com</p>
              <p style="margin: 16px 0 0; color: #666; font-size: 12px;">&copy; ${new Date().getFullYear()} Party On Delivery. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
LAKE TRAVIS FULL MOON PARTY

Hi ${rawFirstName},

This full moon cruise didn't reach the guest minimum we need to safely cast off, so we're rolling it forward to the next full moon. There's nothing you need to do.

We've refunded your ticket (order #${orderNumber}) in full.

Refund Amount: ${formatCurrency(refundAmount)}

Please allow 5-10 business days for the refund to appear on your original payment method. We'll send the next date your way soon — we'd love to have you aboard.

Questions? Reply to this email or contact support@partyondelivery.com

Party On Delivery
  `.trim();

  return sendEmail({
    to: customerEmail,
    subject: `Full Moon Party postponed — your ticket is refunded (Order #${orderNumber})`,
    html,
    text,
    type: EmailType.REFUND_PROCESSED,
    metadata: {
      orderNumber,
      refundAmount,
      flow: 'full-moon-roll-forward',
    },
  });
}

/**
 * Send order cancellation notification
 */
export async function sendOrderCancellationEmail(
  customerEmail: string,
  data: OrderCancellationData
): Promise<string | null> {
  const html = generateOrderCancellationEmail(data);
  const text = generateOrderCancellationText(data);

  return sendEmail({
    to: customerEmail,
    subject: `Order Cancelled - #${data.orderNumber}`,
    html,
    text,
    type: EmailType.ORDER_CANCELLED,
    metadata: {
      orderNumber: data.orderNumber,
      refundIssued: data.refundIssued || false,
    },
  });
}
