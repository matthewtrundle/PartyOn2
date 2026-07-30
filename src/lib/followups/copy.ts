/**
 * Follow-up email system — copy.
 *
 * Copy lives as plain-text TEMPLATES with {tokens}. The defaults below ship
 * in code; Allan can override any subject/body per journey step from
 * /admin/emails/followups (stored in EmailTemplateContent, read by the
 * engine every tick — edits go live without a deploy).
 *
 * Template semantics (keep simple, documented in the editor UI):
 *   - {token} is replaced with its value (see TOKEN_REFERENCE per journey)
 *   - if a token has NO value for a given customer, the whole LINE containing
 *     it is dropped — write optional info on its own line
 *   - subjects never drop; unresolved tokens are removed instead
 *
 * Every email gets the CAN-SPAM footer: sender identity + physical mailing
 * address + unsubscribe link.
 */

import type { JourneyEmailContext, JourneyKey, RenderedEmail } from './types';

/**
 * CAN-SPAM physical mailing address — appears in the footer of every
 * follow-up email. Confirmed by Allan 2026-07-06.
 */
export const POSTAL_ADDRESS = '7600 N Lamar #A2, Austin, TX 78752';

/**
 * Review page for the post-purchase ask (GHL-managed subdomain, same target
 * the planning-call links use). Confirmed by Allan 2026-07-06.
 */
export const GOOGLE_REVIEW_URL = 'https://123.partyondelivery.com/reviews';

const SIGNATURE = 'Allan\nParty On Delivery\n(737) 371-9700';

/**
 * Partner-outreach signature. Was Brian Hill's; switched to Allan 2026-07-29
 * when the drafting contract moved to his voice — every draft body now opens
 * "My name is Allan and I own…", so a Brian signature contradicted the letter
 * it was attached to. Bodies stay signature-free; the renderer appends this.
 */
export const PARTNER_OUTREACH_SIGNATURE =
  'Allan\nOwner, Party On Delivery\npartyondelivery.com · (737) 371-9700';

/** Journeys that sign as someone other than the default Allan block. */
const JOURNEY_SIGNATURES: Partial<Record<JourneyKey, string>> = {
  'partner-outreach': PARTNER_OUTREACH_SIGNATURE,
};

/** One journey step's copy: a subject and a plain-text body template. */
export interface StepCopy {
  subject: string;
  body: string;
}

/**
 * Default copy for every journey step (index 0 = step 1). Drafted in Allan's
 * voice; the admin editor overrides these per step without code changes.
 */
