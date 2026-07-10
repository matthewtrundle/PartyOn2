/**
 * Premier Concierge — bachelor-party questionnaire welcome email.
 *
 * Sent immediately after the customer submits /austin-bachelor-concierge.
 * Recaps their answers so they know we got everything, sets the
 * expectation ("your concierge will follow up within 24 hours"), and
 * gives them a reply-to email they can hit if they want to add detail.
 *
 * Kept as a plain HTML string like the other templates in this folder
 * so it renders identically across Gmail / Apple Mail / Outlook without
 * needing MJML or React Email in the build.
 */

const NAVY = '#0A1F33';
const GOLD = '#D4AF37';
const CREAM = '#FAF6EE';

const ACTIVITY_LABEL: Record<string, string> = {
  'drink-delivery': 'Drink delivery to the dock',
  'boat-rental': 'Private party boat rental',
  'golf-brewery-tour': 'Golf & brewery tour',
  'atv-tour': 'ATV / off-road tour',
  'gun-range': 'Gun range experience',
  transportation: 'Group transportation',
  'not-sure': 'Not sure yet — recommend for me',
};

const PARTY_LABEL: Record<string, string> = {
  bachelor: 'Bachelor',
  bachelorette: 'Bachelorette',
  weekend: 'Guys weekend',
  corporate: 'Corporate offsite',
  other: 'Custom event',
};

export type ConciergeWelcomeInput = {
  firstName: string;
  headcount: number;
  arrivalDate: string; // YYYY-MM-DD
  departureDate: string;
  partyType: string;
  budgetPerPerson: string;
  activities: string[];
  notes?: string;
};

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function longDate(iso: string): string {
  try {
    const d = new Date(`${iso}T12:00:00Z`);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
}

export function conciergeWelcomeEmail(input: ConciergeWelcomeInput): {
  subject: string;
  html: string;
  text: string;
} {
  const activityList = input.activities
    .map((a) => ACTIVITY_LABEL[a] || a)
    .join(', ');

  const first = escape(input.firstName);
  const arrival = longDate(input.arrivalDate);
  const departure = longDate(input.departureDate);
  const party = PARTY_LABEL[input.partyType] ?? input.partyType;

  const subject = `Got it, ${first} — planning your ${party.toLowerCase()} weekend in Austin`;

  const rows: [string, string][] = [
    ['Party type', party],
    ['Headcount', String(input.headcount)],
    ['Arrival', arrival],
    ['Departure', departure],
    ['Budget per person', input.budgetPerPerson],
    ['Activities you want', activityList],
  ];
  if (input.notes && input.notes.trim().length > 0) {
    rows.push(['Notes', input.notes.trim()]);
  }

  const rowHtml = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:8px 10px;background:${CREAM};font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${NAVY};width:38%;vertical-align:top;border-bottom:1px solid rgba(10,15,25,0.08);">${escape(label)}</td>
        <td style="padding:8px 10px;font-size:14px;color:${NAVY};vertical-align:top;border-bottom:1px solid rgba(10,15,25,0.08);">${escape(value)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${NAVY};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f4;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(10,15,25,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:${NAVY};color:#ffffff;padding:24px 24px 20px 24px;border-bottom:3px solid ${GOLD};">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.24em;color:${GOLD};margin-bottom:6px;">PREMIER CONCIERGE · AUSTIN</div>
              <h1 style="margin:0;font-size:24px;font-weight:700;line-height:1.15;letter-spacing:0.01em;">
                Got it, ${first} — your weekend is in the queue.
              </h1>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${NAVY};">
                Thanks for the details. A concierge on our team will read
                through everything and get back to you <strong>within 24 hours</strong>
                with a plan + a fixed quote — no surprise line items, no upsells.
              </p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${NAVY};">
                In the meantime, hit reply if anything changes — headcount,
                dates, or a service you want to add. This email goes straight
                to us.
              </p>

              <!-- Recap card -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:8px;border:1.5px solid ${NAVY};border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="background:${NAVY};color:${GOLD};font-size:11px;font-weight:700;letter-spacing:0.24em;padding:10px 14px;">
                    WHAT YOU TOLD US
                  </td>
                </tr>
                ${rowHtml}
              </table>

              <!-- CTA -->
              <div style="text-align:center;margin-top:28px;">
                <a href="tel:+17373719700" style="display:inline-block;background:${GOLD};color:${NAVY};text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;letter-spacing:0.12em;border:2px solid ${NAVY};box-shadow:0 3px 0 ${NAVY};">
                  📞 (737) 371-9700
                </a>
                <div style="font-size:12px;color:#6b7280;margin-top:8px;">Talk to your concierge sooner — call or text anytime.</div>
              </div>

              <p style="margin:24px 0 0 0;font-size:13px;color:#6b7280;text-align:center;">
                Party On Delivery · concierge@partyondelivery.com
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${CREAM};padding:16px 24px;font-size:11px;color:#6b7280;text-align:center;">
              You&rsquo;re getting this because you filled out the Premier Concierge planner at partyondelivery.com/austin-bachelor-concierge. Reply to unsubscribe from follow-ups.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Got it, ${input.firstName} — your weekend is in the queue.`,
    '',
    'A concierge on our team will read through everything and get back to you within 24 hours with a plan + a fixed quote.',
    '',
    'What you told us:',
    ...rows.map(([label, value]) => `  ${label}: ${value}`),
    '',
    'Call or text (737) 371-9700 anytime.',
    '',
    'Party On Delivery · concierge@partyondelivery.com',
  ].join('\n');

  return { subject, html, text };
}
