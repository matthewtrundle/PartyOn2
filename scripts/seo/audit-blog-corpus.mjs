#!/usr/bin/env node
/**
 * Blog corpus audit (WS4 of the wedding-cluster build).
 *
 * Walks content/blog/posts/*.mdx and src/data/blog-posts/posts.json, extracts
 * frontmatter, classifies each post (KEEP / OPTIMIZE / REDIRECT / DELETE), and
 * cross-references the SEMrush keyword triage at
 * /Users/allan/Projects/Party On Delivery/PartyOn2-seo-snapshots/data/seo/semrush/2026-05-19/keyword-triage.json
 * (if present — falls back to no-cross-reference if the snapshots repo is missing).
 *
 * Outputs:
 *   docs/seo/blog-audit-2026-05.tsv  — one row per post
 *   docs/seo/blog-audit-2026-05.md   — human-readable summary
 *
 * Classification heuristics (documented in
 * docs/seo/wedding-cluster-build-notes-2026-05.md):
 *   REDIRECT — filename near-dupe of another post (slug distance ≤ 3)
 *   OPTIMIZE — post in `wedding` cluster but missing schema/keywords hints
 *   DELETE   — legacy JSON post under 200 words and not linked from any pillar
 *   KEEP     — default
 *
 * Usage:
 *   node scripts/seo/audit-blog-corpus.mjs
 *   node scripts/seo/audit-blog-corpus.mjs --json   # also emits .json variant
 */

import fs from 'fs/promises';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const MDX_DIR = path.join(REPO_ROOT, 'content', 'blog', 'posts');
const JSON_PATH = path.join(REPO_ROOT, 'src', 'data', 'blog-posts', 'posts.json');
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'seo');
const OUT_TSV = path.join(OUT_DIR, 'blog-audit-2026-05.tsv');
const OUT_MD = path.join(OUT_DIR, 'blog-audit-2026-05.md');
const TRIAGE_PATH = '/Users/allan/Projects/Party On Delivery/PartyOn2-seo-snapshots/data/seo/semrush/2026-05-19/keyword-triage.json';

const args = process.argv.slice(2);
const EMIT_JSON = args.includes('--json');

/**
 * Minimal frontmatter parser — handles the simple key: "value" / key: [a, b]
 * pattern used by the blog posts. Sufficient because we control the file
 * format; we don't need full gray-matter.
 */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  const [, fmRaw, body] = match;
  const fm = {};
  for (const line of fmRaw.split('\n')) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    }
    fm[key] = val;
  }
  return { frontmatter: fm, body };
}

/** Word-count of body text, stripping JSX/HTML tags. */
function wordCount(text) {
  const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\{[^}]+\}/g, ' ');
  return stripped.trim().split(/\s+/).filter(Boolean).length;
}

/** Levenshtein distance (small bounded variant) for slug-dupe detection. */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

/**
 * Tokenize a slug into a sorted set of meaningful words (drops stopwords like
 * "near", "the", "a", "in", "to", "at", "for", "of", "your", "on", "and").
 */
function slugTokens(slug) {
  const STOPWORDS = new Set([
    'a','an','the','and','or','of','for','to','at','in','on','your','near','best',
    's','how','plan','with','around','from','about','this','that','it','is',
  ]);
  return new Set(
    slug.split('-')
      .map((t) => t.toLowerCase())
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  );
}

/** Jaccard similarity over token sets. */
function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Build a slug-similarity map. Returns Map<slug, canonicalSlug>.
 * Heuristics combined to catch real-world dupes:
 *   - Levenshtein ≤ 3 (catches single-word swaps)
 *   - Jaccard ≥ 0.7 on meaningful token set (catches reordered / prefix-suffix variants)
 *   - First-half substring containment (catches "X" vs "X-with-packages")
 * Canonical = shorter slug; tiebreaker = alphabetically first.
 */
