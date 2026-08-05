/**
 * Event abandoned-cart email.
 *
 * Sent by the event-abandoned-rsvps cron to anyone who:
 *   - RSVPed to an event page
 *   - Started picking drinks (has at least one item in their cart)
 *   - Didn't complete checkout within N minutes
 *
 * Goal: nudge them back so we don't lose the order. Tone is friendly,
 * low-pressure — the party is already locked, we're just helping them
 * not run dry.
 *
 * This renders from data written by an UNAUTHENTICATED endpoint, so every
 * value interpolated into the HTML part is escaped — `resumeUrl` very much
 * included, because it lands in an href and a stray quote there breaks out of
 * the attribute. (Pointing the URL at our own origin is the caller's job; see
 * the cron's resolveSameOriginUrl.)
 *
 * The subject line and the plaintext part are deliberately NOT escaped —
 * neither is an HTML sink, and entities would render literally there.
 */

import { escapeHtml } from '../escape-html';
import { POSTAL_ADDRESS } from '@/lib/followups/copy';

export type AbandonedCartEmailInput = {
  firstName: string;
  eventTitle: string;
  eventDateLine: string; // "Sat, Mar 15 · 7:00 PM"
  eventVenue: string;
  eventAddress: string;
  resumeUrl: string;
  /** CAN-SPAM: preferences page link. Build with buildPreferencesUrl(). */
  unsubscribeUrl: string;
  itemCount: number;
  cartTotal?: number; // optional, only render if known
};

const NAVY = '#0A1F33';
const GOLD = '#D4AF37';

export function eventAbandonedCartEmail(input: AbandonedCartEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const fnPlain = input.firstName || 'there';
  const fn = escapeHtml(fnPlain);
  const title = escapeHtml(input.eventTitle);
  const venue = escapeHtml(input.eventVenue);
  const addr = escapeHtml(input.eventAddress);
  const date = escapeHtml(input.eventDateLine);
  const link = escapeHtml(input.resumeUrl);
  const unsub = escapeHtml(input.unsubscribeUrl);
  const itemNoun = input.itemCount === 1 ? 'item' : 'items';
  const totalStr =
    typeof input.cartTotal === 'number'
      ? ` (${`$${input.cartTotal.toFixed(2)}`})`
      : '';

  // A subject line is a plain-text header, not HTML — escaping here would
  // render a name like "Ben & Jerry" as "Ben &amp; Jerry" in the inbox.
  const subject = `Finish your drink order for ${input.eventTitle}, ${fnPlain} 🍸`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:${NAVY};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(10,15,25,0.06);">
            <tr>
              <td style="background:${NAVY};padding:24px;text-align:center;border-bottom:3px solid ${GOLD};">
                <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${GOLD};">PARTY ON DELIVERY</div>
                <div style="font-size:22px;font-weight:700;color:#FFFFFF;margin-top:6px;">${title}</div>
                <div style="font-size:13px;color:#FFFFFF;opacity:0.85;margin-top:4px;">${date} · ${venue}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px;">
                <p style="margin:0 0 12px;font-size:16px;line-height:1.55;">Hey ${fn},</p>
                <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">
                  You started picking your drinks for <strong>${title}</strong> — we saved your
                  ${input.itemCount} ${itemNoun}${totalStr} but never got the final OK.
                </p>
                <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">
                  Knock it out below — takes 30 seconds. Bottles arrive ice-cold at ${addr}, 30 min
                  before showtime, with your name on the box.
                </p>
                <div style="text-align:center;margin:26px 0;">
                  <a href="${link}" style="display:inline-block;background:${GOLD};color:${NAVY};padding:14px 32px;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:2px;text-decoration:none;">FINISH MY ORDER →</a>
                </div>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#6B7280;">
                  Heads up — orders cut off 24 hours before the party. Don&apos;t be the friend
                  who shows up empty-handed.
                </p>
                <p style="margin:14px 0 0;font-size:13px;color:${NAVY};">— Party On Delivery</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6B7280;">
                  <a href="tel:7373719700" style="color:${NAVY};text-decoration:none;">(737) 371-9700</a>
                  &nbsp;·&nbsp;
                  <a href="https://partyondelivery.com" style="color:${NAVY};text-decoration:none;">partyondelivery.com</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 22px;border-top:1px solid #E5E7EB;text-align:center;">
                <p style="margin:0;font-size:11px;color:#9CA3AF;">
                  You got this because you RSVPed to ${title} and started a drink order.
                </p>
                <p style="margin:6px 0 0;font-size:11px;color:#9CA3AF;">
                  <a href="${unsub}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
                  &nbsp;·&nbsp; Party On Delivery, ${POSTAL_ADDRESS}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  // Plaintext part — deliberately unescaped. HTML entities here would show up
  // literally ("Ben &amp; Jerry") in a text-only client.
  const text = `Hey ${fnPlain},

You started picking your drinks for ${input.eventTitle} — we saved your ${input.itemCount} ${itemNoun}${totalStr} but never got the final OK.

Finish your order: ${input.resumeUrl}

Bottles arrive ice-cold at ${input.eventAddress}, 30 min before showtime, with your name on the box.

Heads up — orders cut off 24 hours before the party.

— Party On Delivery
(737) 371-9700 · partyondelivery.com

You got this because you RSVPed to ${input.eventTitle} and started a drink order.
Unsubscribe: ${input.unsubscribeUrl}
Party On Delivery, ${POSTAL_ADDRESS}`;

  return { subject, html, text };
}
