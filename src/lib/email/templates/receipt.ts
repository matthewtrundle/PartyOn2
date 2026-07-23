/**
 * Receipt Email Template
 * Sent to confirm payment has been received for a completed order
 */

import { formatCurrency, formatDate } from '../resend-client';
import { escapeHtml } from '../escape-html';

interface ReceiptItem {
  title: string;
  variantTitle?: string | null;
  quantity: number;
  price: number | string | { toString(): string };
}

export interface ReceiptEmailData {
  orderNumber: number | string;
  customerName: string;
  customerEmail: string;
  deliveryDate: Date | string;
  deliveryTime: string;
  deliveryAddress: string;
  items: ReceiptItem[];
  subtotal: number | string | { toString(): string };
  taxAmount: number | string | { toString(): string };
  deliveryFee: number | string | { toString(): string };
  discountAmount?: number | string | { toString(): string };
  discountCode?: string | null;
  total: number | string | { toString(): string };
  paymentDate: string;
  transactionId?: string | null;
}

export function generateReceiptEmail(data: ReceiptEmailData): string {
  const deliveryDate = formatDate(data.deliveryDate);

  const itemsHtml = data.items
    .map((item) => {
      const price = Number(item.price);
      const lineTotal = price * item.quantity;
      return `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; color: #1a1a1a;">
          <strong>${escapeHtml(item.title)}</strong>
          ${item.variantTitle ? `<br><span style="color: #6b7280; font-size: 13px;">${escapeHtml(item.variantTitle)}</span>` : ''}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; text-align: center; color: #4b5563;">${item.quantity}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; text-align: right; color: #1a1a1a;">
          ${formatCurrency(lineTotal)}
          ${item.quantity > 1 ? `<br><span style="color: #9ca3af; font-size: 12px;">${formatCurrency(price)} each</span>` : ''}
        </td>
      </tr>`;
    })
    .join('');

  const discountAmt = Number(data.discountAmount || 0);
  const discountHtml =
    discountAmt > 0
      ? `
                <tr>
                  <td style="padding: 6px 0; color: #059669; font-size: 14px;">Discount${data.discountCode ? ` (${data.discountCode})` : ''}</td>
                  <td style="padding: 6px 0; text-align: right; color: #059669; font-size: 14px;">-${formatCurrency(discountAmt)}</td>
                </tr>`
      : '';

  const transactionHtml = data.transactionId
    ? `Transaction ID: ${data.transactionId}<br>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="https://partyondelivery.com/images/pod-logo-2025.png" alt="Party On Delivery" width="180" style="width: 180px; max-width: 100%; height: auto; margin-bottom: 12px;" />
              <p style="color: #ffffff; margin: 0; font-size: 14px; letter-spacing: 0.05em;">PREMIUM ALCOHOL DELIVERY</p>
            </td>
          </tr>

          <!-- PAID Badge -->
          <tr>
            <td style="padding: 32px 32px 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 4px; color: #1a1a1a; font-size: 24px;">Receipt</h2>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Order #${data.orderNumber}</p>
                  </td>
                  <td align="right" valign="top">
                    <div style="display: inline-block; background-color: #059669; color: #ffffff; font-weight: 700; font-size: 14px; padding: 6px 16px; border-radius: 4px; letter-spacing: 0.05em;">PAID</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 24px 32px 32px;">
              <p style="margin: 0 0 24px; color: #4b5563; font-size: 15px; line-height: 1.6;">
                Thank you for your order. This receipt confirms that payment has been received in full.
              </p>

              <!-- Customer & Delivery Info -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td width="50%" valign="top" style="padding-right: 12px;">
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
                      <h4 style="margin: 0 0 8px; color: #1a1a1a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Billed To</h4>
                      <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;">
                        ${escapeHtml(data.customerName)}<br>
                        ${escapeHtml(data.customerEmail)}
                      </p>
                    </div>
                  </td>
                  <td width="50%" valign="top" style="padding-left: 12px;">
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
                      <h4 style="margin: 0 0 8px; color: #1a1a1a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Delivered To</h4>
                      <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;">
                        ${escapeHtml(data.deliveryAddress)}<br>
                        ${deliveryDate}<br>
                        ${data.deliveryTime}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Payment Info -->
              <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td>
                      <p style="margin: 0 0 4px; color: #166534; font-size: 14px; font-weight: 600;">Payment Received</p>
                      <p style="margin: 0; color: #4b5563; font-size: 13px;">${data.paymentDate} via credit card</p>
                    </td>
                    <td align="right" valign="middle">
                      <p style="margin: 0; color: #166534; font-size: 20px; font-weight: 700;">${formatCurrency(Number(data.total))}</p>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Order Items -->
              <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 16px;">Items</h3>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 10px 16px; text-align: left; font-size: 13px; color: #6b7280; border-bottom: 1px solid #e5e5e5;">Item</th>
                    <th style="padding: 10px 16px; text-align: center; font-size: 13px; color: #6b7280; border-bottom: 1px solid #e5e5e5;">Qty</th>
                    <th style="padding: 10px 16px; text-align: right; font-size: 13px; color: #6b7280; border-bottom: 1px solid #e5e5e5;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Totals -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 0; color: #4b5563; font-size: 14px;">Subtotal</td>
                  <td style="padding: 6px 0; text-align: right; color: #4b5563; font-size: 14px;">${formatCurrency(Number(data.subtotal))}</td>
                </tr>
                ${discountHtml}
                <tr>
                  <td style="padding: 6px 0; color: #4b5563; font-size: 14px;">Sales Tax (8.25%)</td>
                  <td style="padding: 6px 0; text-align: right; color: #4b5563; font-size: 14px;">${formatCurrency(Number(data.taxAmount))}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #4b5563; font-size: 14px;">Delivery Fee</td>
                  <td style="padding: 6px 0; text-align: right; color: #4b5563; font-size: 14px;">${formatCurrency(Number(data.deliveryFee))}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 0 0; color: #1a1a1a; font-size: 18px; font-weight: 700; border-top: 2px solid #e5e7eb;">Total Paid</td>
                  <td style="padding: 14px 0 0; text-align: right; color: #1a1a1a; font-size: 18px; font-weight: 700; border-top: 2px solid #e5e7eb;">${formatCurrency(Number(data.total))}</td>
                </tr>
              </table>

              <!-- Business Info -->
              <div style="border-top: 1px solid #e5e5e5; padding-top: 20px; margin-top: 8px;">
                <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                  <strong style="color: #6b7280;">Party On Delivery LLC</strong><br>
                  Austin, Texas<br>
                  info@partyondelivery.com | (512) 934-1615<br>
                  ${transactionHtml}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px 32px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 8px; color: #D4AF37; font-size: 14px;">Thank you for choosing Party On Delivery</p>
              <p style="margin: 0; color: #666; font-size: 12px;">&copy; ${new Date().getFullYear()} Party On Delivery. Austin, Texas.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function generateReceiptSubject(orderNumber: number | string): string {
  return `Receipt - Order #${orderNumber} - Party On Delivery`;
}
