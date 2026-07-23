/**
 * Order Cancellation Email Template
 */

import { escapeHtml } from '../escape-html';

export interface OrderCancellationData {
  customerName: string;
  orderNumber: number;
  total: number;
  customNote?: string;
  refundIssued?: boolean;
  refundAmount?: number;
  items: { title: string; quantity: number; price: number }[];
  deliveryDate?: string;
}

const CUSTOM_NOTE_MARKER = '<!--CUSTOM_NOTE-->';

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function renderCustomNote(note?: string): string {
  if (!note) return CUSTOM_NOTE_MARKER;
  const escaped = note
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  return `
              <div style="background-color: #f9fafb; border-left: 4px solid #D4AF37; border-radius: 4px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 0 0 4px; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Note from Party On Delivery</p>
                <p style="margin: 0; font-size: 14px; color: #1a1a1a; line-height: 1.5;">${escaped}</p>
              </div>`;
}

export function generateOrderCancellationEmail(data: OrderCancellationData): string {
  const { customerName, orderNumber, total, customNote, refundIssued, refundAmount, items, deliveryDate } = data;

  const itemRows = items.map(item => `
                    <tr>
                      <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; border-bottom: 1px solid #f3f4f6;">${escapeHtml(item.title)}</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #666; text-align: center; border-bottom: 1px solid #f3f4f6;">${item.quantity}</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; text-align: right; border-bottom: 1px solid #f3f4f6;">${formatCurrency(item.price * item.quantity)}</td>
                    </tr>`).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Cancelled - Party On Delivery</title>
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

          <!-- Red Banner -->
          <tr>
            <td style="background-color: #fef2f2; padding: 24px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h2 style="margin: 0; color: #991b1b; font-size: 24px;">Order Cancelled</h2>
              <p style="margin: 8px 0 0; color: #991b1b; font-size: 14px;">Order #${orderNumber}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #1a1a1a;">
                Hi ${escapeHtml(customerName)},
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; color: #666;">
                Your order <strong>#${orderNumber}</strong>${deliveryDate ? ` scheduled for ${deliveryDate}` : ''} has been cancelled.
              </p>

              ${renderCustomNote(customNote)}

              <!-- Order Summary -->
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
                <div style="background-color: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">Cancelled Items</p>
                </div>
                <table width="100%" cellpadding="0" cellspacing="0" style="padding: 0 16px;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb;">Item</td>
                    <td style="padding: 8px 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; border-bottom: 1px solid #e5e7eb;">Qty</td>
                    <td style="padding: 8px 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; text-align: right; border-bottom: 1px solid #e5e7eb;">Total</td>
                  </tr>
                  ${itemRows}
                  <tr>
                    <td colspan="2" style="padding: 12px 0 8px; font-size: 14px; font-weight: 600; color: #1a1a1a;">Order Total</td>
                    <td style="padding: 12px 0 8px; font-size: 14px; font-weight: 600; color: #1a1a1a; text-align: right;">${formatCurrency(total)}</td>
                  </tr>
                </table>
              </div>

              ${refundIssued ? `
              <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center;">
                <p style="margin: 0; color: #166534; font-size: 14px;">Refund Amount</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">${formatCurrency(refundAmount || total)}</p>
              </div>
              <p style="margin: 0 0 16px; font-size: 14px; color: #666;">
                If a refund has been issued, it will appear on your original payment method within 5-10 business days.
              </p>
              ` : ''}

              <p style="margin: 16px 0 0; font-size: 14px; color: #666;">
                If you have any questions about this cancellation, please don't hesitate to reach out.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px; text-align: center;">
              <p style="margin: 0; color: #D4AF37; font-size: 14px;">Questions about your order?</p>
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
}

export function generateOrderCancellationText(data: OrderCancellationData): string {
  const { customerName, orderNumber, total, customNote, refundIssued, refundAmount, items, deliveryDate } = data;

  const itemLines = items.map(item => `  - ${item.title} x${item.quantity}: ${formatCurrency(item.price * item.quantity)}`).join('\n');

  return `
PARTY ON DELIVERY
Order Cancelled

Hi ${customerName},

Your order #${orderNumber}${deliveryDate ? ` scheduled for ${deliveryDate}` : ''} has been cancelled.

${customNote ? `Note: ${customNote}\n` : ''}Cancelled Items:
${itemLines}

Order Total: ${formatCurrency(total)}
${refundIssued ? `\nRefund Amount: ${formatCurrency(refundAmount || total)}\nPlease allow 5-10 business days for the refund to appear on your original payment method.\n` : ''}
If you have any questions, reply to this email or contact support@partyondelivery.com

Party On Delivery
Premium Alcohol Delivery
  `.trim();
}
