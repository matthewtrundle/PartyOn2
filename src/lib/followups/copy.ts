/**
 * Follow-up email system — copy.
 *
 * DRAFT STUBS in Allan's voice — plain text, personal, no branded HTML.
 * Allan does a copy pass on this file before journeys are enabled (open item
 * #2 in the build plan). Copy is written to survive edge cases: it never
 * asserts the reader hasn't ordered (they may have paid with another email)
 * and step-2 contact copy tolerates Allan having already replied by hand.
 *
 * Every email gets the CAN-SPAM footer: sender identity + physical mailing
 * address + unsubscribe link.
 */

import type { JourneyEmailContext, RenderedEmail } from './types';

/**
 * CAN-SPAM physical mailing address — appears in the footer of every
 * follow-up email. Confirmed by Allan 2026-07-06.
 */
export const POSTAL_ADDRESS = '7600 N Lamar #A2, Austin, TX 78752';

/**
 * Google review link for the post-purchase ask.
 * TODO(Allan): confirm the canonical review URL before Phase 3 goes live
 * (same target the GHL review.request flow uses today).
 */
export const GOOGLE_REVIEW_URL = 'https://g.page/party-on-delivery/review';

const SIGNATURE = 'Allan\nParty On Delivery';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Turn bare URLs into anchors AFTER escaping, so copy stays plain text. */
function linkify(escaped: string): string {
  return escaped.replace(
    /https?:\/\/[^\s<]+/g,
    (url) => `<a href="${url}" style="color:#0B74B8;">${url}</a>`
  );
}

/**
 * Wrap plain-text body copy into the minimal HTML + text pair every follow-up
 * uses: paragraphs only, no branding, CAN-SPAM footer at the bottom.
 */
export function renderFollowUpEmail(
  subject: string,
  body: string,
  unsubscribeUrl: string
): RenderedEmail {
  const fullText = `${body}\n\n${SIGNATURE}\n\n—\nParty On Delivery · ${POSTAL_ADDRESS}\nUnsubscribe: ${unsubscribeUrl}`;

  const paragraphs = `${body}\n\n${SIGNATURE}`
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;">${linkify(escapeHtml(p)).replace(/\n/g, '<br/>')}</p>`)
    .join('\n');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:600px;">
${paragraphs}
<p style="margin:24px 0 0;font-size:12px;color:#6b7280;">Party On Delivery · ${escapeHtml(POSTAL_ADDRESS)}<br/>
<a href="${unsubscribeUrl}" style="color:#6b7280;">Unsubscribe</a></p>
</div>`;

  return { subject, html, text: fullText };
}

/** Defensive string read from an untrusted payload. */
function str(payload: Record<string, unknown>, key: string): string | null {
  const v = payload[key];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function firstName(ctx: JourneyEmailContext): string {
  return str(ctx.payload, 'firstName') ?? 'there';
}

// ---------------------------------------------------------------------------
// abandoned-quote — calculator/package-builder email captured, no order
// ---------------------------------------------------------------------------

export function abandonedQuoteStep1(ctx: JourneyEmailContext): RenderedEmail {
  const name = firstName(ctx);
  const resumePath = str(ctx.payload, 'resumePath') ?? '/order';
  const guestCount = str(ctx.payload, 'guestCount');
  const numbersLine = guestCount
    ? `You were running drink numbers for about ${guestCount} people — I saved where you left off so you don't have to start over.`
    : `You were running drink numbers on our site — I saved where you left off so you don't have to start over.`;

  const body = `Hey ${name},

${numbersLine}

Pick it back up here: ${ctx.link(resumePath)}

Or skip the clicking entirely — reply with your event date and headcount and I'll price it out for you personally.`;

  return renderFollowUpEmail(
    'your drink numbers from Party On Delivery',
    body,
    ctx.unsubscribeUrl
  );
}

export function abandonedQuoteStep2(ctx: JourneyEmailContext): RenderedEmail {
  const name = firstName(ctx);
  const body = `Hey ${name},

Still planning? No pressure either way — but if a drink order is still on your list, reply with your date and I'll put a quote together myself. Takes me about ten minutes and you'll get real delivery pricing, not a guess.`;

  return renderFollowUpEmail(
    'want me to price it out for you?',
    body,
    ctx.unsubscribeUrl
  );
}

// ---------------------------------------------------------------------------
// unpaid-invoice — quote/invoice sent, not paid
// ---------------------------------------------------------------------------

export function unpaidInvoiceStep1(ctx: JourneyEmailContext): RenderedEmail {
  const name = firstName(ctx);
  const invoicePath = str(ctx.payload, 'invoicePath');
  const eventLine = str(ctx.payload, 'deliveryDate')
    ? ` for ${str(ctx.payload, 'deliveryDate')}`
    : '';
  const payLine = invoicePath
    ? `Your quote is here whenever you're ready: ${ctx.link(invoicePath)}`
    : `Reply here and I'll resend your quote.`;

  const body = `Hey ${name},

I sent over your quote${eventLine} — just checking it landed. Want me to keep holding things on my end?

${payLine}

If the date, headcount, or items changed, reply and I'll update it — takes two minutes.`;

  return renderFollowUpEmail('holding your date?', body, ctx.unsubscribeUrl);
}

