/**
 * Guest-list moderation for the public Full Moon Party guest list.
 *
 * The guest list shows the first name + last initial of paid buyers as social
 * proof. Because a buyer picks their own name at checkout, this is the one spot
 * where user-controlled text is shown publicly — so we filter it two ways:
 *
 *  1. A profanity / slur denylist (drops names containing offensive words).
 *  2. An operator override, `FULL_MOON_GUEST_HIDE` — a comma-separated list of
 *     exact buyer names (case-insensitive) to hide without a code change.
 *
 * Both are applied to the RAW buyer name (before it's shortened to
 * "First L."), so the check sees the whole thing. Fail-safe: anything we're
 * unsure about is hidden, never shown.
 */

/**
 * Offensive tokens. A name is blocked if any whitespace/punctuation-delimited
 * token exactly matches one of these. Kept intentionally small and word-level
 * to avoid the "assassin contains ass" class of false positives.
 */
const DENY_TOKENS: ReadonlySet<string> = new Set([
  // Note: no 'dick'/'cock' etc. that are also legitimate names — they'd hide a
  // real guest. The operator override (FULL_MOON_GUEST_HIDE) covers edge cases.
  'fuck', 'fucker', 'fuckface', 'shit', 'bitch', 'cunt',
  'pussy', 'asshole', 'bastard', 'slut', 'whore', 'nigger', 'nigga',
  'faggot', 'faggy', 'retard', 'rape', 'rapist', 'nazi',
  'jizz', 'twat', 'wanker',
]);

/**
 * Hard slurs that must be blocked even when embedded in a larger token
 * (e.g. leetspeak or run-together spellings). Only the worst offenders go
 * here, since substring matching is broader.
 */
const DENY_SUBSTRINGS: readonly string[] = ['nigger', 'nigga', 'faggot', 'rapist'];

/** Reads the operator hide-list from the env (exact full names, lowercased). */
function hiddenNameSet(): ReadonlySet<string> {
  const raw = process.env.FULL_MOON_GUEST_HIDE;
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean),
  );
}

function hasDenyToken(tokens: string[]): boolean {
  return tokens.some((t) => DENY_TOKENS.has(t));
}

/**
 * Joins runs of single-character tokens into one token so profanity spelled out
 * letter-by-letter ("f u c k", "a s s h o l e") is caught — without merging
 * whole words, so "Scunthorpe"/"Shitanshu" (single multi-char tokens) are left
 * intact and not false-flagged.
 */
function mergeSingleCharRuns(tokens: string[]): string[] {
  const out: string[] = [];
  let run = '';
  for (const t of tokens) {
    if (t.length === 1) {
      run += t;
    } else {
      if (run) out.push(run);
      run = '';
      out.push(t);
    }
  }
  if (run) out.push(run);
  return out;
}

/**
 * Whether a buyer's raw name is safe to show on the public guest list.
 * Returns false for empty, denylisted, or operator-hidden names.
 */
export function isGuestNameAllowed(rawName: string | null | undefined): boolean {
  const name = rawName?.trim();
  if (!name) return false;

  const lower = name.toLowerCase();

  // Operator override — exact full-name match.
  if (hiddenNameSet().has(lower)) return false;

  // Substring slurs (catch run-together spellings).
  const collapsed = lower.replace(/[^a-z0-9]/g, '');
  if (DENY_SUBSTRINGS.some((s) => collapsed.includes(s))) return false;

  // Token-level profanity match, plus a pass that re-joins single-letter runs
  // so "f u c k" doesn't slip through.
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  if (hasDenyToken(tokens) || hasDenyToken(mergeSingleCharRuns(tokens))) return false;

  return true;
}