export const DEFAULT_COPY: Record<JourneyKey, StepCopy[]> = {
  'abandoned-quote': [
    {
      subject: 'your drink numbers from Party On Delivery',
      body: `Hey {firstName},

You were running drink numbers on our site — I saved where you left off so you don't have to start over.
Looks like you were planning for about {guestCount} people.

Pick it back up here: {resumeLink}

Or skip the clicking entirely — reply with your event date and headcount and I'll price it out for you personally.`,
    },
    {
      subject: 'want me to price it out for you?',
      body: `Hey {firstName},

Still planning? No pressure either way — but if a drink order is still on your list, reply with your date and I'll put a quote together myself. Takes me about ten minutes and you'll get real delivery pricing, not a guess.`,
    },
  ],
  'unpaid-invoice': [
    {
      subject: 'holding your date?',
      body: `Hey {firstName},

I sent over your quote for {deliveryDate} — just checking it landed. Want me to keep holding things on my end?

Your quote is here whenever you're ready: {invoiceLink}

If the date, headcount, or items changed, reply and I'll update it — takes two minutes.`,
    },
    {
      subject: 'should I close this out?',
      body: `Hey {firstName},

Should I close this one out? If plans changed, no worries at all — happens all the time.

If you still want delivery, grab it before I release the slot.

Quote's still here: {invoiceLink}

Either way, a one-line reply helps me keep the calendar straight.`,
    },
  ],
  'partner-inquiry': [
    {
      subject: 'got your partnership inquiry',
      body: `Hey {firstName},

Thanks for reaching out about partnering — this lands directly with me, not a bot. I'll take a proper look at {businessName} and get back to you within a day or two.

In the meantime, if you have questions about how the program works (commissions, delivery zones, how guests order), just reply here.`,
    },
    {
      subject: 'still interested in partnering?',
      body: `Hey {firstName},

Following up on your partnership inquiry — still interested? If it's easier to talk it through, reply with a couple of times that work and I'll call you.

If the timing's just not right, tell me and I'll check back down the road instead of nudging you.`,
    },
  ],
  'contact-form': [
    {
      subject: 'got your message',
      body: `Hey {firstName},

Just confirming your message made it to me — I read these personally and I'll get back to you shortly.

If it's time-sensitive (event this week, delivery question for an existing order), reply with "urgent" in the subject and I'll jump on it first.`,
    },
    {
      subject: 'did my reply reach you?',
      body: `Hey {firstName},

Quick check — did my reply reach you? Email filters eat things sometimes.

If you didn't see anything from me, check spam or just reply here and I'll resend. If we already connected, ignore this one.`,
    },
  ],
  'newsletter-welcome': [
    {
      subject: "welcome — here's how this works",
      body: `Hey {firstName},

Thanks for confirming — you're on the list. Here's how this works: about once or twice a month I send party-planning ideas, seasonal picks, and early access to deals. No daily blasts, ever.

Planning something right now? Reply and tell me about it — date, headcount, vibe — and I'll point you at the right setup.`,
    },
  ],
  'affiliate-apply': [
    {
      subject: 'got your application',
      body: `Hey {firstName},

Got your partner program application — thanks for the interest. I review every application myself, so expect to hear from me within a couple of days.

If you want to add anything (audience size, how you'd promote us, past partnerships), just reply to this email and it goes straight into your file.`,
    },
    {
      subject: 'your application — quick check-in',
      body: `Hey {firstName},

Quick check-in on your partner application — it's still in my queue, not lost. If anything's changed on your end (or you have questions about commission structure), reply here.`,
    },
  ],
  'event-quiz': [
    // Step 1 is the instant welcome sent by /api/v1/event-quiz/submit —
    // this journey only ever sends step 2. Slot kept for shape consistency.
    { subject: '', body: '' },
    {
      subject: 'did the plan land?',
      body: `Hey {firstName},

You grabbed a drink plan from our event quiz a few days back — how's it looking?

If you want a second set of eyes on quantities, or real delivery pricing for your date, reply with the date and headcount and I'll sort it out personally.`,
    },
  ],
  'post-purchase-review': [
    {
      subject: "how'd we do?",
      body: `Hey {firstName},

Delivery's done — hope the party was a good one.

If we earned it, a quick review genuinely helps us more than any ad: {reviewLink}

And if anything was off — late, wrong item, anything — reply and tell me first. I'll make it right.`,
    },
  ],
  'partner-outreach': [
    // Step 1 is normally the PERSONALIZED email from the prospect database
    // (enrichment.outreachEmail, looked up at send time in journeys.ts).
    // This template is only the fallback when the prospect row is missing.
    {
      subject: 'Partnering with {company} — free drink delivery for your clients',
      body: `Hi {firstName},

My name is Allan and I own a local & licensed alcohol-delivery business here in Austin - Party On Delivery. We work with companies like {company} to handle the drinks side of every booking: free delivery for your clients, a co-branded ordering page, and group dashboards where everybody can contribute to an order and split the tab. You would earn a commission on the orders.

Your page is ready to go: {partnerUrl}

Want me to send over how it works?`,
    },
    {
      subject: 'quick follow-up — free perk for {company} clients',
      body: `Hi {firstName},

Following up on my note from a couple of days ago — the short version:

We stock the bar for your clients (free delivery, iced and on time, TABC-licensed), they order from a page with {company}'s branding on it, and you earn a commission on the orders. Zero work for your team — you just share a link.

Your co-branded page: {partnerUrl}

If it's not a fit, tell me and I won't write again.`,
    },
  ],
};

/** Tokens available per journey, shown in the admin editor. */
export const TOKEN_REFERENCE: Record<JourneyKey, Array<{ token: string; description: string }>> = {
  'abandoned-quote': [
    { token: 'firstName', description: 'Customer first name ("there" when unknown)' },
    { token: 'guestCount', description: 'Headcount from the calculator — line drops when unknown' },
    { token: 'resumeLink', description: 'Link back to where they left off' },
  ],
  'unpaid-invoice': [
    { token: 'firstName', description: 'Customer first name ("there" when unknown)' },
    { token: 'deliveryDate', description: 'Delivery date on the quote — line drops when unknown' },
    { token: 'invoiceLink', description: 'Pay/view link for the quote — line drops when unknown' },
  ],
  'partner-inquiry': [
    { token: 'firstName', description: 'Contact first name ("there" when unknown)' },
    { token: 'businessName', description: 'Their business ("your business" when unknown)' },
  ],
  'contact-form': [{ token: 'firstName', description: 'First name ("there" when unknown)' }],
  'newsletter-welcome': [{ token: 'firstName', description: 'First name ("there" when unknown)' }],
  'affiliate-apply': [
    { token: 'firstName', description: 'Applicant first name ("there" when unknown)' },
    { token: 'businessName', description: 'Their business ("your business" when unknown)' },
  ],
  'event-quiz': [
    { token: 'firstName', description: 'First name ("there" when unknown)' },
    { token: 'resumeLink', description: 'Link to their recommended landing page' },
  ],
  'post-purchase-review': [
    { token: 'firstName', description: 'Customer first name ("there" when unknown)' },
    { token: 'reviewLink', description: 'The review page (123.partyondelivery.com/reviews)' },
  ],
  'partner-outreach': [
    { token: 'firstName', description: 'Contact first name ("there" when unknown)' },
    { token: 'company', description: 'Prospect company name' },
    { token: 'partnerUrl', description: 'Their co-branded partner page (line drops when not created yet)' },
  ],
};

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

