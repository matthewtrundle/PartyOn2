/**
 * Premiere Credit Email Template
 *
 * Delivers a single-use POD credit code to a Premiere Party Cruises customer
 * after their cruise refund. The 60-day expiry is stated prominently — twice —
 * per the product decision that customers must clearly understand the deadline.
 */

import { formatCurrency } from '../resend-client';

export interface PremiereCreditEmailData {
  customerName: string;
  code: string;
  amount: number;
  /** Expiry date (60 days from issue). */
  expiresAt: Date;
  /** Where to redeem — the storefront. */
  redeemUrl: string;
}

/** Long-form date for customer-facing copy, e.g. "September 20, 2026". */
function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Chicago',
  }).format(date);
}

/** Minimal HTML escape for interpolated external text (name). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Subject line for the credit email. */
export function premiereCreditSubject(amount: number): string {
  return `Your ${formatCurrency(amount)} Party On Delivery credit from Premiere Party Cruises`;
}

/**
 * Generate the credit email HTML. Styled to match the invoice template (dark
 * header, gold accents) with a prominent code block and expiry callout.
 */
export function generatePremiereCreditEmail(data: PremiereCreditEmailData): string {
  const firstName = escapeHtml(data.customerName.trim().split(/\s+/)[0] || 'there');
  const expiry = formatLongDate(data.expiresAt);
  const amount = formatCurrency(data.amount);
  const code = escapeHtml(data.code);
  const year = new Date().getFullYear();

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
          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px 8px 32px;">
              <p style="margin: 0 0 16px 0; color: #111827; font-size: 18px;">Hi ${firstName},</p>
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Premiere Party Cruises and Party On Delivery have you covered — here is a
                <strong>${amount}</strong> credit toward drinks delivered to your door.
              </p>

              <!-- Code block -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 8px 0;">
                <tr>
                  <td style="background-color: #f3f4f6; border: 2px dashed #9ca3af; border-radius: 8px; padding: 20px; text-align: center;">
                    <p style="margin: 0 0 6px 0; color: #6b7280; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;">Your credit code</p>
                    <p style="margin: 0; color: #111827; font-size: 30px; font-weight: 700; font-family: 'Courier New', Courier, monospace; letter-spacing: 0.06em;">${code}</p>
                  </td>
                </tr>
              </table>

              <!-- Expiry callout (prominent, appears directly under the code) -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 28px 0;">
                <tr>
                  <td style="background-color: #fef9e7; border-left: 4px solid #D4AF37; border-radius: 4px; padding: 14px 18px;">
                    <p style="margin: 0; color: #7c5e10; font-size: 15px; line-height: 1.5;">
                      <strong>This credit expires ${expiry}</strong> — 60 days from today. Use it before then, or it's gone. It's one-time use.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.redeemUrl}" style="display: inline-block; background-color: #D4AF37; color: #1a1a1a; text-decoration: none; font-weight: 700; font-size: 16px; letter-spacing: 0.06em; padding: 15px 40px; border-radius: 8px;">ORDER NOW</a>
                  </td>
                </tr>
              </table>

              <!-- How to redeem -->
              <p style="margin: 0 0 10px 0; color: #111827; font-size: 15px; font-weight: 700;">How to use your credit</p>
              <ol style="margin: 0 0 24px 0; padding-left: 20px; color: #4b5563; font-size: 15px; line-height: 1.7;">
                <li>Add your drinks to the cart at <a href="${data.redeemUrl}" style="color: #0B74B8;">partyondelivery.com</a>.</li>
                <li>Enter code <strong>${code}</strong> at checkout — <strong>${amount}</strong> comes off instantly.</li>
                <li>For the full value, build an order of at least ${amount}; the credit is one-time use and any unused balance is forfeited.</li>
              </ol>

              <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Standard delivery minimums apply. Delivery is available across the Austin area.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 32px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 6px 0; color: #6b7280; font-size: 13px;">
                Reminder: code <strong>${code}</strong> expires <strong>${expiry}</strong>.
              </p>
              <p style="margin: 0 0 6px 0; color: #9ca3af; font-size: 13px;">Questions? Contact us at info@partyondelivery.com</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">${year} Party On Delivery. Austin, Texas.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plaintext fallback. */
export function generatePremiereCreditText(data: PremiereCreditEmailData): string {
  const firstName = data.customerName.trim().split(/\s+/)[0] || 'there';
  const expiry = formatLongDate(data.expiresAt);
  const amount = formatCurrency(data.amount);
  return [
    `Hi ${firstName},`,
    '',
    `Premiere Party Cruises and Party On Delivery have you covered — here is a ${amount} credit toward drinks delivered to your door.`,
    '',
    `Your credit code: ${data.code}`,
    '',
    `THIS CREDIT EXPIRES ${expiry} — 60 days from today. Use it before then. It's one-time use.`,
    '',
    'How to use it:',
    `1. Add your drinks to the cart at ${data.redeemUrl}`,
    `2. Enter code ${data.code} at checkout — ${amount} comes off instantly.`,
    `3. For the full value, build an order of at least ${amount}; any unused balance is forfeited.`,
    '',
    'Standard delivery minimums apply. Delivery is available across the Austin area.',
    '',
    `Reminder: ${data.code} expires ${expiry}.`,
    'Questions? info@partyondelivery.com',
  ].join('\n');
}
