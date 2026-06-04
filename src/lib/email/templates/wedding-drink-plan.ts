/**
 * Wedding drink plan email.
 *
 * Sent immediately when someone submits the lead-capture form on the public
 * /wedding-drink-calculator page. Delivers the personalized shopping list
 * (the calculator output) plus a delivery-quote CTA pointing at /order.
 *
 * Visual matches the other transactional emails: navy + gold header, simple
 * body, single primary CTA. Shopping list is grouped by category.
 */

export type WeddingDrinkPlanItem = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
};

export type WeddingDrinkPlanEmailInput = {
  firstName: string;
  guests: number;
  hours: number;
  totalDrinks: number;
  partyType: 'wedding' | 'bachelor' | 'bachelorette';
  items: ReadonlyArray<WeddingDrinkPlanItem>;
};

const NAVY = '#0A1F33';
const GOLD = '#D4AF37';
const ORDER_URL =
  'https://partyondelivery.com/order?type=wedding&utm_source=email&utm_medium=wedding-calc&utm_campaign=lead-capture';

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function titleCaseCategory(cat: string): string {
  return cat
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function groupByCategory(
  items: ReadonlyArray<WeddingDrinkPlanItem>,
): Array<{ category: string; rows: WeddingDrinkPlanItem[] }> {
  const map = new Map<string, WeddingDrinkPlanItem[]>();
  for (const item of items) {
    const arr = map.get(item.category) ?? [];
    arr.push(item);
    map.set(item.category, arr);
  }
  return Array.from(map.entries()).map(([category, rows]) => ({ category, rows }));
}

/**
 * Render the wedding-drink-plan email. Returns subject + html + text bodies
 * ready to pass to the Resend sendEmail wrapper.
 */
export function weddingDrinkPlanEmail(
  input: WeddingDrinkPlanEmailInput,
): { subject: string; html: string; text: string } {
  const fn = escape(input.firstName || 'there');
  const eventLabel =
    input.partyType === 'wedding'
      ? 'wedding'
      : input.partyType === 'bachelor'
        ? 'bachelor party'
        : 'bachelorette party';
  const groups = groupByCategory(input.items);

  const subject = `Your ${eventLabel} bar plan — ${input.totalDrinks.toLocaleString()} drinks for ${input.guests} guests`;

  const listHtml = groups
    .map(
      (g) => `
              <tr>
                <td style="padding:14px 0 6px;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:${NAVY};text-transform:uppercase;">${escape(titleCaseCategory(g.category))}</div>
                </td>
              </tr>
              ${g.rows
                .map(
                  (item) => `
              <tr>
                <td style="padding:6px 0;border-bottom:1px solid #E5E7EB;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:15px;color:${NAVY};">${escape(item.name)}</td>
                      <td style="font-size:15px;color:${NAVY};font-weight:600;text-align:right;white-space:nowrap;padding-left:8px;">${item.quantity} ${escape(item.unit)}${item.quantity > 1 ? 's' : ''}</td>
                    </tr>
                  </table>
                </td>
              </tr>`,
                )
                .join('')}`,
    )
    .join('');

  const listText = groups
    .map((g) => {
      const lines = g.rows
        .map(
          (item) =>
            `  - ${item.name} — ${item.quantity} ${item.unit}${item.quantity > 1 ? 's' : ''}`,
        )
        .join('\n');
      return `${titleCaseCategory(g.category)}:\n${lines}`;
    })
    .join('\n\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:${NAVY};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(10,15,25,0.06);">
            <tr>
              <td style="background:${NAVY};padding:28px 24px;text-align:center;border-bottom:3px solid ${GOLD};">
                <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${GOLD};">PARTY ON DELIVERY · AUSTIN</div>
                <div style="font-size:24px;font-weight:700;color:#FFFFFF;margin-top:6px;letter-spacing:0.5px;">Your ${escape(eventLabel)} bar plan</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 8px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:${NAVY};">Hey ${fn},</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.55;color:${NAVY};">
                  Here&apos;s the shopping list our calculator built for you. ${input.guests} guests over ${input.hours} hours
                  works out to about <strong>${input.totalDrinks.toLocaleString()} drinks</strong>. Below is how to split them
                  across beer, wine, spirits, and seltzers.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;border:1px solid #E5E7EB;border-radius:10px;padding:18px 20px;margin:0 0 22px;">
                  <tr>
                    <td>
                      ${listHtml}
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${NAVY};">
                  Want this delivered iced, set up, and ready before guests arrive? Click below for a free
                  delivery quote — we&apos;ll review the list with you, swap brands or tweak quantities, and
                  confirm the delivery window.
                </p>

                <div style="text-align:center;margin:24px 0;">
                  <a href="${ORDER_URL}" style="display:inline-block;background:${GOLD};color:${NAVY};padding:14px 32px;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:2px;text-decoration:none;">START WEDDING ORDER →</a>
                </div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E5E7EB;padding-top:18px;margin-top:6px;">
                  <tr>
                    <td style="padding-top:10px;">
                      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:${NAVY};text-transform:uppercase;margin-bottom:8px;">Why Party On</div>
                      <p style="margin:0 0 6px;font-size:14px;line-height:1.55;color:#374151;">· Free delivery to Austin-area venues, iced and stocked</p>
                      <p style="margin:0 0 6px;font-size:14px;line-height:1.55;color:#374151;">· Cooler, ice, cups, and glassware included</p>
                      <p style="margin:0 0 6px;font-size:14px;line-height:1.55;color:#374151;">· Returns on unopened bottles after the event</p>
                      <p style="margin:0 0 6px;font-size:14px;line-height:1.55;color:#374151;">· TABC-licensed · $1M insured · 500+ Austin weddings since 2022</p>
                    </td>
                  </tr>
                </table>

                <p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#374151;">
                  Not ready to order yet? Hit reply with your wedding date + venue and we&apos;ll send back a
                  custom quote in under 24 hours. No sales rep, no pressure.
                </p>
                <p style="margin:18px 0 0;font-size:14px;color:${NAVY};">— Brian Hill, Founder</p>
                <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">Party On Delivery · Austin, TX</p>
                <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">
                  <a href="tel:7373719700" style="color:${NAVY};text-decoration:none;">(737) 371-9700</a>
                  &nbsp;·&nbsp;
                  <a href="https://partyondelivery.com" style="color:${NAVY};text-decoration:none;">partyondelivery.com</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 24px;border-top:1px solid #E5E7EB;text-align:center;">
                <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.5;">
                  You got this because you used the wedding drink calculator on partyondelivery.com.<br/>
                  Reply STOP to unsubscribe. Must be 21+ to order alcohol.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Hey ${fn},

Here's the shopping list our calculator built for your ${eventLabel}.

${input.guests} guests × ${input.hours} hours ≈ ${input.totalDrinks.toLocaleString()} drinks total.

${listText}

Want this delivered iced, set up, and ready before guests arrive?
Start a wedding order: ${ORDER_URL}

Why Party On:
  · Free delivery to Austin-area venues, iced and stocked
  · Cooler, ice, cups, and glassware included
  · Returns on unopened bottles after the event
  · TABC-licensed · $1M insured · 500+ Austin weddings since 2022

Not ready to order yet? Hit reply with your wedding date + venue and
we'll send back a custom quote in under 24 hours.

— Brian Hill, Founder
Party On Delivery · Austin, TX
(737) 371-9700 · partyondelivery.com

Reply STOP to unsubscribe. Must be 21+ to order alcohol.`;

  return { subject, html, text };
}