function findNearDuplicates(slugs) {
  const dupes = new Map();
  const tokenCache = new Map(slugs.map((s) => [s, slugTokens(s)]));
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const a = slugs[i];
      const b = slugs[j];
      let isDupe = false;
      // Cheap distance check first
      if (Math.abs(a.length - b.length) <= 5) {
        const dist = levenshtein(a, b);
        if (dist > 0 && dist <= 3) isDupe = true;
      }
      if (!isDupe) {
        const sim = jaccard(tokenCache.get(a), tokenCache.get(b));
        if (sim >= 0.7) isDupe = true;
      }
      if (!isDupe) {
        // Prefix containment: one slug fully contains the other's first 4 tokens
        const tokA = a.split('-');
        const tokB = b.split('-');
        const prefA = tokA.slice(0, 4).join('-');
        const prefB = tokB.slice(0, 4).join('-');
        if (prefA.length >= 12 && prefA === prefB) {
          // Same first 4 tokens → likely variant
          const overlap = jaccard(tokenCache.get(a), tokenCache.get(b));
          if (overlap >= 0.5) isDupe = true;
        }
      }
      if (isDupe) {
        const [keep, redirect] = a.length === b.length
          ? (a < b ? [a, b] : [b, a])
          : (a.length < b.length ? [a, b] : [b, a]);
        if (!dupes.has(redirect)) dupes.set(redirect, keep);
      }
    }
  }
  return dupes;
}

async function loadTriageKeywords() {
  try {
    const raw = await fs.readFile(TRIAGE_PATH, 'utf-8');
    const json = JSON.parse(raw);
    const set = new Set();
    for (const tier of Object.values(json.tiers ?? {})) {
      for (const entry of tier) {
        if (entry.keyword) set.add(entry.keyword.toLowerCase());
      }
    }
    return set;
  } catch {
    return null;
  }
}

