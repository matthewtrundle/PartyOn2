/**
 * Order Confirmation Email Template
 * Sent when a customer completes checkout
 */

import { formatCurrency, formatDate, formatTime } from '../resend-client';
import { escapeHtml } from '../escape-html';

interface OrderItem {
  title: string;
  variantTitle?: string | null;
  quantity: number;
  price: number | string;
  totalPrice: number | string;
}

interface DeliveryAddress {
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
}

export interface OrderConfirmationData {
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number | string;
  deliveryFee: number | string;
  taxAmount: number | string;
  discountAmount?: number | string;
  discountCode?: string;
  total: number | string;
  deliveryDate: Date | string;
  deliveryTime: string;
  deliveryAddress: DeliveryAddress;
  deliveryInstructions?: string;
}

/**
 * Generate order confirmation email HTML
 */
export function generateOrderConfirmationEmail(data: OrderConfirmationData): string {
  const {
    orderNumber,
    customerName,
    items,
    subtotal,
    deliveryFee,
    taxAmount,
    discountAmount,
    discountCode,
    total,
    deliveryDate,
    deliveryTime,
    deliveryAddress,
    deliveryInstructions,
  } = data;

  // HTML-escape every customer/external-supplied field before it enters the HTML
  // body — sanitizeName strips control chars but leaves `<`/`>`/`&` intact, so a
  // name like `<a href=…>` would otherwise render live in this trusted email.
  const firstName = escapeHtml(customerName.trim().split(/\s+/)[0]);

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
          <strong>${escapeHtml(item.title)}</strong>
          ${item.variantTitle ? `<br><span style="color: #666; font-size: 14px;">${escapeHtml(item.variantTitle)}</span>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${formatCurrency(item.totalPrice)}</td>
      </tr>
    `
    )
    .join('');

  const addressLines = [
    deliveryAddress.address1,
    deliveryAddress.address2,
    `${deliveryAddress.city}, ${deliveryAddress.province} ${deliveryAddress.zip}`,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join('<br>');

  const discountHtml =
    discountAmount && parseFloat(String(discountAmount)) > 0
      ? `
      <tr>
        <td colspan="2" style="padding: 8px 12px; text-align: right;">Discount${discountCode ? ` (${discountCode})` : ''}:</td>
        <td style="padding: 8px 12px; text-align: right; color: #16a34a;">-${formatCurrency(discountAmount)}</td>
      </tr>
    `
      : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - Party On Delivery</title>
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

          <!-- Confirmation Banner -->
          <tr>
            <td style="background-color: #f0fdf4; padding: 24px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <div style="font-size: 48px; margin-bottom: 8px;">&#10003;</div>
              <h2 style="margin: 0; color: #166534; font-size: 24px;">Order Confirmed!</h2>
              <p style="margin: 8px 0 0; color: #666;">Thank you for your order, ${firstName}</p>
            </td>
          </tr>

          <!-- Order Number -->
          <tr>
            <td style="padding: 24px; border-bottom: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; color: #666; font-size: 14px;">Order Number</p>
                    <p style="margin: 4px 0 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">#${orderNumber}</p>
                  </td>
                  <td style="text-align: right;">
                    <p style="margin: 0; color: #666; font-size: 14px;">Order Date</p>
                    <p style="margin: 4px 0 0; font-size: 16px; color: #1a1a1a;">${formatDate(new Date())}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Info -->
          <tr>
            <td style="padding: 24px; background-color: #fefce8; border-bottom: 1px solid #e5e5e5;">
              <h3 style="margin: 0 0 16px; color: #854d0e; font-size: 18px;">Scheduled Delivery</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="vertical-align: top;">
                    <p style="margin: 0; color: #666; font-size: 14px;">Date & Time</p>
                    <p style="margin: 4px 0 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${formatDate(deliveryDate)}</p>
                    <p style="margin: 4px 0 0; font-size: 16px; color: #1a1a1a;">${formatTime(deliveryTime)}</p>
                  </td>
                  <td width="50%" style="vertical-align: top;">
                    <p style="margin: 0; color: #666; font-size: 14px;">Delivery Address</p>
                    <p style="margin: 4px 0 0; font-size: 16px; color: #1a1a1a;">${addressLines}</p>
                  </td>
                </tr>
              </table>
              ${
                deliveryInstructions
                  ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #fde047;">
                  <p style="margin: 0; color: #666; font-size: 14px;">Delivery Instructions</p>
                  <p style="margin: 4px 0 0; font-size: 14px; color: #1a1a1a;">${escapeHtml(deliveryInstructions)}</p>
                </div>
              `
                  : ''
              }
            </td>
          </tr>

          <!-- Order Items -->
          <tr>
            <td style="padding: 24px;">
              <h3 style="margin: 0 0 16px; color: #1a1a1a; font-size: 18px;">Order Summary</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; font-size: 14px; color: #666; border-bottom: 1px solid #e5e5e5;">Item</th>
                    <th style="padding: 12px; text-align: center; font-size: 14px; color: #666; border-bottom: 1px solid #e5e5e5;">Qty</th>
                    <th style="padding: 12px; text-align: right; font-size: 14px; color: #666; border-bottom: 1px solid #e5e5e5;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" style="padding: 8px 12px; text-align: right;">Subtotal:</td>
                    <td style="padding: 8px 12px; text-align: right;">${formatCurrency(subtotal)}</td>
                  </tr>
                  ${discountHtml}
                  <tr>
                    <td colspan="2" style="padding: 8px 12px; text-align: right;">Delivery Fee:</td>
                    <td style="padding: 8px 12px; text-align: right;">${formatCurrency(deliveryFee)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding: 8px 12px; text-align: right;">Tax:</td>
                    <td style="padding: 8px 12px; text-align: right;">${formatCurrency(taxAmount)}</td>
                  </tr>
                  <tr style="background-color: #f9fafb;">
                    <td colspan="2" style="padding: 12px; text-align: right; font-weight: 600; font-size: 18px;">Total:</td>
                    <td style="padding: 12px; text-align: right; font-weight: 600; font-size: 18px;">${formatCurrency(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>

          <!-- Next Steps -->
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e5e5;">
              <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 16px;">What's Next?</h3>
              <ol style="margin: 0; padding: 0 0 0 20px; color: #666; font-size: 14px; line-height: 1.6;">
                <li>We'll notify you when your order is being prepared</li>
                <li>You'll receive a notification when your delivery is en route</li>
                <li>Have your ID ready - we verify age on delivery</li>
              </ol>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px; text-align: center;">
              <p style="margin: 0; color: #D4AF37; font-size: 14px;">Questions about your order?</p>
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
 * Generate plain text version of order confirmation
 */
export function generateOrderConfirmationText(data: OrderConfirmationData): string {
  const {
    orderNumber,
    customerName,
    items,
    subtotal,
    deliveryFee,
    taxAmount,
    total,
    deliveryDate,
    deliveryTime,
    deliveryAddress,
    deliveryInstructions,
  } = data;

  const firstName = customerName.trim().split(/\s+/)[0];

  const itemsList = items
    .map(
      (item) =>
        `  - ${item.title}${item.variantTitle ? ` (${item.variantTitle})` : ''} x${item.quantity}: ${formatCurrency(item.totalPrice)}`
    )
    .join('\n');

  const addressLines = [
    deliveryAddress.address1,
    deliveryAddress.address2,
    `${deliveryAddress.city}, ${deliveryAddress.province} ${deliveryAddress.zip}`,
  ]
    .filter(Boolean)
    .join('\n  ');

  return `
PARTY ON DELIVERY
Order Confirmation

Hi ${firstName},

Thank you for your order! Here are the details:

ORDER #${orderNumber}
${formatDate(new Date())}

SCHEDULED DELIVERY
Date: ${formatDate(deliveryDate)}
Time: ${formatTime(deliveryTime)}

Delivery Address:
  ${addressLines}

${deliveryInstructions ? `Delivery Instructions:\n  ${deliveryInstructions}\n` : ''}
ORDER ITEMS
${itemsList}

Subtotal: ${formatCurrency(subtotal)}
Delivery Fee: ${formatCurrency(deliveryFee)}
Tax: ${formatCurrency(taxAmount)}
TOTAL: ${formatCurrency(total)}

WHAT'S NEXT?
1. We'll notify you when your order is being prepared
2. You'll receive a notification when your delivery is en route
3. Have your ID ready - we verify age on delivery

Questions? Reply to this email or contact info@partyondelivery.com

Party On Delivery
Premium Alcohol Delivery
  `.trim();
}
