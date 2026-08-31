/**
 * Regenerate src/lib/analytics/datacenter-ranges.json from the cloud providers'
 * OFFICIAL published IP ranges.
 *
 * Why this exists: stealth scrapers wear real-browser user-agents, so the UA
 * regex in vercel-events.ts can't see them — but they overwhelmingly run on
 * cloud IPs. Traffic from these ranges is flagged `is_datacenter` at ingest and
 * counted as bot traffic.
 *
 * Run manually (quarterly is plenty; ranges drift slowly):
 *   node scripts/analytics/update-datacenter-ranges.mjs
 * then commit the regenerated JSON. Rows ingested before a refresh keep their
 * old classification; scripts/analytics/backfill-datacenter-flag.mjs re-scores
 * them if that ever matters.
 *
 * Sources (all official): AWS, GCP, Azure (ServiceTags "AzureCloud" — the URL
 * is versioned, so it's scraped off the download page), DigitalOcean, Oracle
 * Cloud, Linode/Akamai, Vultr. Known gaps: Hetzner and OVH publish no stable
 * machine-readable feed — their scrapers still pass as "human". Residential
 * proxies are structurally invisible to this approach.
 *
 * Output format is RANGES, not CIDRs, so the runtime does zero parsing:
 *   v4: [[startUint32, endUint32], ...]          sorted, merged
 *   v6: [["<32-hex start>", "<32-hex end>"], ...] sorted, merged — fixed-width
 *       lowercase hex compares correctly as plain strings.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../src/lib/analytics/datacenter-ranges.json');

// ---------- CIDR → range helpers ----------

function v4ToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const b = Number(p);
    if (!Number.isInteger(b) || b < 0 || b > 255) return null;
    n = n * 256 + b;
  }
  return n;
}

/** Expand any legal IPv6 text form to a 128-bit BigInt (null when invalid). */
function v6ToBigInt(ip) {
  let head = ip;
  // Embedded IPv4 tail (e.g. ::ffff:1.2.3.4) → two synthetic hextets.
  const v4Tail = ip.match(/:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Tail) {
    const n = v4ToInt(v4Tail[1]);
    if (n === null) return null;
    head =
      ip.slice(0, -v4Tail[1].length) +
      (n >>> 16).toString(16) + ':' + (n & 0xffff).toString(16);
  }
  const dbl = head.split('::');
  if (dbl.length > 2) return null;
  const left = dbl[0] ? dbl[0].split(':') : [];
  const right = dbl.length === 2 && dbl[1] ? dbl[1].split(':') : [];
  const fill = dbl.length === 2 ? 8 - left.length - right.length : 0;
  if (dbl.length === 1 && left.length !== 8) return null;
  if (fill < 0) return null;
  const hextets = [...left, ...Array(fill).fill('0'), ...right];
  if (hextets.length !== 8) return null;
  let n = 0n;
  for (const h of hextets) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(h)) return null;
    n = (n << 16n) | BigInt(parseInt(h, 16));
  }
  return n;
}

function cidrToRange(cidr) {
  const [ip, bitsRaw] = cidr.trim().split('/');
  const isV6 = ip.includes(':');
  const bits = bitsRaw === undefined ? (isV6 ? 128 : 32) : Number(bitsRaw);
  if (!Number.isInteger(bits)) return null;
  if (isV6) {
    if (bits < 0 || bits > 128) return null;
    const base = v6ToBigInt(ip);
    if (base === null) return null;
    const span = bits === 128 ? 0n : (1n << BigInt(128 - bits)) - 1n;
    const start = base & ~span;
    return { v: 6, start, end: start | span };
  }
  if (bits < 0 || bits > 32) return null;
  const base = v4ToInt(ip);
  if (base === null) return null;
  const span = bits === 32 ? 0 : 2 ** (32 - bits) - 1;
  const start = bits === 0 ? 0 : Math.floor(base / (span + 1)) * (span + 1);
  return { v: 4, start, end: start + span };
}

function mergeRanges(ranges, adjacency) {
  ranges.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const out = [];
  for (const [s, e] of ranges) {
    const last = out[out.length - 1];
    // Merge overlapping or directly adjacent ranges.
    if (last && s <= (typeof last[1] === 'bigint' ? last[1] + adjacency : last[1] + Number(adjacency))) {
      if (e > last[1]) last[1] = e;
    } else {
      out.push([s, e]);
    }
  }
  return out;
}

// ---------- fetchers ----------