const TOKEN_RE = /\{([a-zA-Z0-9_]+)\}/g;

/**
 * Substitute {tokens} into a body template. Lines referencing a token with
 * no value are dropped entirely; leftover blank runs collapse. Exported for
 * tests and the editor's live preview.
 */
export function renderTemplate(
  template: string,
  tokens: Record<string, string | null | undefined>
): string {
  const kept = template.split('\n').filter((line) => {
    const refs = [...line.matchAll(TOKEN_RE)].map((m) => m[1]);
    return refs.every((name) => {
      const value = tokens[name];
      return value !== null && value !== undefined && value !== '';
    });
  });
  return kept
    .map((line) => line.replace(TOKEN_RE, (_, name) => String(tokens[name] ?? '')))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Subjects never drop — unresolved tokens are removed and spaces tidied. */
export function renderSubject(
  template: string,
  tokens: Record<string, string | null | undefined>
): string {
  return template
    .replace(TOKEN_RE, (_, name) => String(tokens[name] ?? ''))
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Wrap rendered plain-text body copy into the minimal HTML + text pair every
 * follow-up uses: paragraphs only, no branding, CAN-SPAM footer at the bottom.
 */
export function renderFollowUpEmail(
  subject: string,
  body: string,
  unsubscribeUrl: string,
  signature: string = SIGNATURE
): RenderedEmail {
  const fullText = `${body}\n\n${signature}\n\n—\nParty On Delivery · ${POSTAL_ADDRESS}\nUnsubscribe: ${unsubscribeUrl}`;

  const paragraphs = `${body}\n\n${signature}`
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

/** Token values for a journey step, built from the job payload at send time. */
export function buildTokens(
  journeyKey: JourneyKey,
  ctx: JourneyEmailContext
): Record<string, string | null> {
  const tokens: Record<string, string | null> = {
    firstName: str(ctx.payload, 'firstName') ?? 'there',
  };
  switch (journeyKey) {
    case 'abandoned-quote':
      tokens.guestCount = str(ctx.payload, 'guestCount');
      tokens.resumeLink = ctx.link(str(ctx.payload, 'resumePath') ?? '/order');
      break;
    case 'unpaid-invoice': {
      const invoicePath = str(ctx.payload, 'invoicePath');
      tokens.invoiceLink = invoicePath ? ctx.link(invoicePath) : null;
      tokens.deliveryDate = str(ctx.payload, 'deliveryDate');
      break;
    }
    case 'partner-inquiry':
    case 'affiliate-apply':
      tokens.businessName = str(ctx.payload, 'businessName') ?? 'your business';
      break;
    case 'event-quiz':
      tokens.resumeLink = ctx.link(str(ctx.payload, 'resumePath') ?? '/order');
      break;
    case 'post-purchase-review':
      // External subdomain (GHL-managed) — used verbatim, no UTM appending.
      tokens.reviewLink = GOOGLE_REVIEW_URL;
      break;
    case 'partner-outreach': {
      tokens.company = str(ctx.payload, 'company') ?? 'your business';
      const slug = str(ctx.payload, 'partnerSlug');
      tokens.partnerUrl = slug ? ctx.link(`/partners/${slug}`) : null;
      break;
    }
    default:
      break;
  }
  return tokens;
}

/**
 * Render one journey step: admin override (ctx.copyOverrides) wins over the
 * code default; token substitution + line-drop; CAN-SPAM footer. Returns
 * null when the step has no copy (e.g. event-quiz step 1).
 */
export function buildStepEmail(
  journeyKey: JourneyKey,
  step: number,
  ctx: JourneyEmailContext
): RenderedEmail | null {
  const defaults = DEFAULT_COPY[journeyKey]?.[step - 1];
  const override = ctx.copyOverrides?.[journeyKey]?.[step];
  const subjectTpl = override?.subject?.trim() || defaults?.subject || '';
  const bodyTpl = override?.body?.trim() || defaults?.body || '';
  if (!subjectTpl || !bodyTpl) return null;

  const tokens = buildTokens(journeyKey, ctx);
  const body = renderTemplate(bodyTpl, tokens);
  const subject = renderSubject(subjectTpl, tokens);
  if (!body || !subject) return null;
  return renderFollowUpEmail(subject, body, ctx.unsubscribeUrl, JOURNEY_SIGNATURES[journeyKey]);
}
