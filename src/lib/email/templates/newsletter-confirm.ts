/**
 * Newsletter double opt-in confirmation email.
 *
 * Sent when someone submits the footer/blog "Subscribe" form. They must click
 * the confirm button before we mark them confirmed and sync them to the CRM —
 * this is what keeps the newsletter list clean and protects deliverability.
 */

const NAVY = '#0A1F33';
const GOLD = '#D4AF37';

export type NewsletterConfirmInput = {
  /** Absolute URL to the confirm endpoint (carries the opt-in token). */
  confirmUrl: string;
};

function escape(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function newsletterConfirmEmail(input: NewsletterConfirmInput): {
  subject: string;
  html: string;
  text: string;
} {
  const url = escape(input.confirmUrl);
  const subject = 'Confirm your Party On Delivery subscription';

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:${NAVY};padding:28px 32px;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:0.08em;">PARTY ON DELIVERY</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h2 style="margin:0 0 12px;font-size:20px;color:${NAVY};">One quick step</h2>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
                  Thanks for subscribing! Tap the button below to confirm you'd like exclusive deals
                  and party-planning tips delivered to your inbox.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background:${GOLD};">
                      <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:bold;color:#1a1a1a;text-decoration:none;letter-spacing:0.06em;">
                        Confirm my subscription
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  If the button doesn't work, copy and paste this link into your browser:<br />
                  <a href="${url}" style="color:${NAVY};word-break:break-all;">${url}</a>
                </p>
                <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  If you didn't sign up, you can safely ignore this email — nothing will happen.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f4f4f5;padding:16px 32px;font-size:12px;color:#9ca3af;">
                Party On Delivery · Austin, TX
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    'Thanks for subscribing to Party On Delivery!',
    '',
    'Please confirm your subscription by opening this link:',
    input.confirmUrl,
    '',
    "If you didn't sign up, you can safely ignore this email.",
  ].join('\n');

  return { subject, html, text };
}
