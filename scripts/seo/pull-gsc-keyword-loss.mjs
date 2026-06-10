#!/usr/bin/env node
/**
 * GSC keyword-loss puller (2026-06 ranking recovery investigation).
 *
 * Two windows:
 *   CURRENT: 30 days ending 2026-06-04 (i.e. 2026-05-06 → 2026-06-04)
 *   PRIOR:   30 days ending 2026-05-05 (i.e. 2026-04-06 → 2026-05-05)
 *
 * For each window, pull per-query rows (dim=query) and per-query+page rows
 * (dim=query,page) so we can attribute each lost query to a landing URL.
 *
 * Output → docs/seo/recommendations/keyword-recovery-2026-06-raw.json
 *
 * Usage: node scripts/seo/pull-gsc-keyword-loss.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { google } from 'googleapis';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

async function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
  const raw = await fs.readFile(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !privateKey) throw new Error('GSC creds missing');
  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

async function queryRows({ siteUrl, sc, start, end, dimensions, rowLimit = 5000 }) {
  const res = await sc.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: start,
      endDate: end,
      dimensions,
      rowLimit,
      dataState: 'final',
    },
  });
  return res.data.rows || [];
}

async function main() {
  await loadEnv();
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE;
  if (!siteUrl) throw new Error('GOOGLE_SEARCH_CONSOLE_SITE missing');
  const auth = getAuth();
  const sc = google.searchconsole({ version: 'v1', auth });

  const windows = {
    current: { start: '2026-05-06', end: '2026-06-04' },
    prior:   { start: '2026-04-06', end: '2026-05-05' },
  };

  const out = {
    generated_at: new Date().toISOString(),
    site: siteUrl,
    windows,
    by_query: {},
    by_query_page: {},
  };

  for (const [label, { start, end }] of Object.entries(windows)) {
    process.stderr.write(`[${label}] query rows ${start}..${end}\n`);
    const q = await queryRows({ siteUrl, sc, start, end, dimensions: ['query'] });
    process.stderr.write(`  → ${q.length} rows\n`);
    out.by_query[label] = q.map((r) => ({
      query: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));

    process.stderr.write(`[${label}] query+page rows ${start}..${end}\n`);
    const qp = await queryRows({ siteUrl, sc, start, end, dimensions: ['query', 'page'] });
    process.stderr.write(`  → ${qp.length} rows\n`);
    out.by_query_page[label] = qp.map((r) => ({
      query: r.keys?.[0] || '',
      page: r.keys?.[1] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));
  }

  // Build delta table
  const idx = (rows) => Object.fromEntries(rows.map((r) => [r.query, r]));
  const curIdx = idx(out.by_query.current);
  const priIdx = idx(out.by_query.prior);
  const allQueries = new Set([...Object.keys(curIdx), ...Object.keys(priIdx)]);
  const deltas = [];
  for (const q of allQueries) {
    const c = curIdx[q] || { clicks: 0, impressions: 0, ctr: 0, position: null };
    const p = priIdx[q] || { clicks: 0, impressions: 0, ctr: 0, position: null };
    deltas.push({
      query: q,
      prior_pos: p.position || null,
      cur_pos: c.position || null,
      pos_delta: p.position && c.position ? +(c.position - p.position).toFixed(2) : null,
      prior_clicks: p.clicks,
      cur_clicks: c.clicks,
      clicks_delta: c.clicks - p.clicks,
      prior_impr: p.impressions,
      cur_impr: c.impressions,
      impr_delta: c.impressions - p.impressions,
    });
  }
  // Lost clicks first
  deltas.sort((a, b) => (a.clicks_delta - b.clicks_delta));
  out.delta_top50_lost_clicks = deltas.slice(0, 50);
  deltas.sort((a, b) => (a.impr_delta - b.impr_delta));
  out.delta_top50_lost_impr = deltas.slice(0, 50);

  // Attribute each top lost query to its best page in CURRENT window
  const qpCur = out.by_query_page.current;
  const pageByQuery = {};
  for (const r of qpCur) {
    const cur = pageByQuery[r.query];
    if (!cur || r.impressions > cur.impressions) pageByQuery[r.query] = r;
  }
  for (const d of out.delta_top50_lost_clicks) {
    const hit = pageByQuery[d.query];
    if (hit) d.cur_landing_page = hit.page;
  }

  const outPath = path.join(ROOT, 'docs', 'seo', 'recommendations', 'keyword-recovery-2026-06-raw.json');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2));
  process.stderr.write(`Wrote ${outPath}\n`);
  console.log(JSON.stringify({
    queries_current: out.by_query.current.length,
    queries_prior:   out.by_query.prior.length,
    top10_lost_clicks: out.delta_top50_lost_clicks.slice(0, 10),
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
