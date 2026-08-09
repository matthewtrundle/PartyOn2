/**
 * Deterministic ingest for the /harvest-reviews browser capture.
 *
 * Input:  data/reviews/harvest/<date>/reviews.raw.json  (dumped verbatim by
 *         .claude/skills/harvest-reviews/extract-reviews.js — see SKILL.md)
 * Output: <dir>/candidates.json        structured result: new / duplicate / skipped
 *         <dir>/candidates.snippet.ts  paste-ready CUSTOMER_REVIEWS entries
 *         <dir>/avatars/<id>.webp      256px square webp per non-default avatar
 *         <dir>/photos/<id>-N.jpg      attached customer party photos, raw
 *
 * The script never touches src/lib/reviews/reviews.ts itself — a curation pass
 * (human or Claude) moves candidates in, per the rules in HARVEST.md. Quotes
 * are carried through byte-for-byte from the raw dump; the suggested excerpt
 * is always an exact substring of the quote, so the verbatim-integrity tests
 * in src/lib/reviews/__tests__ pass by construction.
 *
 * Usage:
 *   npx tsx scripts/reviews/ingest-review-harvest.ts data/reviews/harvest/2026-08-07
 *   npx tsx scripts/reviews/ingest-review-harvest.ts <dir> --no-download
 *   npx tsx scripts/reviews/ingest-review-harvest.ts --test   # fixture regression
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface RawReview {
  reviewId: string;
  author: string | null;
  rating: number | null;
  text: string;
  relativeDate: string | null;
  avatarUrl: string | null;
  photoUrls: string[];
  hasOwnerResponse: boolean;
  cardInnerText: string;
}

interface RawDump {
  placeUrl?: string;
  count?: number;
  reviews: RawReview[];
  error?: string;
}

interface PoolEntry {
  id: string;
  author: string;
  quote: string;
}

interface Candidate {
  id: string;
  author: string;
  quote: string;
  excerpt: string;
  highlight: string | null;
  context: string; // left empty — curation fills from the review's own content
  segments: string[];
  avatarBg: string;
  rating: number;
  relativeDate: string | null;
  reviewId: string;
  avatarDownloaded: boolean;
  possibleDuplicateOf: string | null; // same author already in pool, text differs
  flags: string[];
}

const PALETTE = ['#F2D34F', '#F5B0C5', '#7FC8F5', '#A8E0B0', '#E8B87F'];

/**
 * Anxiety vocabulary from HARVEST.md — reviews naming a pain point make the
 * best excerpts, so the suggested excerpt centers on the first match.
 */
