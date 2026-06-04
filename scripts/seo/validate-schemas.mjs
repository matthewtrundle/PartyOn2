#!/usr/bin/env node
/**
 * Schema.org JSON-LD validator for the wedding cluster.
 *
 * Fetches each target URL, extracts every <script type="application/ld+json">
 * block from the raw HTML, parses it, and checks:
 *
 *   1. JSON parses cleanly
 *   2. @context = https://schema.org (or schema.org with http)
 *   3. @type is present
 *   4. Type-specific required fields are present (best-effort coverage —
 *      we focus on the schema types this project actually emits: Article,
 *      FAQPage, HowTo, EventVenue, LocalBusiness, Person, Service)
 *   5. Placeholder values like [DJ_NAME] are flagged as warnings
 *
 * Writes a markdown summary to docs/seo/schema-validation-2026-05.md.
 *
 * Usage:
 *   node scripts/seo/validate-schemas.mjs [baseUrl]
 *
 *   baseUrl defaults to https://partyondelivery.com — pass a Vercel preview
 *   URL like https://party-on2-git-dev-...vercel.app to validate a branch
 *   before merge.
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT_MD = path.join(REPO_ROOT, 'docs', 'seo', 'schema-validation-2026-05.md');

const BASE = process.argv[2] || 'https://partyondelivery.com';

const URLS = [
  { path: '/wedding-drink-calculator', label: 'Wedding Drink Calculator' },
  { path: '/austin-wedding-venue-boats', label: 'Boats as Wedding Venue' },
  { path: '/partners/austin-wedding-dj', label: 'Austin Wedding DJ (placeholder mode)' },
  { path: '/blog/best-small-wedding-venues-austin', label: 'Blog: Small Wedding Venues' },
  { path: '/blog/ultimate-guide-austin-weddings', label: 'Blog: Austin Wedding Planning Guide (pillar)' },
  { path: '/blog/ultimate-guide-austin-wedding-bar-service', label: 'Blog: Wedding Bar Service Guide' },
];

/** Type → required-field list (best effort against schema.org). */
const REQUIRED_FIELDS = {
  Article: ['headline'],
  FAQPage: ['mainEntity'],
  HowTo: ['name', 'step'],
  EventVenue: ['name'],
  LocalBusiness: ['name'],
  Person: ['name'],
  Service: ['serviceType', 'name'],
  WebPage: ['name'],
  BreadcrumbList: ['itemListElement'],
};

const PLACEHOLDER_RE = /\[(DJ_[A-Z_]+|TESTIMONIAL_\d+|COUPLE_\d+|VENUE_\d+|MONTH_YEAR_\d+|DJ_PRICING)\]/;

function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]+?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const trimmed = m[1].trim();
    // Skip blocks whose content doesn't start as JSON — these are typically
    // empty `<script type="application/ld+json"></script>` tags where the
    // lazy regex jumped to the next `</script>` on the page (e.g. a hydration
    // script). They aren't real JSON-LD payloads.
    if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) continue;
    blocks.push(trimmed);
  }
  return blocks;
}

function validateBlock(raw, idx) {
  const issues = [];
  const warnings = [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { idx, parsed: null, type: null, issues: [`JSON parse failed: ${err.message}`], warnings: [], ok: false };
  }

  // @graph wrapper handling: when @graph is present, @context is declared
  // once at the parent and inherited by every child. We only validate the
  // parent's @context in that case; children skip the @context check.
  const hasGraph = Array.isArray(parsed['@graph']);
  const nodes = hasGraph ? parsed['@graph'] : [parsed];

  if (hasGraph) {
    const ctx = parsed['@context'];
    if (!ctx) issues.push('@graph parent: missing @context');
    else if (typeof ctx === 'string' && !ctx.includes('schema.org')) {
      issues.push(`@graph parent: @context "${ctx}" is not schema.org`);
    }
  }

  const types = [];

  for (const node of nodes) {
    const t = Array.isArray(node['@type']) ? node['@type'][0] : node['@type'];
    types.push(t || '(no @type)');

    if (!hasGraph) {
      const ctx = node['@context'];
      if (!ctx) issues.push(`node type=${t}: missing @context`);
      else if (typeof ctx === 'string' && !ctx.includes('schema.org')) {
        issues.push(`node type=${t}: @context "${ctx}" is not schema.org`);
      }
    }

    if (!t) issues.push('node: missing @type');

    const required = REQUIRED_FIELDS[t];
    if (required) {
      for (const f of required) {
        if (node[f] === undefined || node[f] === null) {
          issues.push(`node type=${t}: missing required field "${f}"`);
        }
      }
    }

    // Placeholder check across all string values
    const json = JSON.stringify(node);
    const ph = json.match(PLACEHOLDER_RE);
    if (ph) warnings.push(`node type=${t}: placeholder "${ph[0]}" present in JSON-LD`);
  }

  return {
    idx,
    parsed,
    type: types.join(' + '),
    issues,
    warnings,
    ok: issues.length === 0,
  };
}

