/**
 * Generate src/lib/leads/reply-templates.generated.ts from content/playbook/.
 *
 * The /admin/leads reply composer offers these as one-click quick-fills, in
 * Allan's voice, straight from the intent cards' `## Email` blocks. Only the
 * lead-relevant intents are surfaced (ALLOWLIST below) — cruise/refund/complaint
 * cards don't belong in a sales-lead composer. The trailing sign-off is stripped
 * because buildLeadReplyEmail (src/lib/email/templates/lead-reply.ts) re-adds a
 * signature; the `{{tokens}}` are kept for the operator to fill (cart link etc.).
 *
 * Deterministic + idempotent: same playbook in → byte-identical module out (no
 * timestamps). Run after any playbook edit, alongside build-chat-prompt.ts:
 *   npx tsx scripts/playbook/build-reply-templates.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';

const ROOT = process.cwd();
const INTENTS_DIR = path.join(ROOT, 'content', 'playbook', 'intents');
const OUT_PATH = path.join(ROOT, 'src', 'lib', 'leads', 'reply-templates.generated.ts');

/**
 * Lead-relevant intents → button label + default subject. Array order IS the
 * button order in the composer. Keeping the curation here (not as card
 * frontmatter) means no change to the playbook schema or its lint.
 */
const ALLOWLIST: ReadonlyArray<{ id: string; label: string; subject: string }> = [
  { id: 'quote-request', label: 'Quote', subject: 'Your Party On Delivery quote' },
  {
    id: 'corporate-event-inquiry',
    label: 'Corporate',
    subject: 'Your corporate event with Party On Delivery',
  },
  { id: 'bartender-services', label: 'Bartenders', subject: 'Bartender services for your event' },
  {
    id: 'partner-affiliate-inquiry',
    label: 'Partner',
    subject: 'Partnering with Party On Delivery',
  },
  { id: 'callback-request', label: 'Callback', subject: 'Your Party On Delivery callback' },
  { id: 'product-availability', label: 'Availability', subject: 'Finding what you need' },
  { id: 'hours-availability', label: 'Hours', subject: 'Our delivery hours' },
  { id: 'post-event-thanks', label: 'Thank you', subject: 'Thanks from Party On Delivery' },
];

interface BuiltTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
  tokens: string[];
}

/** Same section extractor build-chat-prompt.ts uses — heading to next `## `. */
function extractSection(body: string, heading: string): string | null {
  const re = new RegExp(`^## ${heading}\\s*$`, 'm');
  const m = re.exec(body);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = body.slice(start);
  const next = rest.search(/^## /m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

/**
 * Drop the trailing "Allan" / "Party On Delivery" sign-off lines. The email
 * wrapper (buildLeadReplyEmail) appends its own signature, so keeping these
 * would double-sign. Only strips from the END, so a mid-body "Party On Delivery"
 * (e.g. the corporate card's opening line) is safe.
 */
function stripSignoff(body: string): string {
  const lines = body.split('\n');
  while (lines.length > 0) {
    const last = lines[lines.length - 1].trim();
    if (last === '' || last === 'Allan' || last === 'Party On Delivery') {
      lines.pop();
    } else {
      break;
    }
  }
  return lines.join('\n').trim();
}

/** Drop `<!-- … -->` authoring notes so they never leak into a customer email. */
function stripHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, '').trim();
}

/**
 * Reflow the markdown source's ~90-char hard wraps into clean paragraphs.
 * buildLeadReplyEmail turns every single `\n` into `<br/>`, so a mid-sentence
 * authoring wrap would render as a forced break in the customer's email. Collapse
 * intra-paragraph newlines to spaces; keep the blank-line paragraph breaks.
 */
function reflowParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) =>
      p
        .split('\n')
        .map((l) => l.trim())
        .join(' ')
        .trim(),
    )
    .filter((p) => p.length > 0)
    .join('\n\n');
}

/** The `{{tokens}}` present in the text, first-seen order (deduped). */
function tokensIn(text: string): string[] {
  const out: string[] = [];
  const re = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/** Parse the allowlisted cards into composer templates. Throws on a missing card
 *  or a card with no `## Email` block — a silent drop would ship a broken menu. */
export function buildTemplates(): BuiltTemplate[] {
  return ALLOWLIST.map((entry) => {
    const file = path.join(INTENTS_DIR, `${entry.id}.md`);
    if (!fs.existsSync(file)) throw new Error(`reply-templates: missing card ${entry.id}.md`);
    const { content } = matter.read(file);
    // Prefer a first-person `## Board Email` variant when the card carries one
    // (a human sends board replies); otherwise use the shared `## Email` block.
    const email = extractSection(content, 'Board Email') ?? extractSection(content, 'Email');
    if (!email) {
      throw new Error(`reply-templates: ${entry.id}.md has no "## Email" or "## Board Email" section`);
    }
    const body = reflowParagraphs(stripSignoff(stripHtmlComments(email)));
    return {
      id: entry.id,
      label: entry.label,
      subject: entry.subject,
      body,
      tokens: tokensIn(`${entry.subject}\n${body}`),
    };
  });
}

/** The full generated module text (clean TS — no eslint-disable needed). */
export function buildModule(): string {
  const templates = buildTemplates();
  const json = JSON.stringify(templates, null, 2);
  return `/**
 * GENERATED by scripts/playbook/build-reply-templates.ts — DO NOT EDIT BY HAND.
 * Source: content/playbook/intents/*.md (## Email blocks). Regenerate after any
 * playbook edit: npx tsx scripts/playbook/build-reply-templates.ts
 */
import type { ReplyTemplate } from './reply-templates';

export const REPLY_TEMPLATES: readonly ReplyTemplate[] = ${json};
`;
}

function main(): void {
  fs.writeFileSync(OUT_PATH, buildModule());
  console.log(`reply-templates.generated.ts updated — ${buildTemplates().length} templates`);
}

// Run only when invoked as a script (vitest imports buildModule without side effects).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