const PAIN_PATTERNS: RegExp[] = [
  /\bworr(?:y|ied|ying)\b/i,
  /\bstress(?:ed|ful|-free)?\b/i,
  /\blast[ -]minute\b/i,
  /\bon time\b/i,
  /\brunning around\b/i,
  /\bhow much\b/i,
  /\blugging\b/i,
  /\bhaul(?:ing)?\b/i,
  /\b(?:didn'?t|did not|don'?t) have to\b/i,
  /\bsaved (?:us|me|the)\b/i,
  /\bseamless\b/i,
  /\bso easy\b/i,
  /\bmade it easy\b/i,
  /\btook care of\b/i,
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function kebab(author: string): string {
  return (
    author
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'reviewer'
  );
}

/** Segment inference — same spirit as lib/analytics/gbp.ts, mapped onto ReviewSegment. */
function inferSegments(text: string): string[] {
  const t = text.toLowerCase();
  const segments: string[] = [];
  if (/\bbachelorette\b/.test(t)) segments.push('bachelorette');
  else if (/\bbachelor(?!ette)\b|\bbach party\b|\bbach weekend\b/.test(t)) segments.push('bachelor');
  if (/\bwedding\b|\bbride\b|\bgroom\b|\breception\b|\brehearsal\b/.test(t)) segments.push('wedding');
  if (/\bcorporate\b|\boffice\b|\bcompany\b|\bteam[- ]building\b|\bholiday party\b|\btailgate\b/.test(t))
    segments.push('corporate');
  if (/\bboat\b|\blake\b|\bparty cove\b|\byacht\b|\bcruise\b|\bmarina\b|\bpontoon\b/.test(t))
    segments.push('boat');
  return segments.length ? segments : ['general'];
}

/**
 * Suggest an excerpt: the first sentence containing a pain phrase, trimmed to
 * ≤20 words as an EXACT substring of the quote (a 20-word window centered on
 * the match when the sentence runs long). Falls back to the first sentence.
 * Returns [excerpt, highlight].
 */
function suggestExcerpt(quote: string): [string, string | null] {
  const sentences = quote.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);

  let sentence: string | null = null;
  let highlight: string | null = null;
  outer: for (const s of sentences) {
    for (const p of PAIN_PATTERNS) {
      const m = s.match(p);
      if (m) {
        sentence = s;
        highlight = m[0];
        break outer;
      }
    }
  }
  if (!sentence) sentence = sentences[0] ?? quote;

  let excerpt = sentence.trim();
  const words = excerpt.split(/\s+/);
  if (words.length > 20) {
    // Center a 20-word window on the highlight (or take the first 20 words).
    let start = 0;
    if (highlight) {
      const idxWord = words.findIndex((w) => w.toLowerCase().includes(highlight!.toLowerCase().split(/\s+/)[0]));
      if (idxWord > -1) start = Math.max(0, Math.min(idxWord - 9, words.length - 20));
    }
    excerpt = words.slice(start, start + 20).join(' ');
  }

  // The window MUST be an exact substring of the quote (whitespace runs in the
  // original can differ from the single spaces we joined with) — verify, and
  // fall back to an indexOf-anchored slice when it isn't.
  if (!quote.includes(excerpt)) {
    const anchor = words.length > 20 ? excerpt.split(/\s+/)[0] : excerpt;
    const at = quote.indexOf(anchor);
    excerpt = at > -1 ? quote.slice(at, at + Math.min(140, quote.length - at)).trim() : quote.slice(0, 140).trim();
  }
  if (highlight && !excerpt.includes(highlight)) highlight = null;
  return [excerpt, highlight];
}

function isDefaultAvatar(url: string): boolean {
  return /default-user/i.test(url);
}

/** Bump googleusercontent size suffix to a crisp 400px square. */
function upsizeAvatarUrl(url: string): string {
  if (/=s\d+(-[a-z0-9-]+)*$/i.test(url)) return url.replace(/=s\d+(-[a-z0-9-]+)*$/i, '=s400-c');
  if (/=w\d+-h\d+(-[a-z0-9-]+)*$/i.test(url)) return url.replace(/=w\d+-h\d+(-[a-z0-9-]+)*$/i, '=s400-c');
  return url;
}

async function downloadAvatar(url: string, outPath: string): Promise<boolean> {
  try {
    const res = await fetch(upsizeAvatarUrl(url));
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    const sharp = (await import('sharp')).default;
    const webp = await sharp(buf).resize(256, 256, { fit: 'cover' }).webp({ quality: 78 }).toBuffer();
    writeFileSync(outPath, webp);
    if (webp.length > 25 * 1024) {
      console.warn(`  ⚠ ${outPath} is ${(webp.length / 1024).toFixed(0)}KB (>25KB target)`);
    }
    return true;
  } catch (e) {
    console.warn(`  ⚠ avatar download failed for ${url}: ${(e as Error).message}`);
    return false;
  }
}

async function downloadPhoto(url: string, outPath: string): Promise<void> {
  try {
    const res = await fetch(url.replace(/=w\d+-h\d+[^=]*$/i, '=s1600'));
    if (!res.ok) return;
    writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  } catch {
    // party photos are a bonus — never fail the ingest over one
  }
}

/**
 * Emit a single-quoted TS string literal. Multi-paragraph reviews carry real
 * newlines, which would terminate the literal mid-quote and make the whole
 * snippet unparseable — so every char that can't appear raw in a single-line
 * string is escaped, not just the backslash and quote.
 */
