#!/usr/bin/env node
/**
 * Deterministic keyword triage for partyondelivery.com SEMrush tracked set.
 *
 * Node port of the original Python script that lives in the SEO snapshots
 * sibling repo at `data/seo/semrush/2026-05-19/raw/triage.py`. Pulled into
 * the engineering repo so it sits next to `parse-semrush-snapshot.mjs` and
 * the rest of the SEO tooling.
 *
 * Input:  pipe-delimited TSV with one keyword row per line and a header
 *         row. Columns (in order):
 *           keyword | intent | sf | kd | pot_traffic | pot_growth |
 *           pos_may14 | pos_may20 | pos_diff_raw | visibility_pct |
 *           visibility_diff | est_traffic | est_traffic_diff | volume |
 *           cpc | url
 *
 *         The two `pos_*` column names are historical (the original
 *         snapshot was May 14 vs May 20 2026). For new snapshots feel
 *         free to keep those column names — the script just uses the
 *         second one as "current position."
 *
 * Output: <input-dir>/keyword-triage.json (or wherever --output points)
 *
 * Scoring:
 *   opportunity = volume × intent_weight × difficulty_factor × position_factor
 * where
 *   intent_weight    T=1.0, C=0.85, "I C"=0.7, "I T"=0.85, I=0.5, N=0.3
 *   difficulty_factor = max(0, 1 − kd/100)
 *   position_factor:
 *     not ranking         1.0   (full upside)
 *     pos 11-20           0.9   (striking distance)
 *     pos 21-50           0.6   (mid-range)
 *     pos 51-100          0.3   (deep)
 *     pos 4-10            0.5   (already on p1, smaller upside)
 *     pos 1-3             0.05  (ceiling)
 *
 * Tiers:
 *   S       quick wins         vol >= 100, kd <= 20, pos null or 11-50,
 *                              commercial-ish intent (T / C / I C / I T)
 *   A       high-volume push   vol >= 500, kd <= 35
 *   B       mid-tier           vol >= 100, kd <= 50
 *   C-hold  defensive          pos 1-3 with any visibility
 *   D       declining          visibility_diff <= -0.5
 *   E       everything else
 *   Z       junk               vol == 0 and (pos null or pos > 50)
 *
 * Usage:
 *   node scripts/seo/triage-keywords.mjs \
 *     --input  /path/to/keyword-table.tsv \
 *     --output /path/to/keyword-triage.json \
 *     --date   2026-06-04 \
 *     --source "Position Tracking Rankings Overview (Austin Desktop)"
 *
 *   --input is the only required arg. --output defaults to a sibling
 *   keyword-triage.json next to the input. --date defaults to today.
 *
 * Self-test:
 *   node scripts/seo/triage-keywords.mjs --test [<fixture-path>]
 *     Re-runs against the committed 2026-05-19 keyword-triage.json (or a
 *     fixture you point it at) and diffs every keyword's tier + score to
 *     prove the port is byte-identical to the Python original.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------- Algorithm -----------------------------

const INTENT_WEIGHT = {
  T: 1.0,
  C: 0.85,
  'I C': 0.7,
  'I T': 0.85,
  I: 0.5,
  N: 0.3,
  '': 0.5,
};

/** Parse SEMrush-formatted number strings into a number or null. */
function fnum(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === '' || s === '—' || s === '-' || s === 'lost') return null;
  if (s === '↑' || s === '↓') return null;
  let v = s.replace(/,/g, '').replace(/%/g, '');
  if (v.startsWith('<')) return 0.0;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function positionFactor(pos) {
  if (pos === null || pos === undefined) return 1.0;
  if (pos <= 3) return 0.05;
  if (pos <= 10) return 0.5;
  if (pos <= 20) return 0.9;
  if (pos <= 50) return 0.6;
  return 0.3;
}

function difficultyFactor(kd) {
  if (kd === null || kd === undefined) return 0.5;
  return Math.max(0.0, 1.0 - kd / 100.0);
}

function opportunityScore(row) {
  const vol = row.volume ?? 0;
  const kw = INTENT_WEIGHT[row.intent] ?? 0.5;
  const df = difficultyFactor(row.kd);
  const pf = positionFactor(row.pos_current);
  return Math.round(vol * kw * df * pf * 100) / 100;
}

