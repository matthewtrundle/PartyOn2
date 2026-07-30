/**
 * Full Moon Party — ticket confirmation email.
 *
 * Event-voiced replacement for the generic delivery confirmation, sent by the
 * Stripe webhook for event-ticket sessions (`eventTicket=1` metadata) instead
 * of sendOrderConfirmationEmail. Design ported from the approved v5 mockup:
 * dark night-sky card, hero photo, datestamp, marina card, moon / disco-ball /
 * boat motif dividers, tax-INCLUDED receipt, drinks CTA, share CTA.
 *
 * Images are hosted absolute URLs (Gmail strips data URIs). They live in
 * public/images/full-moon/email/ and ship with the same deploy as this file,
 * so the first sendable moment already has them live.
 *
 * All customer-controlled strings (name) are escaped — see the 2026-07-23
 * html-escaping incident notes.
 */
import { EVENT, LOCATION, TICKET_TAX_RATE, ticketTotals } from '@/components/full-moon/event';
import { escapeHtml } from '../escape-html';

const BASE = 'https://partyondelivery.com';
const IMG = `${BASE}/images/full-moon/email`;

/** Everything the template needs; amounts in dollars. */
export interface FullMoonTicketData {
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  /** Ticket quantity on the order. */
  quantity: number;
  /** Gross charge (flat price × qty — what the card was charged). */
  total: number;
  /** Included Texas sales tax recorded on the order. */
  taxAmount: number;
}

/** First name for the headline; falls back to a very Texan plural. */
function firstName(name: string): string {
  const first = (name || '').trim().split(/\s+/)[0] || '';
  return first ? escapeHtml(first) : "y'all";
}

const money = (n: number): string => `$${n.toFixed(2)}`;

/** Shared inline-style fragments (email clients ignore <style> blocks). */
const F_HEAD = "font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif";
const F_BODY = 'font-family:Helvetica,Arial,sans-serif';
const CELL = 'background-color:#131c3f; border:1px solid #24305c; border-radius:8px;';
const LABEL = `margin:0; ${F_BODY}; font-size:11px; letter-spacing:2px; color:#8fa3cc; text-transform:uppercase;`;
const BIG = `margin:6px 0 0; ${F_HEAD}; font-size:24px; font-weight:700; color:#eaf2ff;`;

function stampCell(label: string, value: string): string {
  return `<td width="33%" align="center" style="${CELL} padding:14px 6px;">
    <p style="${LABEL}">${label}</p>
    <p style="${BIG}">${value}</p>
  </td>`;
}

