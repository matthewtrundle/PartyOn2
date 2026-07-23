/**
 * Invoice Email Template
 * Sent when an admin sends a draft order invoice to a customer
 */

import { formatCurrency, formatDate } from '../resend-client';
import { escapeHtml } from '../escape-html';

interface InvoiceItem {
  title: string;
  variantTitle?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

export interface InvoiceEmailData {
  customerName: string;
  deliveryDate: Date | string;
  deliveryTime: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryZip: string;
  items: InvoiceItem[];
  subtotal: number | string | { toString(): string };
  taxAmount: number | string | { toString(): string };
  deliveryFee: number | string | { toString(): string };
  discountAmount: number | string | { toString(): string };
  discountCode?: string | null;
  total: number | string | { toString(): string };
  invoiceUrl: string;
  personalNote?: string;
}

export interface InvoiceTextOverrides {
  greeting?: string;
  bodyText?: string;
  buttonText?: string;
  linkText?: string;
  footerText?: string;
  copyrightText?: string;
}

export const INVOICE_TEXT_DEFAULTS: Required<InvoiceTextOverrides> = {
  greeting: 'Hi {customerName},',
  bodyText: "Here's your invoice for your upcoming delivery. Click the button below to complete your payment.",
  buttonText: 'PAY NOW',
  linkText: 'Or copy this link:',
  footerText: 'Questions? Contact us at info@partyondelivery.com',
  copyrightText: '{year} Party On Delivery. Austin, Texas.',
};

/**
 * Generate invoice email HTML
 */
export function generateInvoiceEmail(data: InvoiceEmailData, textOverrides?: InvoiceTextOverrides): string {
  const deliveryDate = formatDate(data.deliveryDate);

  // Merge defaults with overrides and replace placeholders
  const text = { ...INVOICE_TEXT_DEFAULTS, ...textOverrides };
  // HTML-escape the customer name before it enters the greeting (rendered into
  // the HTML body). sanitizeName upstream strips control chars but not `<`/`>`/`&`.
  const firstName = escapeHtml(data.customerName.trim().split(/\s+/)[0]);
  const greeting = text.greeting.replace('{customerName}', firstName);
  const bodyText = text.bodyText;
  const buttonText = text.buttonText;
  const linkText = text.linkText;
  const footerText = text.footerText;
  const copyrightText = text.copyrightText.replace('{year}', String(new Date().getFullYear()));

  const personalNoteHtml = data.personalNote
    ? `
              <div style="background-color: #fef9e7; border-left: 4px solid #D4AF37; border-radius: 4px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6; font-style: italic;">
                  ${escapeHtml(data.personalNote).replace(/\n/g, '<br>')}
                </p>
              </div>`
    : '';

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; width: 48px; vertical-align: middle;">
          ${item.imageUrl
            ? `<img src="${item.imageUrl}" alt="" width="40" height="40" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; display: block;" />`
            : `<div style="width: 40px; height: 40px; background-color: #f3f4f6; border-radius: 6px;"></div>`}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
          <strong>${escapeHtml(item.title)}</strong>
          ${item.variantTitle ? `<br><span style="color: #666; font-size: 14px;">${escapeHtml(item.variantTitle)}</span>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">
          ${formatCurrency(item.price * item.quantity)}
          ${item.quantity > 1 ? `<br><span style="color: #9ca3af; font-size: 12px;">${formatCurrency(item.price)} each</span>` : ''}
        </td>
      </tr>
    `
    )
    .join('');

  const discountHtml =
    Number(data.discountAmount) > 0
      ? `
                <tr>
                  <td style="padding: 8px 0; color: #059669;">Discount${data.discountCode ? ` (${data.discountCode})` : ''}</td>
                  <td style="padding: 8px 0; text-align: right; color: #059669;">-${formatCurrency(Number(data.discountAmount))}</td>
                </tr>
                `
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

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 24px;">
                ${greeting}
              </h2>
              <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                ${bodyText.replace(/\n/g, '<br>')}
              </p>

              ${personalNoteHtml}

              <!-- Delivery Info -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 18px;">
                  Delivery Details
                </h3>
                <p style="margin: 0 0 4px; color: #4b5563; font-size: 14px;">
                  <strong>Date:</strong> ${deliveryDate}
                </p>
                <p style="margin: 0 0 4px; color: #4b5563; font-size: 14px;">
                  <strong>Time:</strong> ${data.deliveryTime}
                </p>
                <p style="margin: 0; color: #4b5563; font-size: 14px;">
                  <strong>Address:</strong> ${escapeHtml(data.deliveryAddress)}, ${escapeHtml(data.deliveryCity)}, ${escapeHtml(data.deliveryState)} ${escapeHtml(data.deliveryZip)}
                </p>
              </div>

              <!-- Order Items -->
              <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 18px;">
                Order Items
              </h3>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; border-bottom: 1px solid #e5e5e5; width: 48px;"></th>
                    <th style="padding: 12px; text-align: left; font-size: 14px; color: #666; border-bottom: 1px solid #e5e5e5;">
                      Item
                    </th>
                    <th style="padding: 12px; text-align: center; font-size: 14px; color: #666; border-bottom: 1px solid #e5e5e5;">
                      Qty
                    </th>
                    <th style="padding: 12px; text-align: right; font-size: 14px; color: #666; border-bottom: 1px solid #e5e5e5;">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Order Total -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td style="padding: 8px 0; color: #4b5563;">Subtotal</td>
                  <td style="padding: 8px 0; text-align: right; color: #4b5563;">${formatCurrency(Number(data.subtotal))}</td>
                </tr>
                ${discountHtml}
                <tr>
                  <td style="padding: 8px 0; color: #4b5563;">Sales Tax</td>
                  <td style="padding: 8px 0; text-align: right; color: #4b5563;">${formatCurrency(Number(data.taxAmount))}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4b5563;">Delivery Fee</td>
                  <td style="padding: 8px 0; text-align: right; color: #4b5563;">${formatCurrency(Number(data.deliveryFee))}</td>
                </tr>
                <tr>
                  <td style="padding: 16px 0 0; color: #1a1a1a; font-size: 18px; font-weight: 600; border-top: 2px solid #e5e7eb;">Total</td>
                  <td style="padding: 16px 0 0; text-align: right; color: #1a1a1a; font-size: 18px; font-weight: 600; border-top: 2px solid #e5e7eb;">${formatCurrency(Number(data.total))}</td>
                </tr>
              </table>

              <!-- Pay Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${data.invoiceUrl}" style="display: inline-block; background-color: #D4AF37; color: #1a1a1a; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: 600; border-radius: 8px; letter-spacing: 0.05em;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                ${linkText} <a href="${data.invoiceUrl}" style="color: #D4AF37;">${data.invoiceUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px 32px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 8px; color: #D4AF37; font-size: 14px;">
                ${footerText}
              </p>
              <p style="margin: 0; color: #666; font-size: 12px;">
                &copy; ${copyrightText}
              </p>
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
 * Generate invoice email subject line
 */
export function generateInvoiceSubject(total: number | string): string {
  return `Your Invoice from Party On Delivery - ${formatCurrency(total)}`;
}
