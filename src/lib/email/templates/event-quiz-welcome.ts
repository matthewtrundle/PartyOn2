/**
 * Event-quiz welcome email.
 *
 * Sent immediately when someone completes the /event-quiz flow. The
 * subject + body summarize what we do (drinks + Premier Party Cruises
 * concierge) and personalize based on the party type they picked and
 * the needs they checked.
 *
 * Placeholder copy — replace with the real concierge / boat pricing
 * once Brian confirms the lineup. The structure is solid; the words
 * are easy to swap.
 */

import {
  PARTY_TYPE_LABEL,
  EVENT_NEED_LABEL,
  type PartyType,
  type DeliveryTiming,
  type EventNeed,
} from '@/lib/eventQuiz/routing';

const NAVY = '#0A1F33';
const GOLD = '#D4AF37';

export type EventQuizWelcomeInput = {
  firstName: string;
  partyType: PartyType;
  timing: DeliveryTiming;
  needs: EventNeed[];
  /** Absolute or relative path back to their personalized landing page. */
  resumeUrl: string;
};

function escape(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function eventQuizWelcomeEmail(input: EventQuizWelcomeInput): {
  subject: string;
  html: string;
  text: string;
} {
  const fn = escape(input.firstName || 'there');
  const partyLabel = PARTY_TYPE_LABEL[input.partyType] ?? 'your event';
  const url = input.resumeUrl.startsWith('http')
    ? input.resumeUrl
    : `https://partyondelivery.com${input.resumeUrl}`;

  const needsBlockHtml = input.needs.length
    ? `<p style="margin:0 0 8px;font-weight:700;color:${NAVY};">Here's what you said you need help with:</p>
       <ul style="margin:0 0 16px;padding-left:18px;color:#374151;font-size:14px;line-height:1.6;">
         ${input.needs.map((n) => `<li>${escape(EVENT_NEED_LABEL[n] ?? n)}</li>`).join('')}
       </ul>`
    : '';

  const needsBlockText = input.needs.length
    ? `What you said you need help with:\n${input.needs.map((n) => `  • ${EVENT_NEED_LABEL[n] ?? n}`).join('\n')}\n\n`
    : '';

  const subject = `Welcome to Party On Delivery, ${fn} — your ${partyLabel.toLowerCase()} starts here 🥂`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:${NAVY};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:30px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(10,15,25,0.06);">
            <tr>
              <td style="background:${NAVY};padding:30px 24px;text-align:center;border-bottom:3px solid ${GOLD};">
                <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${GOLD};">PARTY ON DELIVERY · AUSTIN</div>
                <div style="font-size:24px;font-weight:700;color:#FFFFFF;margin-top:6px;letter-spacing:0.5px;">Welcome, ${fn} 🥂</div>
                <div style="font-size:13px;color:#FFFFFF;opacity:0.85;margin-top:6px;">${escape(partyLabel)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 8px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:${NAVY};">
                  Thanks for telling us a bit about your party — we&apos;ve got everything you need
                  to make it run smooth. Click below to start your drink order, and we&apos;ll handle
                  the rest from there:
                </p>
                <div style="text-align:center;margin:24px 0;">
                  <a href="${url}" style="display:inline-block;background:${GOLD};color:${NAVY};padding:14px 32px;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:2px;text-decoration:none;">START MY DRINK ORDER →</a>
                </div>

                <p style="margin:18px 0 8px;font-weight:700;color:${NAVY};font-size:15px;">Everything we do (the short version):</p>
                <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 18px;font-size:14px;line-height:1.55;color:#374151;">
                  <tr>
                    <td style="padding:6px 0;width:24px;color:${GOLD};font-weight:700;">🚚</td>
                    <td style="padding:6px 0;"><strong>Alcohol delivery</strong> — TABC-licensed, ice-cold, same-day windows across Austin.</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:${GOLD};font-weight:700;">🍹</td>
                    <td style="padding:6px 0;"><strong>Cocktail kits</strong> — built around Fresh Victor mixers. Premium spirits, pre-portioned.</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:${GOLD};font-weight:700;">🎉</td>
                    <td style="padding:6px 0;"><strong>Party rentals + bar setup</strong> — tubs, dispensers, glassware, pro bartenders.</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:${GOLD};font-weight:700;">⛵</td>
                    <td style="padding:6px 0;"><strong>Premier Party Cruises</strong> (sister company) — Lake Travis pontoons + party boats with crew.</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:${GOLD};font-weight:700;">📋</td>
                    <td style="padding:6px 0;"><strong>Concierge planning</strong> — one contact for venue, drinks, rentals, day-of timeline.</td>
                  </tr>
                </table>

                ${needsBlockHtml}

                <p style="margin:18px 0 14px;font-size:14px;line-height:1.6;color:#374151;">
                  Want to talk through it? Reply to this email or book a 10-min planning call:
                </p>
                <ul style="margin:0 0 16px;padding-left:18px;color:#374151;font-size:14px;line-height:1.6;">
                  <li><a href="https://123.partyondelivery.com/planning-call" style="color:${NAVY};font-weight:700;">Book a 10-min planning call →</a></li>
                  <li><a href="tel:7373719700" style="color:${NAVY};font-weight:700;">(737) 371-9700</a></li>
                </ul>

                <p style="margin:18px 0 0;font-size:14px;color:${NAVY};">— Brian Hill, Founder</p>
                <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">Party On Delivery · Austin, TX · TABC-licensed</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 22px;border-top:1px solid #E5E7EB;text-align:center;">
                <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.5;">
                  You got this because you filled out the party quiz on partyondelivery.com.<br/>
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

  const text = `Welcome to Party On Delivery, ${fn}!

You're set up for: ${partyLabel}

Start your drink order: ${url}

Everything we do:
  🚚 Alcohol delivery — TABC-licensed, ice-cold, same-day windows across Austin.
  🍹 Cocktail kits — built around Fresh Victor mixers. Premium spirits, pre-portioned.
  🎉 Party rentals + bar setup — tubs, dispensers, glassware, pro bartenders.
  ⛵ Premier Party Cruises — Lake Travis pontoons + party boats with crew.
  📋 Concierge planning — one contact for venue, drinks, rentals, day-of timeline.

${needsBlockText}Want to talk through it?
  • Book a 10-min planning call: https://123.partyondelivery.com/planning-call
  • Call (737) 371-9700
  • Reply to this email

— Brian Hill, Founder
Party On Delivery · Austin, TX · TABC-licensed

Reply STOP to unsubscribe. Must be 21+ to order alcohol.`;

  return { subject, html, text };
}
