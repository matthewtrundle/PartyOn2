#!/usr/bin/env node
/**
 * Build a fix-list report from `image-dimensions-audit.json`.
 *
 * For each `<img>` entry missing width/height: tries to resolve the src to a
 * file under /public/, opens it with `sharp`, and suggests the real
 * dimensions.
 *
 * For each `next/image` with `fill` but no `sizes`: classifies the context
 * (hero, card-grid, thumbnail) by a few heuristics on the file path and
 * surrounding code, then emits a suggested `sizes` attribute.
 *
 * The report is human-readable JSON written to
 * docs/seo/image-dimensions-fix-list-<YYYY-MM-DD>.json. The fixes are
 * applied by hand via the Edit tool — there are no line numbers in the
 * audit, so an automated codemod would be brittle.
 *
 * Usage:
 *   node scripts/seo/add-image-dimensions.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const AUDIT_PATH = path.join(REPO_ROOT, 'image-dimensions-audit.json');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');

const today = new Date().toISOString().slice(0, 10);
const OUT_PATH = path.join(REPO_ROOT, 'docs', 'seo', `image-dimensions-fix-list-${today}.json`);

/**
 * Pull the src="…" or src={…} from a code snippet. Returns null if it's a
 * dynamic expression we can't resolve to a literal /public path.
 */
function extractSrc(snippet) {
  const literal = snippet.match(/src\s*=\s*["']([^"']+)["']/);
  if (literal) return literal[1];
  return null;
}

/**
 * Suggest a `sizes` attribute by context heuristics.
 */
function suggestSizes(file, snippet) {
  const fileLower = file.toLowerCase();
  const snippetLower = snippet.toLowerCase();

  if (fileLower.includes('hero') || snippetLower.includes('hero')) {
    return '100vw';
  }
  if (snippetLower.includes('priority')) {
    return '(max-width: 768px) 100vw, 1024px';
  }
  if (fileLower.includes('card') || snippetLower.includes('card')) {
    return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';
  }
  if (fileLower.includes('thumbnail') || snippetLower.includes('thumbnail') || snippetLower.includes('w-12') || snippetLower.includes('w-16')) {
    return '(max-width: 768px) 50vw, 25vw';
  }
  // Conservative default — mobile gets full width, desktop gets half.
  return '(max-width: 768px) 100vw, 50vw';
}

async function tryResolveDimensions(src) {
  if (!src || !src.startsWith('/')) return null;
  const filePath = path.join(PUBLIC_DIR, src);
  try {
    const meta = await sharp(filePath).metadata();
    if (meta.width && meta.height) return { width: meta.width, height: meta.height, resolved: src };
  } catch {
    return null;
  }
  return null;
}

async function main() {
  const raw = await fs.readFile(AUDIT_PATH, 'utf8');
  const audit = JSON.parse(raw);

  const imgFixes = [];
  const fillFixes = [];

  for (const [file, issues] of Object.entries(audit.issues)) {
    for (const issue of issues) {
      if (issue.type === 'Regular <img> missing dimensions') {
        const src = extractSrc(issue.code);
        const dims = await tryResolveDimensions(src);
        imgFixes.push({
          file,
          src,
          severity: issue.severity,
          suggested: dims, // null if dynamic or unresolvable
          snippet: issue.code,
        });
      } else if (issue.type === 'Next.js Image with fill but no sizes') {
        const suggestedSizes = suggestSizes(file, issue.code);
        fillFixes.push({
          file,
          severity: issue.severity,
          suggestedSizes,
          snippet: issue.code,
        });
      }
    }
  }

  const byFile = {};
  for (const fix of imgFixes) {
    (byFile[fix.file] ||= { img: [], fill: [] }).img.push(fix);
  }
  for (const fix of fillFixes) {
    (byFile[fix.file] ||= { img: [], fill: [] }).fill.push(fix);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    totals: {
      imgFixesTotal: imgFixes.length,
      imgFixesResolved: imgFixes.filter((f) => f.suggested).length,
      imgFixesUnresolvable: imgFixes.filter((f) => !f.suggested).length,
      fillFixesTotal: fillFixes.length,
      filesAffected: Object.keys(byFile).length,
    },
    byFile,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(summary, null, 2));

  console.log(`Wrote ${OUT_PATH}`);
  console.log(JSON.stringify(summary.totals, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