async function get(url, as = 'json') {
  const res = await fetch(url, { headers: { 'user-agent': 'partyondelivery-range-refresh' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return as === 'json' ? res.json() : res.text();
}

function fromCsvColumn(text) {
  return text
    .split('\n')
    .map((l) => l.split(',')[0].trim())
    .filter((c) => c && !c.startsWith('#'));
}

const SOURCES = {
  aws: async () => {
    const d = await get('https://ip-ranges.amazonaws.com/ip-ranges.json');
    return [...d.prefixes.map((p) => p.ip_prefix), ...d.ipv6_prefixes.map((p) => p.ipv6_prefix)];
  },
  gcp: async () => {
    const d = await get('https://www.gstatic.com/ipranges/cloud.json');
    return d.prefixes.map((p) => p.ipv4Prefix ?? p.ipv6Prefix).filter(Boolean);
  },
  azure: async () => {
    // The ServiceTags URL is versioned; scrape it off the stable download page.
    const page = await get('https://www.microsoft.com/en-us/download/confirmation.aspx?id=56519', 'text');
    const m = page.match(/https:\/\/download\.microsoft\.com\/download\/[^"]*ServiceTags_Public[^"]*\.json/);
    if (!m) throw new Error('could not locate ServiceTags URL on download page');
    const d = await get(m[0]);
    const cloud = d.values.find((v) => v.name === 'AzureCloud');
    if (!cloud) throw new Error('AzureCloud tag missing');
    return cloud.properties.addressPrefixes;
  },
  digitalocean: async () => fromCsvColumn(await get('https://digitalocean.com/geo/google.csv', 'text')),
  oracle: async () => {
    const d = await get('https://docs.oracle.com/iaas/tools/public_ip_ranges.json');
    return d.regions.flatMap((r) => r.cidrs.map((c) => c.cidr));
  },
  linode: async () => fromCsvColumn(await get('https://geoip.linode.com/', 'text')),
  vultr: async () => {
    const d = await get('https://geofeed.constant.com/?json');
    return d.subnets.map((s) => s.ip_prefix);
  },
};

// AWS+GCP+Azure are the bulk of scraper hosting; refuse to write a file missing any.
const REQUIRED = ['aws', 'gcp', 'azure'];

/**
 * Special-use space no provider can legitimately announce (RFC 1918/5737/6890,
 * multicast, link-local, CGNAT, IPv6 documentation…). Feeds DO ship junk here —
 * Vultr's geofeed was observed containing 203.0.113.0/24 and 2001:db8::/32,
 * which would have classified our own self-test traffic as datacenter. Any
 * prefix intersecting this list is dropped wholesale.
 */
const RESERVED = [
  '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16',
  '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24', '192.88.99.0/24',
  '192.168.0.0/16', '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24',
  '224.0.0.0/4', '240.0.0.0/4',
  '::/127', '::ffff:0:0/96', '64:ff9b::/96', '100::/64',
  // 2001::/23 covers the IETF special block in one entry: Teredo (2001::/32),
  // benchmarking (2001:2::/48), AMT, AS112, ORCHID — Vultr's feed shipped the
  // benchmarking and ORCHID chunks. 2002::/16 is 6to4 relay space, the worst
  // offender: it embeds an arbitrary IPv4 inside the address, so accepting it
  // would flag residential 6to4 tunnelers as datacenter (security review
  // 2026-08-31).
  '2001::/23', '2002::/16', '2001:db8::/32',
  '3fff::/20', 'fc00::/7', 'fe80::/10', 'ff00::/8',
].map((c) => cidrToRange(c));

function isReserved(r) {
  return RESERVED.some((x) => x.v === r.v && r.start <= x.end && r.end >= x.start);
}

const counts = {};
const v4 = [];
const v6 = [];
let bad = 0;
/** Largest accepted prefix per source — an anomalously huge one is the tell for feed poisoning. */
const largest = {};

for (const [name, fetcher] of Object.entries(SOURCES)) {
  try {
    const cidrs = await fetcher();
    counts[name] = cidrs.length;
    for (const c of cidrs) {
      const r = cidrToRange(c);
      if (!r) {
        bad++;
        continue;
      }
      if (isReserved(r)) {
        console.warn(`  dropping reserved-space junk from ${name}: ${c}`);
        continue;
      }
      if (r.v === 4) v4.push([r.start, r.end]);
      else v6.push([r.start, r.end]);
      const size = r.v === 4 ? BigInt(r.end - r.start + 1) : r.end - r.start + 1n;
      if (!largest[name] || size > largest[name].size) largest[name] = { cidr: c, size };
    }
    console.log(
      `${name}: ${cidrs.length} prefixes` +
        (largest[name] ? ` (largest accepted: ${largest[name].cidr})` : '')
    );
  } catch (err) {
    counts[name] = 0;
    console.warn(`${name}: FAILED — ${err.message}`);
  }
}

const missing = REQUIRED.filter((n) => !counts[n]);
if (missing.length) {
  console.error(`Refusing to write: required source(s) failed: ${missing.join(', ')}`);
  process.exit(1);
}

const hex32 = (n) => n.toString(16).padStart(32, '0');
const mergedV4 = mergeRanges(v4, 1);
const mergedV6 = mergeRanges(v6, 1n).map(([s, e]) => [hex32(s), hex32(e)]);

writeFileSync(
  OUT,
  JSON.stringify({ generatedAt: new Date().toISOString(), sources: counts, v4: mergedV4, v6: mergedV6 })
);
console.log(
  `wrote ${OUT}\n  v4 ranges: ${mergedV4.length}  v6 ranges: ${mergedV6.length}  unparseable prefixes: ${bad}`
);