function classifyTier(row) {
  const vol = row.volume ?? 0;
  const kd = row.kd ?? 100;
  const pos = row.pos_current;
  const intent = row.intent;
  const visDiff = row.visibility_diff ?? 0;
  const visPct = row.visibility_pct ?? 0;
  const commercialIntent = intent === 'T' || intent === 'C' || intent === 'I C' || intent === 'I T';

  if (visDiff <= -0.5) return 'D';
  if (pos !== null && pos !== undefined && pos <= 3 && visPct > 0) return 'C-hold';
  if (vol === 0 && (pos === null || pos === undefined || pos > 50)) return 'Z';
  if (vol >= 100 && kd <= 20 && (pos === null || pos === undefined || pos >= 11) && commercialIntent) {
    return 'S';
  }
  if (vol >= 500 && kd <= 35) return 'A';
  if (vol >= 100 && kd <= 50) return 'B';
  return 'E';
}

function recommendation(row) {
  const pos = row.pos_current;
  const vol = row.volume ?? 0;
  const kd = row.kd;
  const parts = [];

  if (pos === null || pos === undefined) {
    parts.push('Not ranking — need a dedicated page targeting this query');
  } else if (pos <= 3) {
    parts.push(`Holding pos ${Math.trunc(pos)} — protect with internal links + structured data`);
  } else if (pos <= 10) {
    parts.push(`Page 1 at pos ${Math.trunc(pos)} — push to top 3 with on-page improvements + schema`);
  } else if (pos <= 20) {
    parts.push(`Striking distance at pos ${Math.trunc(pos)} — single page optimization should move this`);
  } else {
    parts.push(`Deep at pos ${Math.trunc(pos)} — likely indexation or content quality issue`);
  }

  if (vol >= 1000) parts.push(`HIGH VOLUME (${vol})`);
  else if (vol >= 100) parts.push(`Volume ${vol}`);

  if (kd !== null && kd !== undefined && kd <= 20) parts.push(`EASY (KD ${Math.trunc(kd)})`);
  else if (kd !== null && kd !== undefined && kd <= 35) parts.push(`Medium (KD ${Math.trunc(kd)})`);

  return parts.join(' · ');
}

// ----------------------------- Parsing -----------------------------

/**
 * Parse the pipe-delimited TSV body (header + N rows) into normalized rows
 * keyed by the canonical column names below.
 */
function parseTsv(text) {
  const lines = text.split('\n').filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new Error('TSV input has no data rows (need header + at least one row)');
  }
  const headerCols = lines[0].split('|').map((c) => c.trim());

  // Field map: TSV column name → canonical row field.
  // The original Python read columns by literal name (pos_may14, pos_may20,
  // etc.). Future snapshots can rename these — the second numbered pos_*
  // column is treated as "current". Explicitly exclude pos_diff_raw and
  // similar delta/raw columns from this filter so we don't accidentally
  // treat "↑ 1" arrow strings as current positions.
  const posCols = headerCols.filter((c) => /^pos_/.test(c) && !/_(raw|diff)$/.test(c));
  const posFirstCol = posCols[0];
  const posCurrentCol = posCols[posCols.length - 1];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('|').map((c) => c.trim());
    const r = {};
    headerCols.forEach((col, idx) => {
      r[col] = cells[idx] ?? '';
    });
    rows.push({
      keyword: r.keyword || '',
      intent: r.intent || '',
      sf: fnum(r.sf),
      kd: fnum(r.kd),
      pot_traffic: fnum(r.pot_traffic),
      pot_growth: fnum(r.pot_growth),
      pos_first: posFirstCol ? fnum(r[posFirstCol]) : null,
      pos_current: posCurrentCol ? fnum(r[posCurrentCol]) : null,
      pos_diff_raw: r.pos_diff_raw || '',
      visibility_pct: fnum(r.visibility_pct),
      visibility_diff: fnum(r.visibility_diff),
      est_traffic: fnum(r.est_traffic),
      est_traffic_diff: fnum(r.est_traffic_diff),
      volume: fnum(r.volume),
      cpc: fnum(r.cpc),
      url: r.url ? r.url.trim() : null,
    });
  }
  return rows;
}

