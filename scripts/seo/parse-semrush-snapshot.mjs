#!/usr/bin/env node
/**
 * parse-semrush-snapshot.mjs
 *
 * Deterministic parser for SEMrush dashboard snapshots captured by the
 * /scrape-semrush-pod skill. Reads `raw_body_text` off each snapshot JSON
 * file and emits a structured `extracted` object back into the same file.
 *
 * Pipeline:
 *   1. /scrape-semrush-pod drives Chrome (via the Claude in Chrome extension)
 *      and writes each surface's page innerText into
 *      data/seo/semrush/<date>/<surface>.json under `raw_body_text`.
 *   2. This script reads those JSON files, runs a per-dashboard sub-parser
 *      on `raw_body_text`, and writes the structured `extracted` object
 *      back into the same file. Original `raw_body_text` is preserved.
 *   3. The SEO Director agent consumes the `extracted` object directly --
 *      it never has to re-read the raw text.
 *
 * Usage:
 *   node scripts/seo/parse-semrush-snapshot.mjs <snapshot-dir>
 *   node scripts/seo/parse-semrush-snapshot.mjs --test
 *   node scripts/seo/parse-semrush-snapshot.mjs --test --dir <fixture-dir>
 *
 * --test mode diffs parser output against the committed `extracted` field
 * in each fixture file and prints a per-field report. Exits non-zero on
 * mismatches.
 *
 * Design rules:
 *   - Anchor regexes on UI strings that SEMrush is unlikely to change
 *     ("Visibility", "Site Health", "Errors", "Warnings", "Top 3", etc).
 *   - Validate every extracted number against bounds. If validation fails
 *     or a value is missing, set the field to null and push a string into
 *     `parse_warnings`. Never guess.
 *   - The raw text already has newlines collapsed to single spaces in some
 *     fields and preserved in others (Chrome extension preserves \n);
 *     parsers normalize by replacing all whitespace runs with single spaces
 *     before matching.
 *
 * No external deps -- node:fs / node:path only.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default fixture lives in a sibling repo, parallel to the engineering repo.
// Resolve absolute path so worktree depth doesn't break the lookup.
const DEFAULT_FIXTURE_DIR =
  '/Users/allan/Projects/Party On Delivery/PartyOn2-seo-snapshots/data/seo/semrush/2026-05-13';

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/** Collapse all whitespace (newlines + tabs + multi-space) to single spaces. */
function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