async function fetchPage(url) {
  const res = await fetch(url, { redirect: 'follow' });
  return { status: res.status, finalUrl: res.url, html: await res.text() };
}

async function validateUrl({ path: urlPath, label }) {
  const url = BASE + urlPath;
  let page;
  try {
    page = await fetchPage(url);
  } catch (err) {
    return { url, label, status: -1, blocks: [], error: err.message };
  }
  if (page.status >= 400) {
    return { url, label, status: page.status, blocks: [], error: `HTTP ${page.status}` };
  }
  const raw = extractJsonLd(page.html);
  const blocks = raw.map((r, i) => validateBlock(r, i));
  return {
    url,
    finalUrl: page.finalUrl,
    label,
    status: page.status,
    blocks,
  };
}

async function main() {
  const results = [];
  for (const target of URLS) {
    process.stdout.write(`[schema] fetching ${target.path}... `);
    const r = await validateUrl(target);
    results.push(r);
    if (r.error) console.log(`ERROR ${r.error}`);
    else console.log(`status=${r.status} blocks=${r.blocks.length} issues=${r.blocks.reduce((a, b) => a + b.issues.length, 0)}`);
  }

  // Build markdown report
  const lines = [];
  lines.push('---');
  lines.push('title: Schema.org JSON-LD Validation — Wedding Cluster — 2026-05');
  lines.push(`captured_at: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('source: scripts/seo/validate-schemas.mjs');
  lines.push(`base_url: ${BASE}`);
  lines.push('---');
  lines.push('');
  lines.push('# Schema.org JSON-LD Validation — Wedding Cluster');
  lines.push('');
  lines.push(`Generated by \`scripts/seo/validate-schemas.mjs\` against \`${BASE}\` on ${new Date().toISOString().slice(0, 10)}.`);
  lines.push('');
  lines.push('Validates each page\'s JSON-LD blocks for:');
  lines.push('1. Valid JSON syntax');
  lines.push('2. Presence of `@context` and `@type`');
  lines.push('3. Type-specific required fields (Article, FAQPage, HowTo, EventVenue, LocalBusiness, Person, Service)');
  lines.push('4. Presence of `[DJ_*]` / `[TESTIMONIAL_*]` placeholders (warnings, not errors)');
  lines.push('');

  const totalBlocks = results.reduce((a, r) => a + (r.blocks?.length || 0), 0);
  const totalIssues = results.reduce((a, r) => a + (r.blocks || []).reduce((b, c) => b + c.issues.length, 0), 0);
  const totalWarnings = results.reduce((a, r) => a + (r.blocks || []).reduce((b, c) => b + c.warnings.length, 0), 0);
  const totalErrors = results.filter((r) => r.error).length;

  lines.push('## Summary');
  lines.push('');
  lines.push(`- URLs scanned: ${results.length}`);
  lines.push(`- Fetch errors: ${totalErrors}`);
  lines.push(`- JSON-LD blocks found: ${totalBlocks}`);
  lines.push(`- Validation issues: **${totalIssues}**`);
  lines.push(`- Warnings (placeholders): ${totalWarnings}`);
  lines.push('');

  for (const r of results) {
    lines.push(`## ${r.label}`);
    lines.push('');
    lines.push(`URL: \`${r.url}\``);
    if (r.finalUrl && r.finalUrl !== r.url) lines.push(`Final URL (after redirects): \`${r.finalUrl}\``);
    lines.push(`Status: \`${r.status}\``);
    if (r.error) {
      lines.push(`**Error:** ${r.error}`);
      lines.push('');
      continue;
    }
    lines.push(`JSON-LD blocks: ${r.blocks.length}`);
    lines.push('');
    if (r.blocks.length === 0) {
      lines.push('No JSON-LD blocks found.');
      lines.push('');
      continue;
    }
    lines.push('| # | Type | Issues | Warnings |');
    lines.push('|---|---|---|---|');
    for (const b of r.blocks) {
      lines.push(`| ${b.idx + 1} | ${b.type || '(unknown)'} | ${b.issues.length} | ${b.warnings.length} |`);
    }
    lines.push('');
    for (const b of r.blocks) {
      if (b.issues.length === 0 && b.warnings.length === 0) continue;
      lines.push(`### Block ${b.idx + 1} — ${b.type}`);
      lines.push('');
      if (b.issues.length > 0) {
        lines.push('**Issues:**');
        for (const i of b.issues) lines.push(`- ${i}`);
        lines.push('');
      }
      if (b.warnings.length > 0) {
        lines.push('**Warnings:**');
        for (const w of b.warnings) lines.push(`- ${w}`);
        lines.push('');
      }
    }
  }

  await writeFile(OUT_MD, lines.join('\n') + '\n');
  console.log(`[schema] wrote ${OUT_MD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