export function unpaidInvoiceStep2(ctx: JourneyEmailContext): RenderedEmail {
  const name = firstName(ctx);
  const invoicePath = str(ctx.payload, 'invoicePath');
  const payLine = invoicePath ? `\n\nQuote's still here: ${ctx.link(invoicePath)}` : '';

  const body = `Hey ${name},

Should I close this one out? If plans changed, no worries at all — happens all the time.

If you still want delivery, grab it before I release the slot.${payLine}

Either way, a one-line reply helps me keep the calendar straight.`;

  return renderFollowUpEmail('should I close this out?', body, ctx.unsubscribeUrl);
}

// ---------------------------------------------------------------------------
// partner-inquiry — B2B partnership form
// ---------------------------------------------------------------------------

export function partnerInquiryStep1(ctx: JourneyEmailContext): RenderedEmail {
  const name = firstName(ctx);
  const businessName = str(ctx.payload, 'businessName');
  const aboutLine = businessName
    ? `I'll take a proper look at ${businessName} and get back to you within a day or two.`
    : `I'll take a proper look and get back to you within a day or two.`;

  const body = `Hey ${name},

Thanks for reaching out about partnering — this lands directly with me, not a bot. ${aboutLine}

In the meantime, if you have questions about how the program works (commissions, delivery zones, how guests order), just reply here.`;

  return renderFollowUpEmail('got your partnership inquiry', body, ctx.unsubscribeUrl);
}

export function partnerInquiryStep2(ctx: JourneyEmailContext): RenderedEmail {
  const name = firstName(ctx);
  const body = `Hey ${name},

Following up on your partnership inquiry — still interested? If it's easier to talk it through, reply with a couple of times that work and I'll call you.

If the timing's just not right, tell me and I'll check back down the road instead of nudging you.`;

  return renderFollowUpEmail('still interested in partnering?', body, ctx.unsubscribeUrl);
}

// ---------------------------------------------------------------------------
// contact-form — general contact form ack + reply-check
// ---------------------------------------------------------------------------

export function contactFormStep1(ctx: JourneyEmailContext): RenderedEmail {
  const name = firstName(ctx);
  const body = `Hey ${name},

Just confirming your message made it to me — I read these personally and I'll get back to you shortly.

If it's time-sensitive (event this week, delivery question for an existing order), reply with "urgent" in the subject and I'll jump on it first.`;

  return renderFollowUpEmail('got your message', body, ctx.unsubscribeUrl);
}

export function contactFormStep2(ctx: JourneyEmailContext): RenderedEmail {
  const name = firstName(ctx);
  const body = `Hey ${name},

Quick check — did my reply reach you? Email filters eat things sometimes.

If you didn't see anything from me, check spam or just reply here and I'll resend. If we already connected, ignore this one.`;

  return renderFollowUpEmail('did my reply reach you?', body, ctx.unsubscribeUrl);
}

// ---------------------------------------------------------------------------
// newsletter-welcome — post-double-opt-in welcome
// ---------------------------------------------------------------------------

export function newsletterWelcomeStep1(ctx: JourneyEmailContext): RenderedEmail {
  const name = firstName(ctx);
  const body = `Hey ${name},

Thanks for confirming — you're on the list. Here's how this works: about once or twice a month I send party-planning ideas, seasonal picks, and early access to deals. No daily blasts, ever.

Planning something right now? Reply and tell me about it — date, headcount, vibe — and I'll point you at the right setup.`;

  return renderFollowUpEmail('welcome — here\'s how this works', body, ctx.unsubscribeUrl);
}

// ---------------------------------------------------------------------------
// affiliate-apply — partner program application ack + check-in
// ---------------------------------------------------------------------------

export function affiliateApplyStep1(ctx: JourneyEmailContext): RenderedEmail {
  const name = firstName(ctx);
  const body = `Hey ${name},

Got your partner program application — thanks for the interest. I review every application myself, so expect to hear from me within a couple of days.

If you want to add anything (audience size, how you'd promote us, past partnerships), just reply to this email and it goes straight into your file.`;

  return renderFollowUpEmail('got your application', body, ctx.unsubscribeUrl);
}

export function affiliateApplyStep2(ctx: JourneyEmailContext): RenderedEmail {
  const name = firstName(ctx);
  const body = `Hey ${name},

Quick check-in on your partner application — it's still in my queue, not lost. If anything's changed on your end (or you have questions about commission structure), reply here.`;

  return renderFollowUpEmail('your application — quick check-in', body, ctx.unsubscribeUrl);
}

// ---------------------------------------------------------------------------
// event-quiz — quiz completed (instant welcome already exists; step 2 only)
// ---------------------------------------------------------------------------

export function eventQuizStep2(ctx: JourneyEmailContext): RenderedEmail {
  const name = firstName(ctx);
  const body = `Hey ${name},

You grabbed a drink plan from our event quiz a few days back — how's it looking?

If you want a second set of eyes on quantities, or real delivery pricing for your date, reply with the date and headcount and I'll sort it out personally.`;

  return renderFollowUpEmail('did the plan land?', body, ctx.unsubscribeUrl);
}

// ---------------------------------------------------------------------------
// post-purchase-review — delivered order, single review ask
// ---------------------------------------------------------------------------

export function postPurchaseReviewStep1(ctx: JourneyEmailContext): RenderedEmail {
  const name = firstName(ctx);
  const body = `Hey ${name},

Delivery's done — hope the party was a good one.

If we earned it, a quick Google review genuinely helps us more than any ad: ${GOOGLE_REVIEW_URL}

And if anything was off — late, wrong item, anything — reply and tell me first. I'll make it right.`;

  return renderFollowUpEmail('how\'d we do?', body, ctx.unsubscribeUrl);
}
