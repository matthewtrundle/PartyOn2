/**
 * Lead Flow reply composer — template type + pure render helpers.
 *
 * The templates themselves are GENERATED from content/playbook/intents/*.md by
 * scripts/playbook/build-reply-templates.ts (single source of truth — edit the
 * playbook, never reply-templates.generated.ts). This module holds the shared
 * type and the pure string helpers the composer uses to fill + guard a draft,
 * kept Prisma- and React-free so they unit-test without rendering.
 */

export interface ReplyTemplate {
  /** Playbook intent id (e.g. "quote-request"). */
  id: string;
  /** Short button label (e.g. "Quote"). */
  label: string;
  /** Default email subject for this template. */
  subject: string;
  /**
   * Email body in Allan's voice, with `{{tokens}}`; the trailing sign-off is
   * stripped at build time because buildLeadReplyEmail re-adds a signature.
   */
  body: string;
  /** The `{{tokens}}` present in subject + body, first-seen order. */
  tokens: string[];
}

/** Replace `{{first_name}}` everywhere; blank/absent name → "there". */
export function fillFirstName(text: string, firstName?: string | null): string {
  const name = (firstName ?? '').trim();
  const value = name.length > 0 ? name : 'there';
  return text.replace(/\{\{\s*first_name\s*\}\}/g, value);
}

/**
 * Apply a template for a lead: fill the first name in subject + body. Other
 * `{{tokens}}` (cart_url, order_number, …) are intentionally left in place for
 * the operator to complete — the pre-send guard warns if any survive.
 */
export function applyTemplate(
  tpl: ReplyTemplate,
  lead: { firstName?: string | null },
): { subject: string; body: string } {
  return {
    subject: fillFirstName(tpl.subject, lead.firstName),
    body: fillFirstName(tpl.body, lead.firstName),
  };
}

/** "Hi {name},\n\n" head-start for a blank compose (fallback "there"). */
export function greetingFor(firstName?: string | null): string {
  return `${fillFirstName('Hi {{first_name}},', firstName)}\n\n`;
}

/** Re: subject for an inbound reply, without stacking "Re: Re:". */
export function inboundReplySubject(theirSubject?: string | null): string {
  const s = (theirSubject ?? '').trim();
  if (!s) return 'Re: your message';
  return /^re:/i.test(s) ? s : `Re: ${s}`;
}

/** Cap on the quoted original — keeps `reply + quote` under the reply route's
    10k body limit even when a customer sent a very long email. */
const MAX_QUOTE_CHARS = 4000;

/** Gmail-style quote of an inbound message, to append beneath a reply. */
export function quoteInboundMessage(msg: {
  fromName?: string | null;
  fromEmail?: string | null;
  receivedAt: string;
  bodyText?: string | null;
  snippet?: string | null;
}): string {
  const who = (msg.fromName ?? '').trim() || msg.fromEmail || 'they';
  const when = new Date(msg.receivedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  });
  const raw = (msg.bodyText ?? msg.snippet ?? '').trim();
  const clipped =
    raw.length > MAX_QUOTE_CHARS ? `${raw.slice(0, MAX_QUOTE_CHARS).trimEnd()}\n…[trimmed]` : raw;
  const quoted = clipped
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n');
  return `On ${when}, ${who} wrote:\n${quoted}`;
}

/** Unfilled `{{tokens}}` still in the text (so the composer warns before send). */
export function unfilledTokens(text: string): string[] {
  const out: string[] = [];
  const re = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/** Best-guess intent for a lead → the template id to surface first. */
function bestTemplateId(lead: { sourceWidget?: string | null; occasion?: string | null }): string {
  if ((lead.occasion ?? '').toLowerCase().includes('corporate')) {
    return 'corporate-event-inquiry';
  }
  switch (lead.sourceWidget) {
    case 'PARTNER_INQUIRY':
      return 'partner-affiliate-inquiry';
    case 'CALL_BOOKING':
      return 'callback-request';
    default:
      return 'quote-request';
  }
}

/** Put the likeliest template first for this lead; stable order for the rest. */
export function orderTemplatesForLead(
  templates: readonly ReplyTemplate[],
  lead: { sourceWidget?: string | null; occasion?: string | null },
): ReplyTemplate[] {
  const first = bestTemplateId(lead);
  const idx = templates.findIndex((t) => t.id === first);
  if (idx <= 0) return [...templates];
  return [templates[idx], ...templates.slice(0, idx), ...templates.slice(idx + 1)];
}
