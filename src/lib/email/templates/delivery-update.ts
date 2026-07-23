/**
 * Delivery Update Email Templates
 * Sent when delivery status changes
 */

import { formatCurrency } from '../resend-client';
import { escapeHtml } from '../escape-html';

interface DeliveryAddress {
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
}

export interface DeliveryUpdateData {
  orderNumber: number;
  customerName: string;
  deliveryDate: Date | string;
  deliveryTime: string;
  deliveryAddress: DeliveryAddress;
  driverName?: string;
  estimatedArrival?: string;
  total?: number | string;
}

/**
 * Email wrapper with consistent styling
 */
function wrapEmail(title: string, emoji: string, backgroundColor: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Party On Delivery</title>
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

          <!-- Status Banner -->
          <tr>
            <td style="background-color: ${backgroundColor}; padding: 24px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <div style="font-size: 48px; margin-bottom: 8px;">${emoji}</div>
              <h2 style="margin: 0; color: #1a1a1a; font-size: 24px;">${title}</h2>
            </td>
          </tr>

          ${content}

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px; text-align: center;">
              <p style="margin: 0; color: #D4AF37; font-size: 14px;">Questions about your delivery?</p>
              <p style="margin: 8px 0 0; color: #ffffff; font-size: 14px;">Reply to this email or contact us at info@partyondelivery.com</p>
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
}

/**
 * Format address for display
 */
function formatAddress(address: DeliveryAddress): string {
  return [
    address.address1,
    address.address2,
    `${address.city}, ${address.province} ${address.zip}`,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join('<br>');
}

/**
 * Generate "Delivery En Route" email
 */
export function generateDeliveryEnRouteEmail(data: DeliveryUpdateData): string {
  const {
    orderNumber,
    customerName,
    deliveryAddress,
    driverName,
    estimatedArrival,
  } = data;

  const firstName = escapeHtml(customerName.trim().split(/\s+/)[0]);

  const content = `
    <!-- Main Content -->
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 16px; font-size: 16px; color: #666;">
          Great news! Your order <strong>#${orderNumber}</strong> is on its way to you.
        </p>

        ${
          driverName
            ? `
          <div style="background-color: #f0f9ff; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0; color: #0369a1; font-size: 14px;">Your Driver</p>
            <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">${escapeHtml(driverName)}</p>
          </div>
        `
            : ''
        }

        ${
          estimatedArrival
            ? `
          <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">Estimated Arrival</p>
            <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">${estimatedArrival}</p>
          </div>
        `
            : ''
        }

        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
          <p style="margin: 0; color: #666; font-size: 14px;">Delivering to</p>
          <p style="margin: 4px 0 0; font-size: 16px; color: #1a1a1a;">${formatAddress(deliveryAddress)}</p>
        </div>
      </td>
    </tr>

    <!-- Reminder -->
    <tr>
      <td style="padding: 0 24px 24px;">
        <div style="background-color: #fef2f2; border-radius: 8px; padding: 16px; border-left: 4px solid #dc2626;">
          <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">ID Verification Required</p>
          <p style="margin: 8px 0 0; color: #666; font-size: 14px;">
            Please have a valid photo ID ready. We are required to verify that all recipients are 21 or older.
          </p>
        </div>
      </td>
    </tr>
  `;

  return wrapEmail('Your Order is On Its Way!', '&#128666;', '#dbeafe', content);
}

/**
 * Generate "Delivery Completed" email
 */
export function generateDeliveryCompletedEmail(data: DeliveryUpdateData): string {
  const {
    orderNumber,
    customerName,
    total,
  } = data;

  const firstName = escapeHtml(customerName.trim().split(/\s+/)[0]);

  const content = `
    <!-- Main Content -->
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 16px; font-size: 16px; color: #666;">
          Your order <strong>#${orderNumber}</strong> has been delivered successfully!
        </p>

        ${
          total
            ? `
          <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center;">
            <p style="margin: 0; color: #166534; font-size: 14px;">Order Total</p>
            <p style="margin: 4px 0 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">${formatCurrency(total)}</p>
          </div>
        `
            : ''
        }

        <p style="margin: 16px 0; font-size: 16px; color: #666;">
          Thank you for choosing Party On Delivery! We hope you enjoy your purchase.
        </p>
      </td>
    </tr>

    <!-- Call to Action -->
    <tr>
      <td style="padding: 0 24px 24px; text-align: center;">
        <a href="https://partyondelivery.com/products" style="display: inline-block; background-color: #D4AF37; color: #1a1a1a; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Order Again
        </a>
      </td>
    </tr>

    <!-- Feedback -->
    <tr>
      <td style="padding: 0 24px 24px;">
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            How was your experience? We'd love to hear from you!<br>
            Reply to this email with any feedback.
          </p>
        </div>
      </td>
    </tr>
  `;

  return wrapEmail('Delivery Complete!', '&#10004;', '#dcfce7', content);
}

/**
 * Generate plain text for "Delivery En Route"
 */
export function generateDeliveryEnRouteText(data: DeliveryUpdateData): string {
  const { orderNumber, customerName, deliveryAddress, driverName, estimatedArrival } = data;
  const firstName = customerName.trim().split(/\s+/)[0]; // plain-text email — no HTML escaping

  const addressLines = [
    deliveryAddress.address1,
    deliveryAddress.address2,
    `${deliveryAddress.city}, ${deliveryAddress.province} ${deliveryAddress.zip}`,
  ]
    .filter(Boolean)
    .join('\n  ');

  return `
PARTY ON DELIVERY
Delivery Update

Hi ${firstName},

Great news! Your order #${orderNumber} is on its way!

${driverName ? `Your Driver: ${driverName}` : ''}
${estimatedArrival ? `Estimated Arrival: ${estimatedArrival}` : ''}

Delivering to:
  ${addressLines}

IMPORTANT: Please have a valid photo ID ready. We are required to verify that all recipients are 21 or older.

Questions? Reply to this email or contact info@partyondelivery.com

Party On Delivery
Premium Alcohol Delivery
  `.trim();
}

/**
 * Generate plain text for "Delivery Completed"
 */
export function generateDeliveryCompletedText(data: DeliveryUpdateData): string {
  const { orderNumber, customerName, total } = data;
  const firstName = customerName.trim().split(/\s+/)[0]; // plain-text email — no HTML escaping

  return `
PARTY ON DELIVERY
Delivery Complete!

Hi ${firstName},

Your order #${orderNumber} has been delivered successfully!

${total ? `Order Total: ${formatCurrency(total)}` : ''}

Thank you for choosing Party On Delivery! We hope you enjoy your purchase.

Order again at: https://partyondelivery.com/products

How was your experience? Reply to this email with any feedback!

Party On Delivery
Premium Alcohol Delivery
  `.trim();
}
