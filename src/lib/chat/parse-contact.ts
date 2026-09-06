/**
 * Best-effort extraction of a customer's contact info from free-form Wayne chat
 * text, so a conversation can become a Lead when the customer gives their
 * details (Wayne is prompted to ask). Conservative on purpose: a missed capture
 * is fine — the conversation is still stored, and no false Lead is created.
 */
import { normalizeEmail } from '@/lib/leads/email-validation';

export interface ParsedContact {
  email?: string;
  /** Last 10 digits, matching how leads/orders store phones. */
  phone?: string;
  firstName?: string;
  lastName?: string;
}

// Repetition is capped at the RFC 5321 limits (64-char local part, 63-char
// labels) rather than open-ended: an unbounded `+` here is quadratic on a long
// run of letters with no "@", and this runs on unauthenticated /api/chat input.
const EMAIL_RE = /[\w.+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){1,5}/;
// (512) 555-1234 / 512-555-1234 / 5125551234 / +1 512 555 1234
const PHONE_RE = /(?:\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/;
// "I'm Sarah" / "my name is Sarah" / "this is Sarah" / "name's Sarah".
// The prefix casing is spelled out (I'm/i'm, My/my, …) instead of using the /i
// flag, because /i also lets the [A-Z] name class match lowercase — which turned
// "I'm doing a wedding" into the name "doing". Requiring a genuinely capitalized
// word means verb phrases after "I'm" (typed lowercase) no longer match.
const NAME_RE =
  /\b(?:[Ii]['’]?m|[Ii] am|[Mm]y name is|[Tt]his is|[Nn]ame['’]?s)\s+([A-Z][a-z]{1,20})\b/;
// Words that can sit where a name would — after "I'm …" (verbs, fillers) or as
// a "--"-delimited segment (pronouns, greetings, sign-offs) — but aren't names.
// One list serves both capture paths.
const NAME_STOPWORDS = new Set([
  'doing', 'planning', 'looking', 'having', 'hosting', 'throwing', 'organizing',
  'trying', 'thinking', 'hoping', 'going', 'gonna', 'interested', 'needing',
  'wanting', 'wondering', 'just', 'not', 'here', 'ready', 'done', 'still', 'also',
  'really', 'good', 'great', 'the', 'from', 'with',
  'i', 'we', 'you', 'they', 'it', 'he', 'she', 'us', 'me', 'my', 'our', 'a', 'an',
  'is', 'am', 'are', 'this', 'that', 'hi', 'hey', 'hello', 'thanks', 'thank',
  'call', 'text', 'email', 'reach', 'please', 'need', 'want', 'name', 'yes', 'no',
  'ok', 'okay', 'sure', 'best', 'regards', 'cheers', 'sounds', 'more', 'info',
  'party', 'people', 'guests',
]);

// Visitors sometimes jam their details together with "--" ("5126224061--anthony
// nicaj--hello@x.com"). "--" is a field boundary, never part of an address — but
// "-" is a legal email character, so the raw regex once stored `nicaj--hello@…`.
// Turning the delimiter into a space before matching fixes both sides of the @.
const FIELD_DELIM_RE = /--+/;

// A name segment in that paste is exactly two words (letters, optional internal
// hyphen) and nothing else, so the phone (digits) and email (@) segments can
// never match it. Two words on purpose: a real dump is "First Last", and every
// one-word false positive ("ok", "austin", "saturday") dies here.
const DELIM_NAME_SEGMENT_RE =
  /^(\p{L}{2,20}(?:-\p{L}{2,20})?)[ \t]+(\p{L}{2,20}(?:-\p{L}{2,20})?)$/u;

const capitalize = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);

/**
 * First/last name from one "--"-delimited line, or null. Only a line that itself
 * carries a phone or email is mined, so a prose "--" in some other message can
 * never mint a name once the visitor gives their number later.
 */
function nameFromDelimitedLine(line: string): [string, string] | null {
  if (!FIELD_DELIM_RE.test(line)) return null;
  if (!EMAIL_RE.test(line) && !PHONE_RE.test(line)) return null;
  for (const segment of line.split(FIELD_DELIM_RE)) {
    const m = DELIM_NAME_SEGMENT_RE.exec(segment.trim());
    if (!m) continue;
    if (NAME_STOPWORDS.has(m[1].toLowerCase()) || NAME_STOPWORDS.has(m[2].toLowerCase())) {
      continue;
    }
    return [capitalize(m[1]), capitalize(m[2])];
  }
  return null;
}

/**
 * Parse email / phone / first (+ last) name out of the customer's chat text.
 * `text` is every user message so far, joined with newlines (see capture.ts).
 */
export function parseContact(text: string): ParsedContact {
  const out: ParsedContact = {};
  if (!text) return out;
  const normalized = text.replace(/--+/g, ' ');

  const email = normalizeEmail(normalized.match(EMAIL_RE)?.[0]);
  if (email) out.email = email;

  const phoneRaw = normalized.match(PHONE_RE)?.[0];
  if (phoneRaw) {
    const digits = phoneRaw.replace(/\D/g, '');
    if (digits.length >= 10) out.phone = digits.slice(-10);
  }

  const name = normalized.match(NAME_RE)?.[1];
  if (name && !NAME_STOPWORDS.has(name.toLowerCase())) {
    out.firstName = capitalize(name);
  }

  // No "I'm …" cue: fall back to the "phone--name--email" paste shape, per line.
  if (!out.firstName) {
    for (const line of text.split('\n')) {
      const pair = nameFromDelimitedLine(line);
      if (pair) {
        [out.firstName, out.lastName] = pair;
        break;
      }
    }
  }

  return out;
}

/** True when we have at least one identifying field (email or phone). */
export function hasContact(c: ParsedContact): boolean {
  return Boolean(c.email || c.phone);
}
