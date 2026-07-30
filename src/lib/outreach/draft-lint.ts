/**
 * Partner Outreach 2.0 — draft lint.
 *
 * Pure rule checks for the Hormozi drafting contract (draft-prompt.ts),
 * run at import time (scripts/import-prospect-drafts.ts) AND in the draft
 * editor UI. Errors don't hard-block — the operator can approve-with-errors
 * behind a confirm (the 33 legacy ~221-word seeds fail by design) — but
 * every issue is surfaced.
 */

export interface LintIssue {
  severity: 'error' | 'warning';
  field: 'subject' | 'altSubject' | 'body' | 'followUpBody' | 'touch3Body';
  message: string;
}

/** The draft fields lint understands (all plain text, signature-free). */
export interface LintableDraft {
  subject: string;
  altSubject?: string | null;
  body: string;
  followUpBody?: string | null;
  touch3Body?: string | null;
}

const BANNED_PHRASES = [
  'i hope this finds you well',
  'quick question',
  'game-changer',
  'game changer',
  'revolutionary',
  'excited',
  'synergy',
  'circle back',
  'touching base',
  'win-win',
  'just bumping',
  'just checking in',
  // Allan never writes "noticed" — he says "saw" (voice rule, draft-prompt.ts).
  'noticed',
];

/** "worth a 15-minute call?" style asks — the CTA must be a send-offer, never a meeting. */
const MEETING_ASK_RE =
  /\b(15|fifteen|30|thirty)[- ]?min(ute)?s?\b|\b(quick|short|brief)?\s?(call|chat|meeting|zoom|demo)\b.{0,30}\?|worth a call|hop on a|schedule (a|some)|book a (call|time|meeting)|calendar link/i;

// Matches BOTH the current Allan block and the retired Brian one — a body
// carrying either would be double-signed once the renderer appends the real
// signature. Keep the old strings: legacy drafts still hold them.
const SIGNATURE_RE =
  /brian hill|allan\s*\n\s*owner, party on delivery|owner, party on delivery|founder, party on delivery|partyondelivery\.com\s*·|\(737\) 371-9700/i;
const UNSUBSCRIBE_RE = /unsubscribe|opt[- ]out|preferences link/i;
const URL_RE = /https?:\/\/[^\s<)]+/g;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function lintSubjectField(
  field: 'subject' | 'altSubject',
  value: string,
  issues: LintIssue[]
): void {
  const words = wordCount(value);
  if (words < 1 || words > 3) {
    issues.push({ severity: 'error', field, message: `${words} words — subjects are 1–3 words` });
  }
  if (value !== value.toLowerCase()) {
    issues.push({ severity: 'error', field, message: 'must be lowercase' });
  }
  if (/[.!?:;,]/.test(value)) {
    issues.push({ severity: 'error', field, message: 'no punctuation in subjects' });
  }
}

function lintBodyCommon(
  field: 'body' | 'followUpBody' | 'touch3Body',
  text: string,
  issues: LintIssue[]
): void {
  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      issues.push({ severity: 'error', field, message: `banned phrase: "${phrase}"` });
    }
  }
  // One is a greeting ("Hi there!"); a string of them is what reads as spam.
  // Allan's voice call 2026-07-29 — the old zero-tolerance rule was ours, not
  // a deliverability requirement.
  const exclamations = (text.match(/!/g) ?? []).length;
  if (exclamations > 1) {
    issues.push({
      severity: 'error',
      field,
      message: `${exclamations} exclamation points — at most one`,
    });
  }
  if (MEETING_ASK_RE.test(text)) {
    issues.push({
      severity: 'error',
      field,
      message: 'meeting/call ask detected — the CTA must be a binary send-offer',
    });
  }
  if (SIGNATURE_RE.test(text)) {
    issues.push({
      severity: 'error',
      field,
      message: 'inline signature detected — the renderer appends it',
    });
  }
  if (UNSUBSCRIBE_RE.test(text)) {
    issues.push({
      severity: 'error',
      field,
      message: 'unsubscribe/footer text detected — the renderer appends it',
    });
  }
  const links = text.match(URL_RE) ?? [];
  if (links.length > 1) {
    issues.push({ severity: 'error', field, message: `${links.length} links — max 1` });
  }
}

/** Lint a full 3-touch draft. Empty array = clean. */
export function lintDraft(draft: LintableDraft): LintIssue[] {
  const issues: LintIssue[] = [];

  lintSubjectField('subject', draft.subject, issues);
  if (draft.altSubject != null && draft.altSubject !== '') {
    lintSubjectField('altSubject', draft.altSubject, issues);
    if (draft.altSubject.trim().toLowerCase() === draft.subject.trim().toLowerCase()) {
      issues.push({
        severity: 'error',
        field: 'altSubject',
        message: 'identical to subject — the resend branch needs a fresh thread',
      });
    }
  } else {
    issues.push({
      severity: 'warning',
      field: 'altSubject',
      message: 'missing — touch 2 cannot branch to a resend without it',
    });
  }

  const bodyWords = wordCount(draft.body);
  if (bodyWords < 60 || bodyWords > 120) {
    issues.push({
      severity: 'error',
      field: 'body',
      message: `${bodyWords} words — target 60–110 (hard cap 120)`,
    });
  } else if (bodyWords > 110) {
    issues.push({ severity: 'warning', field: 'body', message: `${bodyWords} words — target 60–110` });
  }
  const questionMarks = (draft.body.match(/\?/g) ?? []).length;
  if (questionMarks !== 1) {
    issues.push({
      severity: 'error',
      field: 'body',
      message: `${questionMarks} question marks — exactly one (the CTA)`,
    });
  }
  lintBodyCommon('body', draft.body, issues);

  for (const [field, text, label] of [
    ['followUpBody', draft.followUpBody, 'follow-up'],
    ['touch3Body', draft.touch3Body, 'touch 3'],
  ] as const) {
    if (text == null || text === '') {
      issues.push({ severity: 'warning', field, message: `missing — the ${label} touch will fall back to nothing` });
      continue;
    }
    // 120 matches the first-touch cap. Raised from 90 (Allan, 2026-07-29): the
    // follow-up carries the live link plus how the ordering actually works, and
    // 90 was forcing that substance out.
    const words = wordCount(text);
    if (words > 120) {
      issues.push({ severity: 'error', field, message: `${words} words — ${label} max is 120` });
    }
    lintBodyCommon(field, text, issues);
  }

  return issues;
}
