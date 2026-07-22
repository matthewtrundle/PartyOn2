/**
 * Best-effort extraction of a customer's contact info from free-form Wayne chat
 * text, so a conversation can become a Lead when the customer gives their
 * details (Wayne is prompted to ask). Conservative on purpose: a missed capture
 * is fine — the conversation is still stored, and no false Lead is created.
 */

export interface ParsedContact {
  email?: string;
  /** Last 10 digits, matching how leads/orders store phones. */
  phone?: string;
  firstName?: string;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
// (512) 555-1234 / 512-555-1234 / 5125551234 / +1 512 555 1234
const PHONE_RE = /(?:\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/;
// "I'm Sarah" / "my name is Sarah" / "this is Sarah" / "name's Sarah"
const NAME_RE = /\b(?:i['’]?m|i am|my name is|this is|name['’]?s)\s+([A-Z][a-z]{1,20})\b/i;

export function parseContact(text: string): ParsedContact {
  const out: ParsedContact = {};
  if (!text) return out;

  const email = text.match(EMAIL_RE)?.[0];
  if (email) out.email = email.toLowerCase();

  const phoneRaw = text.match(PHONE_RE)?.[0];
  if (phoneRaw) {
    const digits = phoneRaw.replace(/\D/g, '');
    if (digits.length >= 10) out.phone = digits.slice(-10);
  }

  const name = text.match(NAME_RE)?.[1];
  if (name) out.firstName = name.charAt(0).toUpperCase() + name.slice(1);

  return out;
}

/** True when we have at least one identifying field (email or phone). */
export function hasContact(c: ParsedContact): boolean {
  return Boolean(c.email || c.phone);
}
