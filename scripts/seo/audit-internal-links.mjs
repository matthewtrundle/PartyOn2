#!/usr/bin/env node
/**
 * Internal-link audit for the wedding cluster.
 *
 * Walks content/blog/posts/*.mdx and src/data/blog-posts/posts.json. For
 * every wedding-cluster post (pillarSlug: ultimate-guide-austin-weddings
 * or category contains "Weddings"), counts how many link to each of the
 * three new wedding-cluster destinations:
 *
 *   - /wedding-drink-calculator
 *   - /austin-wedding-venue-boats
 *   - /partners/austin-wedding-dj
 *
 * Identifies orphan wedding posts (zero links to any of the three) and
 * reports overall coverage. Output:
 *
 *   docs/seo/internal-link-audit-2026-05.md
 *   docs/seo/internal-link-audit-2026-05.tsv
 *
 * Usage:
 *   node scripts/seo/audit-internal-links.mjs
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const MDX_DIR = path.join(REPO_ROOT, 'content', 'blog', 'posts');
const JSON_PATH = path.join(REPO_ROOT, 'src', 'data', 'blog-posts', 'posts.json');
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'seo');
const OUT_MD = path.join(OUT_DIR, 'internal-link-audit-2026-05.md');
const OUT_TSV = path.join(OUT_DIR, 'internal-link-audit-2026-05.tsv');

const TARGETS = [
  { key: 'calculator', path: '/wedding-drink-calculator', label: 'Calculator' },
  { key: 'venueBoats', path: '/austin-wedding-venue-boats', label: 'Venue Boats' },
  { key: 'dj', path: '/partners/austin-wedding-dj', label: 'DJ Partner' },
];

function parseFrontmatter(src) {
  const match = src.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([a-zA-Z_][\w]*):\s*(.+?)\s*$/);
    if (m) fm[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return fm;
}

function isWeddingCluster(meta, body) {
  const pillar = (meta.pillarSlug || '').toLowerCase();
  const cat = (meta.category || '').toLowerCase();
  if (pillar.includes('wedding') || pillar.includes('engagement')) return true;
  if (cat.includes('wedding') || cat.includes('engagement')) return true;
  // Body fallback: posts that talk extensively about weddings
  const lower = body.toLowerCase();
  const weddingMentions = (lower.match(/\bwedding\b/g) || []).length;
  return weddingMentions >= 5;
}

function countLinks(body, urlPath) {
  // Match the path in href, markdown link, or plain text — but not inside
  // a sub-route (e.g. /weddings shouldn't count for /wedding-drink-calculator)
  const escaped = urlPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`, 'g');
  return (body.match(re) || []).length;
}

async function loadMdxPosts() {
  const files = await readdir(MDX_DIR);
  const out = [];
  for (const f of files) {
    if (!f.endsWith('.mdx')) continue;
    const slug = f.replace(/\.mdx$/, '');
    const src = await readFile(path.join(MDX_DIR, f), 'utf8');
    const meta = parseFrontmatter(src);
    const body = src.replace(/^---\n[\s\S]+?\n---/, '');
    out.push({ slug, source: 'mdx', meta, body });
  }
  return out;
}

async function loadJsonPosts() {
  const raw = await readFile(JSON_PATH, 'utf8');
  const posts = JSON.parse(raw);
  return posts.map((p) => ({
    slug: p.slug,
    source: 'json',
    meta: { title: p.title || '', category: p.category || '', pillarSlug: p.pillarSlug || '' },
    body: typeof p.content === 'string' ? p.content : '',
  }));
}

function buildReport(all) {
  // Per-post link counts
  const rows = all.map((p) => {
    const counts = {};
    for (const t of TARGETS) counts[t.key] = countLinks(p.body, t.path);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return {
      slug: p.slug,
      source: p.source,
      title: p.meta.title || '',
      pillar: p.meta.pillarSlug || '',
      category: p.meta.category || '',
      isWeddingCluster: isWeddingCluster(p.meta, p.body),
      counts,
      totalLinks: total,
    };
  });

  // Filter to wedding cluster only
  const wedding = rows.filter((r) => r.isWeddingCluster);
  const orphans = wedding.filter((r) => r.totalLinks === 0);
  const linkedToCalculator = wedding.filter((r) => r.counts.calculator > 0);
  const linkedToVenueBoats = wedding.filter((r) => r.counts.venueBoats > 0);
  const linkedToDj = wedding.filter((r) => r.counts.dj > 0);

  return {
    rows,
    wedding,
    orphans,
    linkedToCalculator,
    linkedToVenueBoats,
    linkedToDj,
  };
}

function fmtSlug(s) {
  return s.length > 70 ? s.slice(0, 67) + '...' : s;
}

async function writeMd(report) {
  const { rows, wedding, orphans, linkedToCalculator, linkedToVenueBoats, linkedToDj } = report;
  const lines = [];
  lines.push('---');
  lines.push('title: Internal-Link Audit — Wedding Cluster — 2026-05');
  lines.push(`captured_at: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('source: scripts/seo/audit-internal-links.mjs');
  lines.push('---');
  lines.push('');
  lines.push('# Internal-Link Audit — Wedding Cluster');
  lines.push('');
  lines.push(`Generated by \`scripts/seo/audit-internal-links.mjs\` on ${new Date().toISOString().slice(0, 10)}.`);
  lines.push('');
  lines.push('Measures cross-link coverage from wedding-cluster blog posts to the three new wedding-cluster destinations shipped in PRs #81 / #82 / #84.');
  lines.push('');

  lines.push('## Targets');
  lines.push('');
  for (const t of TARGETS) {
    lines.push(`- **${t.label}** → \`${t.path}\``);
  }
  lines.push('');

  lines.push('## Totals');
  lines.push('');
  lines.push(`- Total posts scanned: ${rows.length}`);
  lines.push(`- Wedding-cluster posts: ${wedding.length}`);
  lines.push(`- Orphan posts (zero links to any target): **${orphans.length}**`);
  lines.push(`- Posts linking to Calculator: ${linkedToCalculator.length} / ${wedding.length}`);
  lines.push(`- Posts linking to Venue Boats: ${linkedToVenueBoats.length} / ${wedding.length}`);
  lines.push(`- Posts linking to DJ Partner: ${linkedToDj.length} / ${wedding.length}`);
  lines.push('');

  lines.push('## Coverage by destination');
  lines.push('');
  lines.push('| Destination | Linking posts | Coverage |');
  lines.push('|---|---|---|');
  const cov = (n) => wedding.length === 0 ? '—' : `${Math.round((n / wedding.length) * 100)}%`;
  lines.push(`| Calculator | ${linkedToCalculator.length} | ${cov(linkedToCalculator.length)} |`);
  lines.push(`| Venue Boats | ${linkedToVenueBoats.length} | ${cov(linkedToVenueBoats.length)} |`);
  lines.push(`| DJ Partner | ${linkedToDj.length} | ${cov(linkedToDj.length)} |`);
  lines.push('');

  if (orphans.length > 0) {
    lines.push('## Orphan wedding-cluster posts (no links to any target)');
    lines.push('');
    lines.push('| Slug | Source | Category | Pillar |');
    lines.push('|---|---|---|---|');
    for (const o of orphans) {
      lines.push(`| \`${fmtSlug(o.slug)}\` | ${o.source} | ${o.category} | ${o.pillar} |`);
    }
    lines.push('');
    lines.push('Each of these is a candidate for an inline cross-link to one or more of the three targets. Recommended pattern: at the end of the intro (paragraph 1 or 2), add one sentence linking to the most contextually-relevant target.');
    lines.push('');
  }

  lines.push('## All wedding-cluster posts (link counts)');
  lines.push('');
  lines.push('| Slug | Source | Calc | Venue | DJ | Total |');
  lines.push('|---|---|---|---|---|---|');
  const sortedWed = [...wedding].sort((a, b) => b.totalLinks - a.totalLinks || a.slug.localeCompare(b.slug));
  for (const w of sortedWed) {
    lines.push(`| \`${fmtSlug(w.slug)}\` | ${w.source} | ${w.counts.calculator} | ${w.counts.venueBoats} | ${w.counts.dj} | ${w.totalLinks} |`);
  }
  lines.push('');

  await writeFile(OUT_MD, lines.join('\n') + '\n');
}

async function writeTsv(report) {
  const { rows } = report;
  const header = ['slug', 'source', 'isWeddingCluster', 'pillar', 'category', 'calculatorLinks', 'venueBoatsLinks', 'djLinks', 'totalLinks'].join('\t');
  const body = rows
    .map((r) =>
      [
        r.slug,
        r.source,
        r.isWeddingCluster ? '1' : '0',
        r.pillar,
        r.category,
        r.counts.calculator,
        r.counts.venueBoats,
        r.counts.dj,
        r.totalLinks,
      ].join('\t'),
    )
    .join('\n');
  await writeFile(OUT_TSV, header + '\n' + body + '\n');
}

async function main() {
  const [mdx, json] = await Promise.all([loadMdxPosts(), loadJsonPosts()]);
  const all = [...mdx, ...json];
  const report = buildReport(all);
  await writeMd(report);
  await writeTsv(report);
  console.log(`[internal-link-audit] wedding=${report.wedding.length} orphans=${report.orphans.length} calc=${report.linkedToCalculator.length} venue=${report.linkedToVenueBoats.length} dj=${report.linkedToDj.length}`);
  console.log(`[internal-link-audit] wrote ${OUT_MD}`);
  console.log(`[internal-link-audit] wrote ${OUT_TSV}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
