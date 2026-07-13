/**
 * Premier Concierge — quote email.
 *
 * Sent immediately after the customer submits the concierge planner.
 * Replaces the standalone welcome email — this one both (a) confirms
 * we got their info and (b) includes the summary of services + a big
 * "View Your Quote" button that opens the interactive quote page.
 *
 * The quote page lets them toggle activities, adjust per-service
 * headcount / date / time, edit recommended drinks, and pay a 25%
 * deposit to lock in vendors.
 */

import {
  ACTIVITY_CATALOG,
  DEPOSIT_PERCENT,
  computeQuoteTotals,
  type Quote,
} from '@/lib/concierge/quote';

const NAVY = '#0A1F33';
const GOLD = '#D4AF37';
const RASPBERRY = '#7A1E4A';
const ROSE = '#E8B4CE';
const CREAM = '#FAF6EE';

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt$(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
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

export type ConciergeQuoteEmailInput = {
  firstName: string;
  variant: 'bachelor' | 'bachelorette';
  quote: Quote;
  /** Absolute URL to the interactive quote page. */
  quoteUrl: string;
};

export function conciergeQuoteEmail(input: ConciergeQuoteEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const isBachelorette = input.variant === 'bachelorette';
  const primary = isBachelorette ? RASPBERRY : NAVY;
  const accent = isBachelorette ? ROSE : GOLD;
  const partyLabel = isBachelorette ? 'bachelorette' : 'bachelor';

  const totals = computeQuoteTotals(input.quote);
  const enabledItems = input.quote.items.filter((it) => it.enabled);

  const subject = `${escape(input.firstName)}, your Austin ${partyLabel} quote is ready`;

  // ─── Services HTML bullets ────────────────────────────────────
  const bulletsHtml = enabledItems
    .map((it) => {
      const entry = ACTIVITY_CATALOG[it.activityKey];
      if (!entry) return '';
      const lineTotal = entry.pricePerPerson * it.headcount;
      return `
        <tr>
          <td style="padding:12px 8px 12px 0;vertical-align:top;width:36px;font-size:22px;line-height:1;">${entry.emoji}</td>
          <td style="padding:12px 12px 12px 4px;vertical-align:top;">
            <div style="font-weight:700;color:${primary};font-size:14px;">${escape(entry.label)}</div>
            <div style="color:#6b7280;font-size:12px;margin-top:2px;">${escape(entry.blurb)}</div>
          </td>
          <td style="padding:12px 4px 12px 12px;vertical-align:top;text-align:right;white-space:nowrap;">
            <div style="font-family:ui-monospace,monospace;font-size:13px;color:${primary};font-weight:700;">${fmt$(lineTotal)}</div>
            <div style="color:#9ca3af;font-size:11px;">${it.headcount} × ${fmt$(entry.pricePerPerson)}</div>
          </td>
        </tr>`;
    })
    .join('');

  // ─── Services plain-text bullets ──────────────────────────────
  const bulletsText = enabledItems
    .map((it) => {
      const entry = ACTIVITY_CATALOG[it.activityKey];
      if (!entry) return '';
      const lineTotal = entry.pricePerPerson * it.headcount;
      return `  • ${entry.label}: ${it.headcount} × ${fmt$(entry.pricePerPerson)} = ${fmt$(lineTotal)}`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${primary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f4;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(10,15,25,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:${primary};color:#ffffff;padding:24px 24px 20px 24px;border-bottom:3px solid ${accent};">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.24em;color:${accent};margin-bottom:6px;">PREMIER CONCIERGE · AUSTIN</div>
              <h1 style="margin:0;font-size:24px;font-weight:700;line-height:1.15;letter-spacing:0.01em;">
                Your Austin ${partyLabel} quote is ready.
              </h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:#ffffff;opacity:0.88;line-height:1.5;">
                Hi ${escape(input.firstName)} — here&rsquo;s a starting plan based on what you told us. Tweak anything on the quote page, then pay a 25% deposit to lock it in.
              </p>
            </td>
          </tr>

          <!-- Trip summary -->
          <tr>
            <td style="padding:20px 24px 8px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${CREAM};border-radius:8px;padding:12px 16px;">
                <tr>
                  <td style="padding:6px 8px;font-size:12px;color:${primary};">
                    <strong>Trip:</strong>&nbsp;${input.quote.headcount} people · ${longDate(input.quote.arrivalDate)} → ${longDate(input.quote.departureDate)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Services header -->
          <tr>
            <td style="padding:20px 24px 4px 24px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.22em;color:${primary};">WHAT&rsquo;S IN THE QUOTE</div>
            </td>
          </tr>

          <!-- Services bullets -->
          <tr>
            <td style="padding:0 24px 8px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                ${bulletsHtml || '<tr><td style="padding:12px 4px;color:#6b7280;font-size:13px;">No activities selected yet — pick some on the quote page.</td></tr>'}
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding:8px 24px 8px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1.5px solid ${primary};padding-top:8px;">
                <tr>
                  <td style="padding:8px 4px;font-size:14px;color:${primary};">Subtotal</td>
                  <td style="padding:8px 4px;font-size:14px;color:${primary};text-align:right;font-family:ui-monospace,monospace;">${fmt$(totals.subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 4px;font-size:14px;color:${primary};font-weight:700;">Deposit today (${Math.round(DEPOSIT_PERCENT * 100)}%)</td>
                  <td style="padding:8px 4px;font-size:14px;color:${primary};text-align:right;font-family:ui-monospace,monospace;font-weight:700;">${fmt$(totals.depositAmount)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 4px;font-size:12px;color:#6b7280;">Remaining (due 7 days before event)</td>
                  <td style="padding:8px 4px;font-size:12px;color:#6b7280;text-align:right;font-family:ui-monospace,monospace;">${fmt$(totals.remaining)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:8px 24px 24px 24px;text-align:center;">
              <a href="${escape(input.quoteUrl)}" style="display:inline-block;background:${accent};color:${isBachelorette ? '#3F0F27' : NAVY};text-decoration:none;padding:16px 36px;border-radius:10px;font-weight:700;letter-spacing:0.12em;border:2px solid ${primary};box-shadow:0 3px 0 ${primary};font-size:15px;">
                VIEW YOUR QUOTE →
              </a>
              <div style="font-size:12px;color:#6b7280;margin-top:10px;">
                Toggle activities · adjust headcount · pick dates · pay deposit
              </div>
            </td>
          </tr>

          <!-- Fine print -->
          <tr>
            <td style="padding:0 24px 20px 24px;">
              <div style="font-size:12px;color:#6b7280;line-height:1.6;background:#F9FAFB;border-radius:6px;padding:12px 14px;">
                <strong style="color:${primary};">How it works:</strong> Everything above is a starting plan based on what you told us. On the quote page you can toggle activities on/off, adjust the number of people per service, pick dates/times, and edit the drinks package. Your total updates live. Pay 25% to lock in the vendors — remaining balance is due 7 days before the first activity.
                <br /><br />
                Prices are placeholders during our launch — a concierge will confirm the final numbers within 24h. Questions? Reply to this email or call <a href="tel:+17373719700" style="color:${primary};font-weight:700;">(737) 371-9700</a>.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${CREAM};padding:16px 24px;font-size:11px;color:#6b7280;text-align:center;">
              Party On Delivery · Premier Concierge · Austin, TX
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `${input.firstName}, your Austin ${partyLabel} quote is ready.`,
    '',
    'Here\'s a starting plan based on what you told us. Tweak anything on the quote page, then pay a 25% deposit to lock it in.',
    '',
    `Trip: ${input.quote.headcount} people · ${longDate(input.quote.arrivalDate)} → ${longDate(input.quote.departureDate)}`,
    '',
    "WHAT'S IN THE QUOTE",
    bulletsText || '  (no activities selected — pick some on the quote page)',
    '',
    `Subtotal:      ${fmt$(totals.subtotal)}`,
    `Deposit (25%): ${fmt$(totals.depositAmount)}`,
    `Remaining:     ${fmt$(totals.remaining)}`,
    '',
    `View your quote → ${input.quoteUrl}`,
    '',
    'Prices are placeholders during launch — a concierge will confirm the final numbers within 24h.',
    '',
    'Party On Delivery · Premier Concierge · (737) 371-9700',
  ].join('\n');

  return { subject, html, text };
}