// ----------------------------- Main flow -----------------------------

function todayIso() {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

function buildTriageObject(rows, opts = {}) {
  for (const r of rows) {
    r.opportunity_score = opportunityScore(r);
    r.tier = classifyTier(r);
    r.recommendation = recommendation(r);
  }

  // Bucket rows by tier in INSERTION order (Python defaultdict semantics).
  // This determines the order keys appear in summary.by_tier — matching
  // Python keeps --test diffs byte-clean.
  const tiers = {};
  const insertionOrder = [];
  for (const r of rows) {
    if (!tiers[r.tier]) {
      tiers[r.tier] = [];
      insertionOrder.push(r.tier);
    }
    tiers[r.tier].push(r);
  }
  for (const t of insertionOrder) {
    tiers[t].sort((a, b) => (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0));
  }

  const byTier = {};
  for (const t of insertionOrder) byTier[t] = tiers[t].length;

  // The top-level `tiers` field uses the canonical S-Z output order so
  // consumers can rely on it.
  const tierOrder = ['S', 'A', 'B', 'C-hold', 'D', 'E', 'Z'];
  const orderedTiers = {};
  for (const t of tierOrder) {
    if (tiers[t]) orderedTiers[t] = tiers[t];
  }

  const totalVol = rows.reduce((acc, r) => acc + (r.volume || 0), 0);

  return {
    captured_at: opts.capturedAt || todayIso(),
    domain: opts.domain || 'partyondelivery.com',
    source: opts.source || 'Position Tracking Rankings Overview',
    scoring_method: 'opportunity = volume × intent_weight × (1-kd/100) × position_factor',
    tier_definitions: {
      S: 'Quick wins: vol>=100, kd<=20, commercial intent, not yet top-10',
      A: 'High-volume push: vol>=500, kd<=35',
      B: 'Mid-tier: vol>=100, kd<=50',
      'C-hold': 'Currently top 3 — protect',
      D: 'Declining: lost >=0.5pp visibility WoW',
      E: 'Everything else (low vol, niche, or already won)',
      Z: 'Junk: no volume + not ranking',
    },
    summary: {
      total_keywords: rows.length,
      by_tier: byTier,
      total_search_volume: totalVol,
      unranked_count: rows.filter((r) => r.pos_current === null || r.pos_current === undefined).length,
      top_3_count: rows.filter((r) => r.pos_current !== null && r.pos_current !== undefined && r.pos_current <= 3).length,
      striking_distance_count: rows.filter(
        (r) => r.pos_current !== null && r.pos_current !== undefined && r.pos_current >= 11 && r.pos_current <= 20,
      ).length,
    },
    tiers: orderedTiers,
  };
}

function printSummary(triage) {
  const s = triage.summary;
  console.log('');
  console.log(`Total keywords: ${s.total_keywords}`);
  console.log(`Total search volume across tracked set: ${s.total_search_volume.toLocaleString()}`);
  console.log(`Unranked: ${s.unranked_count}`);
  console.log(`Top-3 holds: ${s.top_3_count}`);
  console.log(`Striking distance (pos 11-20): ${s.striking_distance_count}`);
  console.log('');
  console.log('Tier counts:');
  for (const t of ['S', 'A', 'B', 'C-hold', 'D', 'E', 'Z']) {
    if (triage.tiers[t]) console.log(`  ${t}: ${triage.tiers[t].length} keywords`);
  }
}

function parseArgs(argv) {
  const out = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') out.input = argv[++i];
    else if (a === '--output') out.output = argv[++i];
    else if (a === '--date') out.date = argv[++i];
    else if (a === '--source') out.source = argv[++i];
    else if (a === '--domain') out.domain = argv[++i];
    else if (a === '--test') out.test = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    else if (a === '--help' || a === '-h') out.help = true;
    else out.positional.push(a);
  }
  return out;
}

function usage() {
  console.error('Usage:');
  console.error('  node scripts/seo/triage-keywords.mjs --input <tsv-path> [--output <json-path>]');
  console.error('                                       [--date YYYY-MM-DD] [--source "<label>"]');
  console.error('  node scripts/seo/triage-keywords.mjs --test [<expected-json-path>]');
}