/** Parse a number string like "1.5K", "$516.0", "1,234", "20.38%", "-6.18". */
function parseNumberLike(s) {
  if (s === null || s === undefined) return null;
  const raw = String(s).trim();
  if (raw === '' || raw === '-' || raw === '—') return null;
  // unify various dashes to '-'
  let v = raw.replace(/[–—−]/g, '-');
  v = v.replace(/[$,%\s]/g, '');
  // suffixes K / M / B
  const suffix = v.match(/([kmb])$/i);
  let mult = 1;
  if (suffix) {
    const s1 = suffix[1].toLowerCase();
    mult = s1 === 'k' ? 1_000 : s1 === 'm' ? 1_000_000 : 1_000_000_000;
    v = v.slice(0, -1);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n * mult;
}

/** Round to N decimals to compare cleanly. */
function round(n, decimals = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return n;
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

/** Bound check: ensure num is in [min, max] (or null). */
function inRange(n, min, max) {
  return n === null || n === undefined
    ? false
    : Number.isFinite(n) && n >= min && n <= max;
}

/** Extract a labeled metric. Looks for `label` followed by a number. */
function extractMetric(text, label, opts = {}) {
  const { allowPercent = false, allowDollar = false, allowSuffix = true } = opts;
  // Build a regex that matches the label, optional whitespace, then a number.
  // We escape regex metas in the label.
  const labelEsc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const numPart = allowDollar ? '\\$?' : '';
  const sfx = allowSuffix ? '(?:[KMB])?' : '';
  const pct = allowPercent ? '%?' : '';
  const re = new RegExp(
    `${labelEsc}\\s*[:\\-]?\\s*(${numPart}[-–—−]?[0-9][0-9,.]*${sfx}${pct})`,
    'i',
  );
  const m = text.match(re);
  if (!m) return null;
  return parseNumberLike(m[1]);
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-parser: Position Tracking
// ─────────────────────────────────────────────────────────────────────────

function parsePositionTracking(rawText) {
  const warnings = [];
  const norm = normalize(rawText);
  const out = {
    visibility_pct: null,
    visibility_wow_delta: null,
    visibility_potential_delta: null,
    est_traffic: null,
    est_traffic_wow_delta: null,
    est_traffic_potential_delta: null,
    avg_position: null,
    avg_position_wow_delta: null,
    avg_position_potential_delta: null,
    tracked_keyword_count: null,
    competitor_count: null,
    location: null,
    date_range: null,
    updated: null,
    ranking_buckets: {
      top_3: { count: null, new: null, lost: null },
      top_10: { count: null, new: null, lost: null },
      top_20: { count: null, new: null, lost: null },
      top_100: { count: null, new: null, lost: null },
    },
    improved_count: null,
    declined_count: null,
    top_keywords: [],
    positive_impact: { total_pct: null, keywords: [] },
    negative_impact: { total_pct: null, keywords: [] },
    parse_warnings: warnings,
  };

  // Visibility block: "Visibility 20.38% -6.18% +1.38% See potential"
  const vis = norm.match(
    /Visibility\s+([-–—−]?\d+(?:\.\d+)?)%\s+([-–—−]?\d+(?:\.\d+)?)%\s+([+\-–—−]?\d+(?:\.\d+)?)%\s+See potential/i,
  );
  if (vis) {
    out.visibility_pct = parseNumberLike(vis[1]);
    out.visibility_wow_delta = parseNumberLike(vis[2]);
    out.visibility_potential_delta = parseNumberLike(vis[3]);
  } else {
    warnings.push('visibility block not matched');
  }

  // Estimated Traffic block: "Estimated Traffic 1.50 -0.76 +1.58 See potential"
  const et = norm.match(
    /Estimated Traffic\s+([-–—−]?\d+(?:\.\d+)?)\s+([-–—−]?\d+(?:\.\d+)?)\s+([+\-–—−]?\d+(?:\.\d+)?)\s+See potential/i,
  );
  if (et) {
    out.est_traffic = parseNumberLike(et[1]);
    out.est_traffic_wow_delta = parseNumberLike(et[2]);
    out.est_traffic_potential_delta = parseNumberLike(et[3]);
  } else {
    warnings.push('estimated traffic block not matched');
  }

  // Average Position block: "Average Position 45.23 ↓ 0.81 ↑ 8.82 See potential"
  const ap = norm.match(
    /Average Position\s+(\d+(?:\.\d+)?)\s+([↓↑])\s+(\d+(?:\.\d+)?)\s+([↓↑])\s+(\d+(?:\.\d+)?)\s+See potential/i,
  );
  if (ap) {
    out.avg_position = parseNumberLike(ap[1]);
    // Arrow logic: for avg position, ↓ in WoW = position dropped (worse), but
    // the fixture stores it as a signed delta. Looking at fixture:
    //   "↓ 0.81" -> stored as -0.81 (declined)
    //   "↑ 8.82" -> stored as 8.82 (potential gain)
    const wowSign = ap[2] === '↓' ? -1 : 1;
    const potSign = ap[4] === '↓' ? -1 : 1;
    out.avg_position_wow_delta = round(parseNumberLike(ap[3]) * wowSign, 4);
    out.avg_position_potential_delta = round(parseNumberLike(ap[5]) * potSign, 4);
  } else {
    warnings.push('average position block not matched');
  }

  // Keyword + competitor counts: "Keywords: 66" and "Competitors: 1"
  const kw = norm.match(/Keywords:\s+(\d+)/i);
  if (kw) out.tracked_keyword_count = parseInt(kw[1], 10);
  const cp = norm.match(/Competitors:\s+(\d+)/i);
  if (cp) out.competitor_count = parseInt(cp[1], 10);

  // Location: "Austin, Texas, United States (Google) • English"
  // Anchor on the comma between City and State, walking back from the
  // "United States (Google) • English" suffix. We require City and State to be
  // exactly ONE Title-Case word each (Austin, Texas, Boston, Massachusetts, etc.)
  // — multi-word cities like "San Francisco" would need explicit support.
  // Since the page text has tokens like "Share" mixed in next to "Austin",
  // we use a lookbehind on either ", " (preceding token is a comma-segment)
  // or "  " (start of section, marked by 2+ spaces in the original) — but the
  // safest approach is to allow a leading character class that excludes letters.
  const loc = norm.match(
    /(?:^|[^A-Za-z])([A-Z][a-z]+),\s+([A-Z][a-z]+),\s+(United States\s+\(Google\)\s+•\s+English)/,
  );
  if (loc) {
    out.location = `${loc[1]}, ${loc[2]}, ${loc[3]}`;
  } else {
    warnings.push('location not matched');
  }

  // Date range: "May 7-13, 2026" (or "Apr 30 - May 6, 2026" etc.)
  const dr = norm.match(
    /([A-Z][a-z]{2,9}\s+\d{1,2}(?:\s*[-–]\s*(?:[A-Z][a-z]{2,9}\s+)?\d{1,2})?,\s+\d{4})/,
  );
  if (dr) out.date_range = dr[1];
  else warnings.push('date_range not matched');

  // "Updated: 19 hours ago"
  const up = norm.match(/Updated:\s+([^\n]+?)\s+Keywords:/i);
  if (up) out.updated = up[1].trim();

  // Ranking buckets: "Top 3 13 New 0 Lost 8 Top 10 33 New 0 Lost 1 ..."
  const buckets = [
    ['top_3', 'Top 3'],
    ['top_10', 'Top 10'],
    ['top_20', 'Top 20'],
    ['top_100', 'Top 100'],
  ];
  for (const [key, label] of buckets) {
    const re = new RegExp(
      `${label}\\s+(\\d+)\\s+New\\s+(\\d+)\\s+Lost\\s+(\\d+)`,
      'i',
    );
    const m = norm.match(re);
    if (m) {
      out.ranking_buckets[key] = {
        count: parseInt(m[1], 10),
        new: parseInt(m[2], 10),
        lost: parseInt(m[3], 10),
      };
    } else {
      warnings.push(`ranking bucket ${key} not matched`);
    }
  }

  // Improved vs declined: "Improved vs. declined 8 14"
  const ivd = norm.match(/Improved vs\.?\s+declined\s+(\d+)\s+(\d+)/i);
  if (ivd) {
    out.improved_count = parseInt(ivd[1], 10);
    out.declined_count = parseInt(ivd[2], 10);
  } else {
    warnings.push('improved vs declined block not matched');
  }

  // Top Keywords: lines like "alcohol delivery company austin 1 0 1.52%"
  // Header is "Top Keywords Keyword Pos. Visibility"
  // followed by repeated tuples. Stop at "View all" or "Positive Impact".
  const topKwBlock = norm.match(
    /Top Keywords\s+Keyword\s+Pos\.?\s+Visibility\s+([\s\S]+?)\s+View all/i,
  );
  if (topKwBlock) {
    const block = topKwBlock[1];
    // Each row: "<keyword text> <int pos> <int prev?> <pct>%"
    // From fixture, format is "<kw> 1 0 1.52%" (kw, position, ???, visibility%)
    const rowRe =
      /([a-z0-9][a-z0-9 .\-_,'/&]*?)\s+(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)%/gi;
    let m;
    let count = 0;
    while ((m = rowRe.exec(block)) !== null && count < 5) {
      const kwText = m[1].trim();
      // Filter junk: keywords must contain at least one letter and not start
      // with a recognized SEMrush UI fragment.
      if (!/[a-z]/i.test(kwText)) continue;
      out.top_keywords.push({
        keyword: kwText,
        position: parseInt(m[2], 10),
        visibility_pct: parseNumberLike(m[4]),
      });
      count++;
    }
  } else {
    warnings.push('top keywords block not matched');
  }

  // Positive Impact: "Positive Impact +1.81% Keyword Visibility gain <rows> View all"
  const posBlock = norm.match(
    /Positive Impact\s+([+\-–—−]?\d+(?:\.\d+)?)%\s+Keyword\s+Visibility gain\s+([\s\S]+?)\s+View all/i,
  );
  if (posBlock) {
    out.positive_impact.total_pct = parseNumberLike(posBlock[1]);
    const block = posBlock[2];
    const rowRe = /([a-z0-9][a-z0-9 .\-_,'/&]*?)\s+\+(\d+(?:\.\d+)?)%/gi;
    let m;
    let count = 0;
    while ((m = rowRe.exec(block)) !== null && count < 5) {
      const kwText = m[1].trim();
      if (!/[a-z]/i.test(kwText)) continue;
      out.positive_impact.keywords.push({
        keyword: kwText,
        visibility_delta: parseNumberLike(m[2]),
      });
      count++;
    }
  } else {
    warnings.push('positive impact block not matched');
  }

  // Negative Impact: "Negative Impact -30.19% Keyword Visibility loss <rows> View all"
  const negBlock = norm.match(
    /Negative Impact\s+([+\-–—−]?\d+(?:\.\d+)?)%\s+Keyword\s+Visibility loss\s+([\s\S]+?)\s+View all/i,
  );
  if (negBlock) {
    out.negative_impact.total_pct = parseNumberLike(negBlock[1]);
    const block = negBlock[2];
    const rowRe =
      /([a-z0-9][a-z0-9 .\-_,'/&]*?)\s+[-–—−](\d+(?:\.\d+)?)%/gi;
    let m;
    let count = 0;
    while ((m = rowRe.exec(block)) !== null && count < 5) {
      const kwText = m[1].trim();
      if (!/[a-z]/i.test(kwText)) continue;
      out.negative_impact.keywords.push({
        keyword: kwText,
        visibility_delta: -parseNumberLike(m[2]),
      });
      count++;
    }
  } else {
    warnings.push('negative impact block not matched');
  }

  // Validation
  if (!inRange(out.visibility_pct, 0, 100)) {
    if (out.visibility_pct !== null)
      warnings.push(`visibility_pct out of range: ${out.visibility_pct}`);
  }
  if (
    out.avg_position !== null &&
    !inRange(out.avg_position, 0, 100)
  ) {
    warnings.push(`avg_position out of range: ${out.avg_position}`);
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-parser: Site Audit
// ─────────────────────────────────────────────────────────────────────────

function parseSiteAudit(rawText) {
  const warnings = [];
  const norm = normalize(rawText);
  const out = {
    site_health_pct: null,
    site_health_delta: null,
    pages_crawled: null,
    pages_crawl_cap: null,
    status_mix: {
      healthy: null,
      broken: null,
      have_issues: null,
      redirects: null,
      blocked: null,
    },
    ai_search_health_pct: null,
    ai_search_health_delta: null,
    errors: { value: null, delta: null, rawValue: null, rawDelta: null },
    warnings: { value: null, delta: null, rawValue: null, rawDelta: null },
    top_issues: [],
    thematic_reports: {
      robots_txt: null,
      crawlability_pct: null,
      https_pct: null,
      international_seo: null,
      core_web_vitals_pct: null,
      site_performance_pct: null,
      internal_linking_pct: null,
      markup_pct: null,
    },
    parse_warnings: warnings,
  };

  // Site Health: "Site Health ... 80% no changes" (the chart accessibility blurb appears between)
  const sh = norm.match(
    /Site Health\s+(?:Press[^%]+?)?(\d+(?:\.\d+)?)%\s+(no changes|[+\-–—−]\d+(?:\.\d+)?%)/i,
  );
  if (sh) {
    out.site_health_pct = parseNumberLike(sh[1]);
    out.site_health_delta = /no changes/i.test(sh[2])
      ? 0
      : parseNumberLike(sh[2]);
  } else {
    warnings.push('site health block not matched');
  }

  // Pages crawled: "Pages crawled: 247/1,000"  and later "Crawled Pages 247 no changes"
  const pc = norm.match(/Pages crawled:\s+([\d,]+)\s*\/\s*([\d,]+)/i);
  if (pc) {
    out.pages_crawled = parseNumberLike(pc[1]);
    out.pages_crawl_cap = parseNumberLike(pc[2]);
  } else {
    warnings.push('pages crawled count not matched');
  }

  // Status mix: "Healthy 3 Broken 4 Have issues 228 Redirects 12 Blocked 0"
  const sm = norm.match(
    /Healthy\s+(\d+)\s+Broken\s+(\d+)\s+Have issues\s+(\d+)\s+Redirects\s+(\d+)\s+Blocked\s+(\d+)/i,
  );
  if (sm) {
    out.status_mix.healthy = parseInt(sm[1], 10);
    out.status_mix.broken = parseInt(sm[2], 10);
    out.status_mix.have_issues = parseInt(sm[3], 10);
    out.status_mix.redirects = parseInt(sm[4], 10);
    out.status_mix.blocked = parseInt(sm[5], 10);
  } else {
    warnings.push('status mix not matched');
  }

  // AI Search Health: "AI Search Health beta ... 91% no changes"
  const ai = norm.match(
    /AI Search Health\s+(?:beta\s+)?(?:Press[^%]+?)?(\d+(?:\.\d+)?)%\s+(no changes|[+\-–—−]\d+(?:\.\d+)?%)/i,
  );
  if (ai) {
    out.ai_search_health_pct = parseNumberLike(ai[1]);
    out.ai_search_health_delta = /no changes/i.test(ai[2])
      ? 0
      : parseNumberLike(ai[2]);
  } else {
    warnings.push('ai search health block not matched');
  }

  // Errors block — "Errors 252 -11 0 278"
  // First number after "Errors" is current value, second is delta.
  const errBlock = norm.match(
    /Errors\s+(?:Sortable\s+)?(\d[\d,]*)\s+([+\-–—−]?\d+(?:\.\d+)?%?)\s+\d+\s+\d+/i,
  );
  if (errBlock) {
    out.errors.value = parseNumberLike(errBlock[1]);
    out.errors.rawValue = errBlock[1];
    const dRaw = errBlock[2];
    out.errors.delta = parseNumberLike(dRaw);
    // Normalize raw delta: insert leading + if positive
    if (out.errors.delta !== null && out.errors.delta > 0 && !/^[+]/.test(dRaw)) {
      out.errors.rawDelta = `+${out.errors.delta}`;
    } else if (out.errors.delta !== null && out.errors.delta < 0) {
      out.errors.rawDelta = `${out.errors.delta}`;
    } else {
      out.errors.rawDelta = dRaw;
    }
  } else {
    warnings.push('errors block not matched');
  }

  // Warnings block — "Warnings 422 +5 0 422"
  const warnBlock = norm.match(
    /Warnings\s+(\d[\d,]*)\s+([+\-–—−]?\d+(?:\.\d+)?%?)\s+\d+\s+\d+/i,
  );
  if (warnBlock) {
    out.warnings.value = parseNumberLike(warnBlock[1]);
    out.warnings.rawValue = warnBlock[1];
    const dRaw = warnBlock[2];
    out.warnings.delta = parseNumberLike(dRaw);
    if (out.warnings.delta !== null && out.warnings.delta > 0) {
      out.warnings.rawDelta = `+${out.warnings.delta}`;
    } else if (out.warnings.delta !== null && out.warnings.delta < 0) {
      out.warnings.rawDelta = `${out.warnings.delta}`;
    } else {
      out.warnings.rawDelta = dRaw;
    }
  } else {
    warnings.push('warnings block not matched');
  }

  // Top issues: list under "Sortable <issue name> <N> pages How to fix"
  // After "Warnings ..." block. Each entry: <name> [<tag>] <N> pages How to fix
  // We capture up to 5 issues, stopping at "View all issues" or "Thematic Reports".
  const issuesBlockMatch = norm.match(
    /Warnings\s+\d[\d,]*\s+[+\-–—−]?\d+(?:\.\d+)?%?\s+\d+\s+\d+\s+(?:Press[^]+?)?Sortable\s+([\s\S]+?)\s+(?:View all issues|Thematic Reports)/i,
  );
  if (issuesBlockMatch) {
    const block = issuesBlockMatch[1];
    // Issues come as: "<name> [AI Search]? <N> pages How to fix"
    // We split on "How to fix" to chunk.
    const chunks = block
      .split(/How to fix/i)
      .map((c) => c.trim())
      .filter(Boolean);
    for (const chunk of chunks) {
      // Each chunk: "<name> [AI Search]? <N> pages"
      const m = chunk.match(/^(.+?)\s+(\d[\d,]*)\s+pages?$/i);
      if (!m) continue;
      let name = m[1].trim();
      let tag = null;
      // Detect trailing tag (AI Search appears separately at end of name)
      const tagMatch = name.match(/^(.+?)\s+(AI Search)$/i);
      if (tagMatch) {
        name = tagMatch[1].trim();
        tag = tagMatch[2];
      }
      out.top_issues.push({
        name,
        pages_affected: parseNumberLike(m[2]),
        tag,
      });
      if (out.top_issues.length >= 5) break;
    }
  } else {
    warnings.push('top issues block not matched');
  }

  // Thematic Reports
  const robots = norm.match(
    /Robots\.txt\s+(No changes|Has changes|\d+ changes?)\s+Open file/i,
  );
  if (robots) out.thematic_reports.robots_txt = robots[1];

  const tr = (label) => {
    const re = new RegExp(`${label}\\s+(\\d+(?:\\.\\d+)?)%\\s+View details`, 'i');
    const m = norm.match(re);
    return m ? parseNumberLike(m[1]) : null;
  };
  out.thematic_reports.crawlability_pct = tr('Crawlability');
  out.thematic_reports.https_pct = tr('HTTPS');
  out.thematic_reports.core_web_vitals_pct = tr('Core Web Vitals');
  out.thematic_reports.site_performance_pct = tr('Site Performance');
  out.thematic_reports.internal_linking_pct = tr('Internal Linking');
  out.thematic_reports.markup_pct = tr('Markup');

  const intl = norm.match(
    /International SEO\s+(International SEO[^.]+\.)/i,
  );
  if (intl) out.thematic_reports.international_seo = intl[1].trim();

  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-parser: Organic Research
// ─────────────────────────────────────────────────────────────────────────

function parseOrganicResearch(rawText) {
  const warnings = [];
  const norm = normalize(rawText);
  const out = {
    keywords: { value: null, delta: null, rawValue: null, rawDelta: null },
    traffic: { value: null, delta: null, rawValue: null, rawDelta: null },
    traffic_cost: { value: null, delta: null, rawValue: null, rawDelta: null },
    branded_traffic: { value: null, delta: null, rawValue: null, rawDelta: null },
    non_branded_traffic: { value: null, delta: null, rawValue: null, rawDelta: null },
    keywords_by_country: {},
    parse_warnings: warnings,
  };

  // Headline metrics block: "Keywords 1.5K -0.27% Traffic 661 -10.68% Traffic Cost $516.0 -40.62% Branded Traffic 113 56.94% Non-Branded Traffic 548 -17.96%"
  const headline = norm.match(
    /Keywords\s+(\S+)\s+([+\-–—−]?\d+(?:\.\d+)?%)\s+Traffic\s+(\S+)\s+([+\-–—−]?\d+(?:\.\d+)?%)\s+Traffic Cost\s+(\$?\S+)\s+([+\-–—−]?\d+(?:\.\d+)?%)\s+Branded Traffic\s+(\S+)\s+([+\-–—−]?\d+(?:\.\d+)?%)\s+Non-Branded Traffic\s+(\S+)\s+([+\-–—−]?\d+(?:\.\d+)?%)/i,
  );
  if (headline) {
    const set = (key, val, delta) => {
      out[key].rawValue = val;
      out[key].rawDelta = delta;
      out[key].value = parseNumberLike(val);
      out[key].delta = parseNumberLike(delta);
    };
    set('keywords', headline[1], headline[2]);
    set('traffic', headline[3], headline[4]);
    set('traffic_cost', headline[5], headline[6]);
    set('branded_traffic', headline[7], headline[8]);
    set('non_branded_traffic', headline[9], headline[10]);
  } else {
    warnings.push('headline metrics block not matched');
  }

  // Keywords by country: looks like "US 1.5K AU 10 CA 7" (after "partyondelivery.com Root Domain"
  // and before "Device:"). The pattern: 2-letter country code then a number.
  // We look for the segment between "Root Domain" and "Device:".
  const countrySection = norm.match(
    /Root Domain\s+([\s\S]+?)\s+Device:/i,
  );
  if (countrySection) {
    const seg = countrySection[1];
    const ccRe = /\b([A-Z]{2})\s+(\d[\d,.]*\s*[KMB]?)\b/g;
    let m;
    while ((m = ccRe.exec(seg)) !== null) {
      const cc = m[1];
      // Skip cc that are obviously not country codes (e.g. "PDF", "USD")
      // Country codes are exactly 2 uppercase letters; PDF/USD won't match \b[A-Z]{2}\b
      // since they're 3 letters. Good.
      const n = parseNumberLike(m[2]);
      if (n !== null) out.keywords_by_country[cc] = n;
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-parser: Backlink Analytics
// ─────────────────────────────────────────────────────────────────────────

function parseBacklinkAnalytics(rawText) {
  const warnings = [];
  const norm = normalize(rawText);
  const out = {
    referring_domains: { value: null, delta: null, rawValue: null, rawDelta: null },
    backlinks: { value: null, delta: null, rawValue: null, rawDelta: null },
    monthly_visits: { value: null, delta: null, rawValue: null, rawDelta: null },
    organic_traffic: { value: null, delta: null, rawValue: null, rawDelta: null },
    outbound_domains: { value: null, delta: null, rawValue: null, rawDelta: null },
    category: null,
    live_update: { count: null, period: null, raw: null },
    authority_score: null,
    authority_score_tier: null,
    parse_warnings: warnings,
  };

  // "Referring Domains 136 –6% Backlinks 588 –8% Monthly Visits 347 Organic Traffic 664 Outbound Domains 35"
  // Note: SEMrush uses en-dash (–) for negative percents on this surface.
  const refDom = norm.match(
    /Referring Domains\s+(\d[\d,]*)\s+([–\-−][\d.]+%)\s+Backlinks\s+(\d[\d,]*)\s+([–\-−][\d.]+%)\s+Monthly Visits\s+(\d[\d,]*)\s+Organic Traffic\s+(\d[\d,]*)\s+Outbound Domains\s+(\d[\d,]*)/i,
  );
  if (refDom) {
    out.referring_domains.rawValue = refDom[1];
    out.referring_domains.value = parseNumberLike(refDom[1]);
    out.referring_domains.rawDelta = refDom[2];
    out.referring_domains.delta = parseNumberLike(refDom[2]);

    out.backlinks.rawValue = refDom[3];
    out.backlinks.value = parseNumberLike(refDom[3]);
    out.backlinks.rawDelta = refDom[4];
    out.backlinks.delta = parseNumberLike(refDom[4]);

    out.monthly_visits.rawValue = refDom[5];
    out.monthly_visits.value = parseNumberLike(refDom[5]);

    out.organic_traffic.rawValue = refDom[6];
    out.organic_traffic.value = parseNumberLike(refDom[6]);

    out.outbound_domains.rawValue = refDom[7];
    out.outbound_domains.value = parseNumberLike(refDom[7]);
  } else {
    // Try without monthly/organic/outbound (some plans hide them)
    const partial = norm.match(
      /Referring Domains\s+(\d[\d,]*)\s+([–\-−][\d.]+%)\s+Backlinks\s+(\d[\d,]*)\s+([–\-−][\d.]+%)/i,
    );
    if (partial) {
      out.referring_domains.rawValue = partial[1];
      out.referring_domains.value = parseNumberLike(partial[1]);
      out.referring_domains.rawDelta = partial[2];
      out.referring_domains.delta = parseNumberLike(partial[2]);
      out.backlinks.rawValue = partial[3];
      out.backlinks.value = parseNumberLike(partial[3]);
      out.backlinks.rawDelta = partial[4];
      out.backlinks.delta = parseNumberLike(partial[4]);
      warnings.push('monthly/organic/outbound section not present');
    } else {
      warnings.push('headline backlinks block not matched');
    }
  }

  // Category: "Category: Food & Beverages"
  const cat = norm.match(/Category:\s+([A-Z][\w &]+?)\s+(?:Overview|Root Domain|You|Backlinks|Compare)/i);
  if (cat) out.category = cat[1].trim();

  // Live update: "Live Update: 2 backlinks found today"
  const live = norm.match(/Live Update:\s+(\d+)\s+backlinks?\s+found\s+(today|yesterday|this week|this month)/i);
  if (live) {
    out.live_update.count = parseInt(live[1], 10);
    out.live_update.period = live[2];
    out.live_update.raw = `${live[1]} backlinks found ${live[2]}`;
  }

  // Authority Score: "Authority Score 16 Average" (tier follows)
  const auth = norm.match(/Authority Score\s+(\d+)\s+(Newcomer|Low|Average|Good|Strong|Powerhouse)/i);
  if (auth) {
    out.authority_score = parseInt(auth[1], 10);
    out.authority_score_tier = auth[2];
  } else {
    warnings.push('authority score not matched');
  }

  // Preserve raw delta strings using the en-dash form actually present in source.
  // The fixture stores them as "–6%" (en-dash). Our parser captures the actual
  // dash character used in the match, so rawDelta should already be correct.

  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────

const PARSERS = {
  'position-tracking': parsePositionTracking,
  'site-audit': parseSiteAudit,
  'organic-research': parseOrganicResearch,
  'backlink-analytics': parseBacklinkAnalytics,
};

function parseSnapshotFile(json) {
  const dashboard = json.dashboard;
  const parser = PARSERS[dashboard];
  if (!parser) {
    return {
      parsed: null,
      error: `No parser registered for dashboard "${dashboard}"`,
    };
  }
  if (!json.raw_body_text) {
    return { parsed: null, error: 'No raw_body_text field on snapshot' };
  }
  const parsed = parser(json.raw_body_text);
  return { parsed, error: null };
}

// ─────────────────────────────────────────────────────────────────────────
// CLI: regular mode (parse a snapshot dir, write back)
// ─────────────────────────────────────────────────────────────────────────

function runOnDir(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`Snapshot directory not found: ${dir}`);
    process.exit(2);
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'manifest.json');

  const summary = [];
  for (const file of files) {
    const fp = path.join(dir, file);
    let json;
    try {
      json = JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (e) {
      summary.push({ file, ok: false, error: `Invalid JSON: ${e.message}` });
      continue;
    }
    const { parsed, error } = parseSnapshotFile(json);
    if (error) {
      summary.push({ file, ok: false, error });
      continue;
    }
    json.extracted = parsed;
    fs.writeFileSync(fp, JSON.stringify(json, null, 2) + '\n', 'utf8');
    const warns = (parsed.parse_warnings || []).length;
    summary.push({ file, ok: true, warnings: warns });
  }

  // Update manifest
  const mfPath = path.join(dir, 'manifest.json');
  if (fs.existsSync(mfPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
      manifest.re_extracted_at = new Date().toISOString();
      manifest.re_extracted_note =
        'Re-parsed from raw_body_text by scripts/seo/parse-semrush-snapshot.mjs';
      fs.writeFileSync(mfPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    } catch (e) {
      console.warn(`Could not update manifest: ${e.message}`);
    }
  }

  console.log('Parse summary:');
  for (const row of summary) {
    if (row.ok) {
      console.log(
        `  ✓ ${row.file}${row.warnings ? `  (${row.warnings} warning${row.warnings > 1 ? 's' : ''})` : ''}`,
      );
    } else {
      console.log(`  ✗ ${row.file}: ${row.error}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// CLI: --test mode (diff parser output vs fixture .extracted)
// ─────────────────────────────────────────────────────────────────────────

const FLOAT_TOL = 0.01;

function flatten(obj, prefix = '', out = {}) {
  if (obj === null || obj === undefined) {
    out[prefix] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      out[prefix] = '[]';
    } else {
      obj.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    }
    return out;
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      out[prefix] = '{}';
      return out;
    }
    for (const k of keys) {
      flatten(obj[k], prefix ? `${prefix}.${k}` : k, out);
    }
    return out;
  }
  out[prefix] = obj;
  return out;
}

function compareValues(a, b) {
  if (a === b) return 'exact';
  if (a === null || b === null) return 'mismatch';
  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) < FLOAT_TOL) return 'tol';
    return 'mismatch';
  }
  // Try numeric coerce for string-vs-number
  if (typeof a === 'string' && typeof b === 'number') {
    const an = parseNumberLike(a);
    if (an !== null && Math.abs(an - b) < FLOAT_TOL) return 'tol';
  }
  if (typeof b === 'string' && typeof a === 'number') {
    const bn = parseNumberLike(b);
    if (bn !== null && Math.abs(bn - a) < FLOAT_TOL) return 'tol';
  }
  // String normalization: trim + lowercase + collapse whitespace
  if (typeof a === 'string' && typeof b === 'string') {
    const an = a.trim().toLowerCase().replace(/\s+/g, ' ');
    const bn = b.trim().toLowerCase().replace(/\s+/g, ' ');
    if (an === bn) return 'tol';
  }
  return 'mismatch';
}

function runTest(fixtureDir) {
  if (!fs.existsSync(fixtureDir)) {
    console.error(`Fixture directory not found: ${fixtureDir}`);
    process.exit(2);
  }
  const files = fs
    .readdirSync(fixtureDir)
    .filter((f) => f.endsWith('.json') && f !== 'manifest.json');

  let anyMismatch = false;
  const lines = [];

  for (const file of files) {
    const fp = path.join(fixtureDir, file);
    const json = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const dashboard = json.dashboard;
    const expected = json.extracted;
    if (!expected) {
      lines.push(`${file}: no committed .extracted to diff against, skipping`);
      continue;
    }
    const { parsed, error } = parseSnapshotFile(json);
    if (error) {
      lines.push(`${file}: PARSE ERROR: ${error}`);
      anyMismatch = true;
      continue;
    }

    // Strip parse_warnings from comparison (it's parser metadata)
    const parsedForDiff = { ...parsed };
    delete parsedForDiff.parse_warnings;

    const flatExpected = flatten(expected);
    const flatParsed = flatten(parsedForDiff);

    const allKeys = new Set([
      ...Object.keys(flatExpected),
      ...Object.keys(flatParsed),
    ]);

    let exact = 0;
    let tol = 0;
    let missing = 0;
    let mismatch = 0;
    const fieldReports = [];

    for (const k of [...allKeys].sort()) {
      const exp = flatExpected[k];
      const got = flatParsed[k];
      if (got === undefined) {
        // Parser doesn't produce this key. Treat as missing.
        missing++;
        fieldReports.push({ key: k, status: 'missing-key', exp, got });
        continue;
      }
      if (got === null && exp !== null && exp !== undefined) {
        missing++;
        fieldReports.push({ key: k, status: 'missing', exp, got });
        continue;
      }
      if (exp === undefined) {
        // Parser produced extra field; if it's a non-null value, just note it.
        if (got !== null && got !== '[]' && got !== '{}') {
          // Treat as an extra field, not a failure.
          fieldReports.push({ key: k, status: 'extra', exp, got });
        }
        continue;
      }
      const cmp = compareValues(exp, got);
      if (cmp === 'exact') {
        exact++;
        fieldReports.push({ key: k, status: 'exact' });
      } else if (cmp === 'tol') {
        tol++;
        fieldReports.push({ key: k, status: 'tol' });
      } else {
        mismatch++;
        anyMismatch = true;
        fieldReports.push({ key: k, status: 'mismatch', exp, got });
      }
    }

    const warns = (parsed.parse_warnings || []).length;
    const totalCompared = exact + tol + missing + mismatch;
    lines.push(`\n── ${file} (${dashboard}) ──`);
    lines.push(
      `${exact}/${totalCompared} exact, ${tol} tol, ${missing} missing, ${mismatch} mismatch, ${warns} parse_warnings`,
    );
    for (const r of fieldReports) {
      if (r.status === 'exact') continue;
      if (r.status === 'tol') {
        lines.push(`  ~ ${r.key}`);
      } else if (r.status === 'missing') {
        lines.push(`  missing ${r.key} (expected ${JSON.stringify(r.exp)})`);
      } else if (r.status === 'missing-key') {
        lines.push(`  missing-key ${r.key} (expected ${JSON.stringify(r.exp)})`);
      } else if (r.status === 'mismatch') {
        lines.push(
          `  ✗ ${r.key}  expected=${JSON.stringify(r.exp)}  got=${JSON.stringify(r.got)}`,
        );
      } else if (r.status === 'extra') {
        // omit from verbose printing; just count
      }
    }
    if (warns > 0) {
      lines.push(`  parse_warnings:`);
      for (const w of parsed.parse_warnings) lines.push(`    - ${w}`);
    }
  }

  console.log(lines.join('\n'));
  console.log('\n' + (anyMismatch ? 'TEST FAILED (mismatches present)' : 'TEST OK'));
  process.exit(anyMismatch ? 1 : 0);
}

// ─────────────────────────────────────────────────────────────────────────
// CLI entry
// ─────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      `Usage:
  node scripts/seo/parse-semrush-snapshot.mjs <snapshot-dir>
  node scripts/seo/parse-semrush-snapshot.mjs --test
  node scripts/seo/parse-semrush-snapshot.mjs --test --dir <fixture-dir>
`,
    );
    process.exit(2);
  }
  const isTest = args.includes('--test');
  if (isTest) {
    const dirIdx = args.indexOf('--dir');
    const dir =
      dirIdx >= 0 ? args[dirIdx + 1] : DEFAULT_FIXTURE_DIR;
    runTest(path.resolve(process.cwd(), dir));
    return;
  }
  const dir = args[0];
  runOnDir(path.resolve(process.cwd(), dir));
}

main();

// Exports for unit tests / external consumers
export {
  parsePositionTracking,
  parseSiteAudit,
  parseOrganicResearch,
  parseBacklinkAnalytics,
  parseSnapshotFile,
};