const TS_ESCAPES: Record<string, string> = {
  '\\': '\\\\',
  "'": "\\'",
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

function tsString(s: string): string {
  return `'${s.replace(/[\\'\n\r\t]/g, (ch) => TS_ESCAPES[ch])}'`;
}

function snippetFor(c: Candidate): string {
  const lines = [
    '  {',
    `    id: ${tsString(c.id)},`,
    `    author: ${tsString(c.author)},`,
    `    quote:`,
    `      ${tsString(c.quote)},`,
    `    excerpt:`,
    `      ${tsString(c.excerpt)},`,
  ];
  if (c.highlight) lines.push(`    highlight: ${tsString(c.highlight)},`);
  lines.push(
    `    context: ${tsString(c.context)}, // TODO curation: occasion line from the review's own content`,
    `    segments: [${c.segments.map(tsString).join(', ')}],`,
    `    avatarBg: ${tsString(c.avatarBg)},`,
  );
  if (c.avatarDownloaded) {
    lines.push(
      `    // photoSrc: '/images/reviewers/${c.id}.webp', // ENABLE ONLY after face-check; copy from harvest avatars/`,
    );
  }
  lines.push('  },');
  return lines.join('\n');
}

async function loadPool(poolArg: string | null): Promise<PoolEntry[]> {
  if (poolArg) {
    return JSON.parse(readFileSync(poolArg, 'utf8')) as PoolEntry[];
  }
  const mod = await import('../../src/lib/reviews/reviews');
  return (mod.CUSTOMER_REVIEWS as PoolEntry[]).map((r) => ({
    id: r.id,
    author: r.author,
    quote: r.quote,
  }));
}

export async function ingest(
  dir: string,
  opts: { download: boolean; poolPath: string | null },
): Promise<{ candidates: Candidate[]; duplicates: string[]; skipped: { author: string | null; reason: string }[] }> {
  const rawPath = join(dir, 'reviews.raw.json');
  if (!existsSync(rawPath)) throw new Error(`${rawPath} not found — run the browser capture first`);
  const dump = JSON.parse(readFileSync(rawPath, 'utf8')) as RawDump;
  if (dump.error) throw new Error(`raw dump reports an error: ${dump.error}`);

  const pool = await loadPool(opts.poolPath);
  const takenIds = new Set(pool.map((p) => p.id));
  const poolByAuthor = new Map(pool.map((p) => [normalize(p.author), p]));

  const candidates: Candidate[] = [];
  const duplicates: string[] = [];
  const skipped: { author: string | null; reason: string }[] = [];

  for (const r of dump.reviews) {
    if (!r.text || !r.text.trim()) {
      skipped.push({ author: r.author, reason: 'rating-only (no text)' });
      continue;
    }
    if (!r.author) {
      skipped.push({ author: null, reason: 'no author name extracted — inspect cardInnerText manually' });
      continue;
    }
    if (r.rating !== null && r.rating < 5) {
      skipped.push({ author: r.author, reason: `rating ${r.rating} — pool policy is 5★ quotes; curate manually if wanted` });
      continue;
    }

    const existing = poolByAuthor.get(normalize(r.author));
    const quoteNorm = normalize(r.text);
    if (existing) {
      const existingNorm = normalize(existing.quote);
      const probe = quoteNorm.slice(0, 60);
      if (existingNorm.includes(probe) || quoteNorm.includes(existingNorm.slice(0, 60))) {
        duplicates.push(`${r.author} → already in pool as '${existing.id}'`);
        continue;
      }
    }

    let id = kebab(r.author);
    let n = 2;
    while (takenIds.has(id)) id = `${kebab(r.author)}-${n++}`;
    takenIds.add(id);

    const [excerpt, highlight] = suggestExcerpt(r.text);
    const flags: string[] = [];
    if (r.hasOwnerResponse) flags.push('card includes an owner response — verify quote does not contain it');
    if (r.text.length < 40) flags.push('very short review');

    const candidate: Candidate = {
      id,
      author: r.author,
      quote: r.text,
      excerpt,
      highlight,
      context: '',
      segments: inferSegments(r.text),
      avatarBg: PALETTE[(pool.length + candidates.length) % PALETTE.length],
      rating: r.rating ?? 5,
      relativeDate: r.relativeDate,
      reviewId: r.reviewId,
      avatarDownloaded: false,
      possibleDuplicateOf: existing ? existing.id : null,
      flags,
    };

    if (opts.download && r.avatarUrl && !isDefaultAvatar(r.avatarUrl)) {
      const avatarsDir = join(dir, 'avatars');
      mkdirSync(avatarsDir, { recursive: true });
      candidate.avatarDownloaded = await downloadAvatar(r.avatarUrl, join(avatarsDir, `${id}.webp`));
    }
    if (opts.download && r.photoUrls.length) {
      const photosDir = join(dir, 'photos');
      mkdirSync(photosDir, { recursive: true });
      for (let i = 0; i < r.photoUrls.length; i++) {
        await downloadPhoto(r.photoUrls[i], join(photosDir, `${id}-${i + 1}.jpg`));
      }
    }

    candidates.push(candidate);
  }

  writeFileSync(join(dir, 'candidates.json'), JSON.stringify({ candidates, duplicates, skipped }, null, 2));
  writeFileSync(
    join(dir, 'candidates.snippet.ts'),
    [
      '// Paste-ready CUSTOMER_REVIEWS entries — curation still required:',
      '//  1. Tighten excerpt to the punchiest pain-point substring (stay verbatim).',
      '//  2. Fill context from the review content (never invent details).',
      '//  3. Face-check downloaded avatars before enabling photoSrc (HARVEST.md rules).',
      '',
      ...candidates.map(snippetFor),
      '',
    ].join('\n'),
  );

  return { candidates, duplicates, skipped };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--test')) {
    const fixtureDir = resolve(__dirname, 'fixtures/harvest-sample');
    const { candidates, duplicates, skipped } = await ingest(fixtureDir, {
      download: false,
      poolPath: join(fixtureDir, 'pool.json'),
    });
    const got = JSON.stringify({ candidates, duplicates, skipped }, null, 2);
    const expected = readFileSync(join(fixtureDir, 'expected-candidates.json'), 'utf8');
    if (got.trim() !== expected.trim()) {
      console.error('✗ ingest output diverged from fixtures/harvest-sample/expected-candidates.json');
      console.error('  (inspect candidates.json in the fixture dir vs expected, update expected only if the change is intended)');
      process.exit(1);
    }
    console.log('✓ ingest --test: output matches committed fixture');
    return;
  }

  const dir = args.find((a) => !a.startsWith('--'));
  if (!dir) {
    console.error('usage: npx tsx scripts/reviews/ingest-review-harvest.ts <harvest-dir> [--no-download]');
    process.exit(1);
  }
  const poolIdx = args.indexOf('--pool');
  const { candidates, duplicates, skipped } = await ingest(resolve(dir), {
    download: !args.includes('--no-download'),
    poolPath: poolIdx > -1 ? args[poolIdx + 1] : null,
  });

  console.log(`\n${candidates.length} new candidate(s), ${duplicates.length} already in pool, ${skipped.length} skipped`);
  for (const d of duplicates) console.log(`  dup: ${d}`);
  for (const s of skipped) console.log(`  skip: ${s.author ?? '<unknown>'} — ${s.reason}`);
  const withAvatar = candidates.filter((c) => c.avatarDownloaded).length;
  console.log(`  avatars downloaded: ${withAvatar} (face-check before enabling photoSrc)`);
  console.log(`\n→ ${join(dir, 'candidates.snippet.ts')}`);
}

// tsx runs this file as the entrypoint; only run main when not imported.
if (process.argv[1] && process.argv[1].includes('ingest-review-harvest')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