function divider(img: string, width: number, lines: boolean): string {
  const side = lines ? 'border-top:1px solid #24305c;' : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
    <tr>
      <td style="${side} font-size:0; line-height:0;">&nbsp;</td>
      <td width="${width + 24}" align="center" style="padding:8px 10px;">
        <img src="${img}" alt="" width="${width}" style="display:block; width:${width}px; height:auto;" />
      </td>
      <td style="${side} font-size:0; line-height:0;">&nbsp;</td>
    </tr>
  </table>`;
}

/** Render the HTML body. */
export function generateFullMoonTicketEmail(data: FullMoonTicketData): string {
  const name = firstName(data.customerName);
  const qty = Math.max(1, Math.floor(data.quantity));
  const ratePct = `${(TICKET_TAX_RATE * 100).toFixed(2).replace(/\.?0+$/, '')}%`;
  const drinksUrl = `${BASE}/order?utm_source=email&utm_medium=transactional&utm_campaign=full-moon-aug28`;
  const shareUrl = `${EVENT.shareUrl}?utm_source=email&utm_medium=transactional&utm_campaign=full-moon-aug28-share`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0; padding:0; background-color:#070a1c;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    You&rsquo;re on the boat &mdash; ${EVENT.dateLabel}, cast off ${EVENT.castOff}. Taco bar included. Order your drinks ahead &rarr;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070a1c;">
    <tr><td align="center" style="padding:32px 12px 48px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:100%;">

        <tr><td align="center" style="padding:0 0 18px;">
          <img src="${IMG}/logo-glow.png" alt="Party On Delivery" width="120" style="display:block; width:120px; height:auto;" />
        </td></tr>

        <tr><td style="border-radius:12px 12px 0 0; overflow:hidden;">
          <img src="${IMG}/hero.jpg" alt="A crowd dancing on a party boat deck as a full moon rises over Lake Travis" width="600" style="display:block; width:100%; height:auto; border-radius:12px 12px 0 0;" />
        </td></tr>

        <tr><td style="background-color:#0d142e; border-radius:0 0 12px 12px; padding:36px 36px 40px;">

          <p style="margin:0 0 6px; ${F_HEAD}; font-size:14px; letter-spacing:3px; color:#22d3ee; text-transform:uppercase;">Ticket confirmed</p>
          <h1 style="margin:0 0 14px; ${F_HEAD}; font-weight:700; font-size:44px; line-height:0.98; letter-spacing:2px; text-transform:uppercase;">
            <span style="color:#eaf2ff;">You&rsquo;re on</span><br />
            <span style="color:#22d3ee;">the boat, ${name}</span>
          </h1>
          <p style="margin:0 0 28px; ${F_BODY}; font-size:16px; line-height:1.6; color:#c7d2ea;">
            Your ${qty > 1 ? `${qty} spots` : 'spot'} on the <strong style="color:#eaf2ff;">Lake Travis Full Moon Party</strong> ${qty > 1 ? 'are' : 'is'} locked in.
            August 28 is the real full moon &mdash; it comes up over the water while we&rsquo;re out there.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
            <tr>
              ${stampCell('The date', EVENT.dateLabel)}
              <td width="8" style="font-size:0; line-height:0;">&nbsp;</td>
              ${stampCell('Cast off', EVENT.castOff)}
              <td width="8" style="font-size:0; line-height:0;">&nbsp;</td>
              ${stampCell('Back at dock', EVENT.backAtDock)}
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
            <tr><td align="center" style="${CELL} padding:16px 18px;">
              <p style="${LABEL}">Where we board</p>
              <p style="margin:6px 0 2px; ${F_HEAD}; font-size:22px; font-weight:700; color:#eaf2ff;">${LOCATION.name}</p>
              <p style="margin:0 0 8px; ${F_BODY}; font-size:14px; color:#c7d2ea;">
                <a href="https://maps.google.com/?q=${encodeURIComponent(LOCATION.address)}" style="color:#22d3ee; text-decoration:underline;">${LOCATION.address}</a>
              </p>
              <p style="margin:0; ${F_BODY}; font-size:13px; line-height:1.5; color:#8fa3cc;">
                Exact dock + a pin drop go out by text two days before the cruise.<br />Please arrive 15 minutes before cast-off.
              </p>
            </td></tr>
          </table>

          ${divider(`${IMG}/moon.png`, 52, true)}

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px; border-bottom:2px dashed #2b3763;">
            <tr><td style="padding:6px 4px 4px;">
              <p style="margin:0 0 10px; ${F_BODY}; font-size:12px; letter-spacing:2px; color:#8fa3cc; text-transform:uppercase;">Order #${data.orderNumber} &middot; General Admission &times; ${qty}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${F_BODY}; font-size:14px; color:#c7d2ea;">
                <tr>
                  <td style="padding:3px 0;">Ticket &times; ${qty}</td>
                  <td align="right" style="padding:3px 0;">${money(data.total)}</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:12px; color:#8fa3cc;">Includes Texas sales tax (${ratePct})</td>
                  <td align="right" style="padding:3px 0; font-size:12px; color:#8fa3cc;">${money(data.taxAmount)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0 8px; font-size:16px; font-weight:700; color:#eaf2ff;">Paid</td>
                  <td align="right" style="padding:10px 0 8px; font-size:16px; font-weight:700; color:#eaf2ff;">${money(data.total)}</td>
                </tr>
              </table>
              <p style="margin:0 0 12px; ${F_BODY}; font-size:12px; line-height:1.5; color:#8fa3cc;">
                Can&rsquo;t make it? Tickets are transferable &mdash; reply with your friend&rsquo;s name (25+) and we&rsquo;ll swap the guest list.
              </p>
            </td></tr>
          </table>

          ${divider(`${IMG}/discoball.png`, 54, false)}

          <p style="margin:0 0 10px; ${F_HEAD}; font-size:22px; font-weight:700; letter-spacing:1.5px; color:#eaf2ff; text-transform:uppercase; text-align:center;">What&rsquo;s on board</p>
          <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 26px; ${F_BODY}; font-size:14px; line-height:1.7; color:#c7d2ea;">
            <tr><td style="color:#22d3ee; padding-right:10px;">&#8226;</td><td>A four-hour cruise with captain &amp; crew</td></tr>
            <tr><td style="color:#22d3ee; padding-right:10px;">&#8226;</td><td>A full taco bar &mdash; included with your ticket</td></tr>
            <tr><td style="color:#22d3ee; padding-right:10px;">&#8226;</td><td>Smooth beats by DJ Trey</td></tr>
            <tr><td style="color:#22d3ee; padding-right:10px;">&#8226;</td><td>Water, ice &amp; cups &middot; life jackets &amp; floats</td></tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td style="${CELL} padding:22px 24px;">
              <p style="margin:0 0 6px; ${F_HEAD}; font-size:22px; font-weight:700; letter-spacing:1.5px; color:#eaf2ff; text-transform:uppercase;">One thing left: your drinks</p>
              <p style="margin:0 0 16px; ${F_BODY}; font-size:14px; line-height:1.6; color:#c7d2ea;">
                The cruise is BYOB &mdash; bring your own from any store you like. Easiest: order beer, wine, spirits &amp; mixers
                from us and we&rsquo;ll have them <strong style="color:#eaf2ff;">iced in a cooler waiting at the dock</strong>, loaded at cast off.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr><td style="background-color:#F2D34F; border-radius:8px;">
                  <a href="${drinksUrl}" style="display:inline-block; padding:13px 26px; ${F_BODY}; font-size:15px; font-weight:700; letter-spacing:1px; color:#111827; text-decoration:none; text-transform:uppercase;">Order your drinks</a>
                </td></tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:0 0 6px; ${F_HEAD}; font-size:22px; font-weight:700; letter-spacing:1.5px; color:#eaf2ff; text-transform:uppercase;">Bring your people</p>
          <p style="margin:0 0 16px; ${F_BODY}; font-size:14px; line-height:1.6; color:#c7d2ea;">
            We sail at ${EVENT.minimum} and the boat holds ${EVENT.capacity} &mdash; send the invite and fill the deck.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 30px;">
            <tr><td style="border:2px solid #22d3ee; border-radius:8px;">
              <a href="${shareUrl}" style="display:inline-block; padding:11px 24px; ${F_BODY}; font-size:15px; font-weight:700; letter-spacing:1px; color:#22d3ee; text-decoration:none; text-transform:uppercase;">Share the night</a>
            </td></tr>
          </table>

          <p style="margin:0 0 10px; ${F_BODY}; font-size:13px; line-height:1.6; color:#8fa3cc;">
            <strong style="color:#c7d2ea;">The promise:</strong> if we&rsquo;re short of ${EVENT.minimum} guests seven days out, the cruise rolls to the
            next full moon and your ticket is refunded in full, automatically. If the captain calls off for weather,
            you choose the next date or a full refund.
          </p>
          <p style="margin:0; ${F_BODY}; font-size:13px; line-height:1.6; color:#8fa3cc;">
            <strong style="color:#c7d2ea;">Very important:</strong> if you&rsquo;ll be drinking, have a plan to get home.
            Coming with a group? We recommend <a href="https://www.fetii.com" style="color:#22d3ee;">Fetii</a> &mdash; code
            <strong style="color:#eaf2ff;">PartyOn</strong> for 25% off.
          </p>
        </td></tr>

        <tr><td align="center" style="padding:24px 24px 0;">
          <img src="${IMG}/boat.png" alt="" width="86" style="display:block; width:86px; height:auto; margin:0 auto 10px;" />
          <p style="margin:0 0 4px; ${F_HEAD}; font-size:15px; letter-spacing:2px; color:#8fa3cc; text-transform:uppercase;">A Party On Delivery event &middot; on the water with Premier Party Cruises</p>
          <p style="margin:0 0 10px; ${F_BODY}; font-size:12px; color:#5c6c93;">Lake Travis &middot; Austin, TX &middot; Questions? Reply to this email or write <a href="mailto:info@partyondelivery.com" style="color:#8fa3cc;">info@partyondelivery.com</a></p>
          <p style="margin:0; ${F_BODY}; font-size:11px; line-height:1.6; color:#5c6c93;">
            <a href="${BASE}/full-moon-terms" style="color:#5c6c93; text-decoration:underline;">Event terms</a>
            &middot; &copy; 2026 Party On Delivery LLC &middot; Adults 25+ only &middot; Drink responsibly
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Plain-text alternative. */
export function generateFullMoonTicketText(data: FullMoonTicketData): string {
  const qty = Math.max(1, Math.floor(data.quantity));
  return [
    `YOU'RE ON THE BOAT — Lake Travis Full Moon Party`,
    '',
    `Order #${data.orderNumber} · General Admission × ${qty}`,
    `Paid ${money(data.total)} (includes ${money(data.taxAmount)} Texas sales tax)`,
    '',
    `${EVENT.dateLabel} · Cast off ${EVENT.castOff} · Back at dock ${EVENT.backAtDock}`,
    `Board at ${LOCATION.name}, ${LOCATION.address}.`,
    'Exact dock + pin drop by text two days before. Arrive 15 minutes early.',
    '',
    "What's on board: four-hour cruise with captain & crew, full taco bar,",
    'DJ Trey, water/ice/cups, life jackets.',
    '',
    "Drinks are BYOB — bring your own from any store, or order from Party On",
    `Delivery and we'll have them iced at the dock: ${BASE}/order`,
    '',
    `We sail at ${EVENT.minimum}; the boat holds ${EVENT.capacity}. Short ${EVENT.deadlineDays} days out -> rolls to the`,
    'next full moon and every ticket is refunded automatically.',
    '',
    `Bring your people: ${EVENT.shareUrl}`,
    `Event terms: ${BASE}/full-moon-terms`,
    '',
    'If you drink, plan your ride home. Fetii code PartyOn = 25% off.',
    'Party On Delivery · Lake Travis · Austin, TX · Adults 25+',
  ].join('\n');
}

/** Amounts helper for callers that only know qty (server recomputes anyway). */
export function fullMoonTicketAmounts(quantity: number): { total: number; taxAmount: number } {
  const { total, tax } = ticketTotals(quantity);
  return { total, taxAmount: tax };
}