function classify({ frontmatter, words, slug, source, dupes, triageKeywords, hasInternalLinks }) {
  if (dupes.has(slug)) {
    return { status: 'REDIRECT', target: `/blog/${dupes.get(slug)}`, reason: `near-dupe of ${dupes.get(slug)}` };
  }
  if (source === 'json' && words < 200 && !hasInternalLinks) {
    return { status: 'DELETE', target: null, reason: 'legacy JSON, thin (<200 words), no internal links' };
  }
  // OPTIMIZE: wedding-cluster post whose title doesn't match any triage keyword
  const title = (frontmatter.title ?? '').toLowerCase();
  const pillar = (frontmatter.pillarSlug ?? '').toLowerCase();
  const isWedding = pillar.includes('wedding') || title.includes('wedding');
  if (isWedding && triageKeywords) {
    let titleMatchesTriage = false;
    for (const kw of triageKeywords) {
      if (title.includes(kw)) { titleMatchesTriage = true; break; }
    }
    if (!titleMatchesTriage) {
      return { status: 'OPTIMIZE', target: null, reason: 'wedding cluster, no triage-keyword match in title' };
    }
  }
  return { status: 'KEEP', target: null, reason: 'default' };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const triageKeywords = await loadTriageKeywords();
  const triageStatus = triageKeywords ? `loaded ${triageKeywords.size} keywords` : 'unavailable (snapshots repo missing or unreadable)';
  console.log(`[audit] triage: ${triageStatus}`);

  const rows = [];

  // MDX posts
  const mdxFiles = await fs.readdir(MDX_DIR);
  for (const fname of mdxFiles) {
    if (!fname.endsWith('.mdx')) continue;
    const slug = fname.replace(/\.mdx$/, '');
    const raw = await fs.readFile(path.join(MDX_DIR, fname), 'utf-8');
    const { frontmatter, body } = parseFrontmatter(raw);
    const words = wordCount(body);
    const hasInternalLinks = /href=["']\/[^"'#]+["']/.test(body) || /\]\(\/[^)]+\)/.test(body);
    rows.push({
      slug,
      source: 'mdx',
      title: frontmatter.title ?? '',
      pillarSlug: frontmatter.pillarSlug ?? '',
      category: frontmatter.category ?? '',
      date: frontmatter.date ?? '',
      words,
      hasInternalLinks,
      frontmatter,
    });
  }

  // Legacy JSON posts
  try {
    const json = JSON.parse(await fs.readFile(JSON_PATH, 'utf-8'));
    for (const post of json) {
      const slug = post.slug;
      if (!slug) continue;
      const body = post.content ?? '';
      const words = wordCount(body);
      const hasInternalLinks = /href=["']https?:\/\/partyondelivery\.com\/[^"'#]+["']/.test(body) || /href=["']\/[^"'#]+["']/.test(body);
      rows.push({
        slug,
        source: 'json',
        title: post.title ?? '',
        pillarSlug: '',
        category: (post.tags ?? []).join(';'),
        date: post.publishedAt ?? '',
        words,
        hasInternalLinks,
        frontmatter: { title: post.title ?? '' },
      });
    }
  } catch (err) {
    console.warn(`[audit] could not read JSON posts: ${err.message}`);
  }

  // Dupe detection across all slugs
  const slugs = rows.map((r) => r.slug);
  const sourceBySlug = new Map(rows.map((r) => [r.slug, r.source]));

  // Load pillar slugs from topic-clusters.ts (regex extraction — safer than
  // trying to import TS into a .mjs script). Pillars must never be the
  // "redirect" side of a 301; they're authoritative.
  const PILLAR_SLUGS = new Set();
  try {
    const tcRaw = await fs.readFile(path.join(REPO_ROOT, 'src', 'lib', 'topic-clusters.ts'), 'utf-8');
    for (const m of tcRaw.matchAll(/pillarSlug:\s*['"]([^'"]+)['"]/g)) {
      PILLAR_SLUGS.add(m[1]);
    }
  } catch {
    // best effort
  }

  const rawDupes = findNearDuplicates(slugs);
  const dupes = new Map();
  for (const [redirect, keep] of rawDupes.entries()) {
    // Skip if redirecting a pillar — flip direction or skip entirely.
    let actualRedirect = redirect;
    let actualKeep = keep;
    if (PILLAR_SLUGS.has(redirect) && !PILLAR_SLUGS.has(keep)) {
      // Flip: keep the pillar, redirect the variant.
      actualRedirect = keep;
      actualKeep = redirect;
    } else if (PILLAR_SLUGS.has(redirect) && PILLAR_SLUGS.has(keep)) {
      // Both are pillars — refuse, leave for human review.
      continue;
    }
    // Only retain dupes where at least one side is MDX (safer than redirecting
    // inside the legacy JSON-only set).
    if (sourceBySlug.get(actualRedirect) === 'mdx' || sourceBySlug.get(actualKeep) === 'mdx') {
      dupes.set(actualRedirect, actualKeep);
    }
  }

  // Flatten chains: if A→B and B→C, rewrite A→C so redirects are single-hop.
  for (const [from, to] of [...dupes.entries()]) {
    let target = to;
    const seen = new Set([from]);
    while (dupes.has(target)) {
      if (seen.has(target)) break;
      seen.add(target);
      target = dupes.get(target);
    }
    if (target !== to) dupes.set(from, target);
  }

  // Classification
  for (const row of rows) {
    const cls = classify({
      frontmatter: row.frontmatter,
      words: row.words,
      slug: row.slug,
      source: row.source,
      dupes,
      triageKeywords,
      hasInternalLinks: row.hasInternalLinks,
    });
    row.status = cls.status;
    row.redirectTarget = cls.target;
    row.reason = cls.reason;
  }

  // TSV output
  const tsvHeader = ['slug', 'source', 'title', 'pillarSlug', 'category', 'date', 'words', 'hasInternalLinks', 'status', 'redirectTarget', 'reason'].join('\t');
  const tsvRows = rows.map((r) => [
    r.slug,
    r.source,
    (r.title ?? '').replace(/\t/g, ' '),
    r.pillarSlug,
    r.category,
    r.date,
    r.words,
    r.hasInternalLinks ? '1' : '0',
    r.status,
    r.redirectTarget ?? '',
    (r.reason ?? '').replace(/\t/g, ' '),
  ].join('\t'));
  await fs.writeFile(OUT_TSV, [tsvHeader, ...tsvRows].join('\n') + '\n');

  // Summary counts
  const counts = { KEEP: 0, OPTIMIZE: 0, REDIRECT: 0, DELETE: 0 };
  for (const r of rows) counts[r.status]++;

  // Cluster breakdown
  const byCluster = new Map();
  for (const r of rows) {
    const key = r.pillarSlug || '(none)';
    if (!byCluster.has(key)) byCluster.set(key, []);
    byCluster.get(key).push(r);
  }

  // Markdown summary
  const lines = [];
  lines.push('---');
  lines.push('title: Blog Corpus Audit — 2026-05');
  lines.push('captured_at: 2026-05-20');
  lines.push('source: scripts/seo/audit-blog-corpus.mjs');
  lines.push('---');
  lines.push('');
  lines.push('# Blog Corpus Audit — 2026-05');
  lines.push('');
  lines.push('Generated by `scripts/seo/audit-blog-corpus.mjs`. Re-run any time to refresh.');
  lines.push('');
  lines.push(`Triage keywords loaded: ${triageStatus}`);
  lines.push('');
  lines.push('## Totals');
  lines.push('');
  lines.push(`- Total posts: ${rows.length} (${rows.filter(r => r.source === 'mdx').length} MDX + ${rows.filter(r => r.source === 'json').length} legacy JSON)`);
  lines.push(`- KEEP: ${counts.KEEP}`);
  lines.push(`- OPTIMIZE: ${counts.OPTIMIZE}`);
  lines.push(`- REDIRECT: ${counts.REDIRECT}`);
  lines.push(`- DELETE: ${counts.DELETE}`);
  lines.push('');
  lines.push('## Redirects required');
  lines.push('');
  const redirects = rows.filter(r => r.status === 'REDIRECT');
  if (redirects.length === 0) {
    lines.push('(none)');
  } else {
    lines.push('| Source slug | Target | Reason |');
    lines.push('|-------------|--------|--------|');
    for (const r of redirects) {
      lines.push(`| ${r.slug} | ${r.redirectTarget} | ${r.reason} |`);
    }
  }
  lines.push('');
  lines.push('## Optimize candidates');
  lines.push('');
  const optimize = rows.filter(r => r.status === 'OPTIMIZE');
  if (optimize.length === 0) {
    lines.push('(none)');
  } else {
    lines.push('| Slug | Pillar | Words | Reason |');
    lines.push('|------|--------|-------|--------|');
    for (const r of optimize) {
      lines.push(`| ${r.slug} | ${r.pillarSlug} | ${r.words} | ${r.reason} |`);
    }
  }
  lines.push('');
  lines.push('## Delete candidates');
  lines.push('');
  const deleteCands = rows.filter(r => r.status === 'DELETE');
  if (deleteCands.length === 0) {
    lines.push('(none)');
  } else {
    lines.push('| Slug | Source | Words | Reason |');
    lines.push('|------|--------|-------|--------|');
    for (const r of deleteCands) {
      lines.push(`| ${r.slug} | ${r.source} | ${r.words} | ${r.reason} |`);
    }
  }
  lines.push('');
  lines.push('## By cluster');
  lines.push('');
  const sortedClusters = [...byCluster.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [cluster, posts] of sortedClusters) {
    lines.push(`### ${cluster} (${posts.length})`);
    lines.push('');
    for (const p of posts) {
      lines.push(`- \`${p.slug}\` — ${p.status}${p.redirectTarget ? ` → ${p.redirectTarget}` : ''}`);
    }
    lines.push('');
  }

  await fs.writeFile(OUT_MD, lines.join('\n') + '\n');

  if (EMIT_JSON) {
    const OUT_JSON = path.join(OUT_DIR, 'blog-audit-2026-05.json');
    await fs.writeFile(OUT_JSON, JSON.stringify({ generated_at: new Date().toISOString(), counts, rows }, null, 2));
    console.log(`[audit] wrote ${OUT_JSON}`);
  }

  console.log(`[audit] wrote ${OUT_TSV}`);
  console.log(`[audit] wrote ${OUT_MD}`);
  console.log(`[audit] totals: KEEP=${counts.KEEP} OPTIMIZE=${counts.OPTIMIZE} REDIRECT=${counts.REDIRECT} DELETE=${counts.DELETE}`);
}

main().catch((err) => {
  console.error('[audit] failed:', err);
  process.exit(1);
});