// Self-test: re-runs against a fixture and diffs every key in summary +
// every per-keyword tier + opportunity_score. Returns 0 if identical, 1
// otherwise. Default fixture path = the committed 2026-05-19 result in
// the SEO snapshots sibling repo.
function selfTest(expectedPathOverride) {
  const FIXTURE_TSV =
    '/Users/allan/Projects/Party On Delivery/PartyOn2-seo-snapshots/data/seo/semrush/2026-05-19/raw/keyword-table.tsv';
  const FIXTURE_JSON =
    '/Users/allan/Projects/Party On Delivery/PartyOn2-seo-snapshots/data/seo/semrush/2026-05-19/keyword-triage.json';
  const expectedPath = typeof expectedPathOverride === 'string' ? expectedPathOverride : FIXTURE_JSON;

  if (!fs.existsSync(FIXTURE_TSV)) {
    console.error(`[test] missing fixture: ${FIXTURE_TSV}`);
    return 2;
  }
  if (!fs.existsSync(expectedPath)) {
    console.error(`[test] missing expected output: ${expectedPath}`);
    return 2;
  }

  const tsvText = fs.readFileSync(FIXTURE_TSV, 'utf8');
  const rows = parseTsv(tsvText);
  const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
  const computed = buildTriageObject(rows, {
    capturedAt: expected.captured_at,
    domain: expected.domain,
    source: expected.source,
  });

  const issues = [];

  // Summary diff
  for (const key of Object.keys(expected.summary)) {
    if (JSON.stringify(expected.summary[key]) !== JSON.stringify(computed.summary[key])) {
      issues.push(`summary.${key}: expected=${JSON.stringify(expected.summary[key])} got=${JSON.stringify(computed.summary[key])}`);
    }
  }

  // Per-keyword tier + score diff
  const expectedByKw = new Map();
  for (const t of Object.keys(expected.tiers)) {
    for (const r of expected.tiers[t]) expectedByKw.set(r.keyword, { tier: t, score: r.opportunity_score });
  }
  for (const t of Object.keys(computed.tiers)) {
    for (const r of computed.tiers[t]) {
      const exp = expectedByKw.get(r.keyword);
      if (!exp) {
        issues.push(`keyword "${r.keyword}": not in expected`);
        continue;
      }
      if (exp.tier !== t) issues.push(`keyword "${r.keyword}": tier expected=${exp.tier} got=${t}`);
      if (Math.abs((exp.score ?? 0) - (r.opportunity_score ?? 0)) > 0.011) {
        issues.push(`keyword "${r.keyword}": score expected=${exp.score} got=${r.opportunity_score}`);
      }
      expectedByKw.delete(r.keyword);
    }
  }
  for (const kw of expectedByKw.keys()) issues.push(`keyword "${kw}": missing from computed`);

  if (issues.length === 0) {
    console.log(`[test] ✓ ${rows.length} keywords matched exactly against ${expectedPath}`);
    return 0;
  }
  console.error(`[test] ✗ ${issues.length} mismatches:`);
  for (const i of issues.slice(0, 25)) console.error(`  - ${i}`);
  if (issues.length > 25) console.error(`  ... and ${issues.length - 25} more`);
  return 1;
}

function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.help) {
    usage();
    process.exit(0);
  }

  if (args.test) {
    const code = selfTest(args.test === true ? undefined : args.test);
    process.exit(code);
  }

  if (!args.input) {
    usage();
    process.exit(2);
  }

  const inputPath = path.resolve(args.input);
  const outputPath = args.output ? path.resolve(args.output) : path.join(path.dirname(path.dirname(inputPath)), 'keyword-triage.json');

  if (!fs.existsSync(inputPath)) {
    console.error(`[triage] input not found: ${inputPath}`);
    process.exit(2);
  }

  const tsvText = fs.readFileSync(inputPath, 'utf8');
  const rows = parseTsv(tsvText);
  const triage = buildTriageObject(rows, {
    capturedAt: args.date ? `${args.date}T00:00:00Z` : undefined,
    source: args.source,
    domain: args.domain,
  });

  fs.writeFileSync(outputPath, JSON.stringify(triage, null, 2) + '\n');
  console.log(`[triage] wrote ${outputPath}`);
  printSummary(triage);
}

main();
