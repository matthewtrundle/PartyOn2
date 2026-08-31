/**
 * Server-side traffic analytics derived from Vercel Log Drain events.
 *
 * A Vercel *Log* Drain delivers one NDJSON line per HTTP request — pages,
 * assets, API calls, humans and bots alike. It carries no "pageview" event type
 * (that exists only in Vercel's separate Web Analytics drain), so page views are
 * DERIVED here from method/status/path, and bots are separated from humans by
 * user-agent. Rows are written by `src/app/api/webhooks/vercel-drain/route.ts`.
 *
 * This module is the single source of truth for both definitions so the ingest
 * filter and the reporting queries can never drift apart.
 */

import { prisma } from '@/lib/database/client';

/**
 * Path of our own drain receiver. Every drain delivery is itself an HTTP request
 * that Vercel logs, so without dropping this path the table would grow one junk
 * row per delivery, forever.
 */
export const VERCEL_DRAIN_PATH = '/api/webhooks/vercel-drain';

/**
 * Bot / automated user-agents, as a POSIX regex body (case-insensitive at the
 * call site). Deliberately broad: for ad-spend decisions, over-classifying a
 * borderline agent as a bot is much cheaper than counting a crawler as a
 * customer.
 *
 * Kept to plain literal alternation — no `\b`, `\d` or other escapes — so the
 * exact same string is valid in both Postgres ARE and JavaScript `RegExp`,
 * which is what lets the unit tests verify the production classifier.
 */
export const BOT_UA_REGEX =
  '(bot|crawl|spider|slurp|mediapartners|bingpreview|facebookexternalhit|facebot|embedly|' +
  'quora link preview|whatsapp|telegrambot|discordbot|slackbot|headless|phantomjs|puppeteer|' +
  'playwright|selenium|python-requests|python-urllib|curl|wget|axios|node-fetch|go-http|java/|' +
  'okhttp|libwww|httpclient|apache-httpclient|scrapy|ahrefs|semrush|mj12|dotbot|dataforseo|' +
  'petalbot|bytespider|gptbot|oai-searchbot|claudebot|anthropic|ccbot|perplexitybot|amazonbot|' +
  'applebot|yandex|baiduspider|sogou|exabot|duckduckbot|uptime|pingdom|monitor|statuscake|' +
  'newrelic|datadog|vercel-screenshot)';

/** File extensions treated as static assets rather than page views. */
export const ASSET_EXTENSIONS = [
  'js', 'mjs', 'css', 'map', 'ico', 'png', 'jpg', 'jpeg', 'gif', 'svg',
  'webp', 'avif', 'woff', 'woff2', 'ttf', 'eot', 'txt', 'xml', 'json',
  'wasm', 'mp4', 'webm',
] as const;

/** The same asset list as a POSIX regex, for filtering inside SQL. */
export const ASSET_PATH_SQL_REGEX = `\\.(${ASSET_EXTENSIONS.join('|')})(\\?|$)`;

/**
 * Noise check applied at INGEST — these requests are dropped before storage.
 *
 * Static assets, Next.js internals and our own drain endpoint are pure volume
 * with no analytical value.
 *
 * `/api/*` is dropped too, and that is a deliberate security decision rather
 * than a tidiness one. Our API routes carry the same credentials as the pages
 * they serve — `/api/v1/invoice/<token>`, `/api/group-orders/<code>`,
 * `/api/cart/share/<id>` — and a dashboard page load calls several of them, so
 * storing API paths would re-introduce exactly the credential leak that
 * `redactPath` exists to prevent, via a route list that grows every time
 * someone adds an endpoint. Since every report below already excludes `/api/%`,
 * these rows have no reader today; dropping them removes the whole class of
 * leak instead of chasing it endpoint by endpoint.
 *
 * @param path Request path, with or without a query string.
 * @returns true when the request should not be stored.
 */
export function isNoisePath(path?: string | null): boolean {
  if (!path) return true;
  // Compared case-insensitively so an oddly-cased `/API/...` can't slip a
  // credential past the filter, even though such a request would 404.
  const p = path.split('?')[0].toLowerCase();
  if (p === VERCEL_DRAIN_PATH) return true;
  if (p === '/api' || p.startsWith('/api/')) return true;
  if (p.startsWith('/_next/') || p.startsWith('/__nextjs')) return true;
  if (['/favicon.ico', '/robots.txt', '/sitemap.xml'].includes(p)) return true;
  if (p.includes('.')) {
    const ext = p.split('.').pop();
    if (ext && (ASSET_EXTENSIONS as readonly string[]).includes(ext)) return true;
  }
  return false;
}

/**
 * Routes where a path SEGMENT is the access credential.
 *
 * Several customer-facing routes here grant access by possession of the URL —
 * a dashboard code, an invoice token, a share link. Storing those verbatim
 * would turn this table into a durable list of working links to customer data
 * and live checkout flows, readable by anything with database access. So the
 * secret segment is replaced with its route template before storage: we still
 * learn that someone viewed a dashboard, without recording *which* one.
 *
 * Ingest already strips query strings for the same reason; this extends that to
 * the place this app actually puts its tokens.
 *
 * Public content routes (/products/[handle], /blog/[slug], /venues/[slug] …)
 * are deliberately NOT redacted — those are the marketing pages the whole
 * report exists to rank. Admin and ops routes are also left alone: they sit
 * behind ops auth, so their ids are not credentials.
 */
const SENSITIVE_PATH_RULES: { pattern: RegExp; replacement: string }[] = [
  { pattern: /^\/dashboard\/[^/]+/i, replacement: '/dashboard/[code]' },
  { pattern: /^\/group\/[^/]+/i, replacement: '/group/[code]' },
  { pattern: /^\/invoice\/[^/]+/i, replacement: '/invoice/[token]' },
  { pattern: /^\/cart\/shared\/[^/]+/i, replacement: '/cart/shared/[id]' },
  { pattern: /^\/concierge-quote\/[^/]+/i, replacement: '/concierge-quote/[leadId]' },
  { pattern: /^\/s\/[^/]+/i, replacement: '/s/[slug]' },
  // /invoices/<...> and /<storeId>/invoices/<...> are catch-all invoice links.
  { pattern: /^(\/[^/]+)?\/invoices\/.+$/i, replacement: '$1/invoices/[...]' },
];

/**
 * Replace credential-bearing path segments with their route template.
 *
 * @param path A request path with the query string already removed.
 * @returns The path safe to store, unchanged when nothing sensitive matched.
 */
export function redactPath(path: string): string {
  // Collapse repeated slashes first: `/dashboard//CODE` reaches the same page
  // but would slip past a `[^/]+` segment match and store the code verbatim.
  const normalized = path.replace(/\/{2,}/g, '/');
  for (const { pattern, replacement } of SENSITIVE_PATH_RULES) {
    if (pattern.test(normalized)) return normalized.replace(pattern, replacement);
  }
  return normalized;
}

/**
 * Apply the same redaction to a referrer URL.
 *
 * Navigating away from a dashboard sends its URL as the Referer of the next
 * request, so without this the codes stripped from `path` would simply reappear
 * in `referrer`. The query string is dropped outright — referrers arrive from
 * anywhere, and a stray token in someone else's query string is not ours to keep.
 *
 * Anything that is not a well-formed http(s) URL or a plain same-origin path is
 * dropped rather than stored: a malformed referrer carries no analytical value,
 * and guessing at its shape is how a credential slips through. A
 * protocol-relative value like `//host/dashboard/CODE` is exactly that case —
 * it is not parseable without a base, and treating it as a path would leave the
 * code intact.
 *
 * @param referrer Raw Referer header value.
 * @returns Origin plus redacted path, or null when it cannot be made safe.
 */
export function redactReferrer(referrer: string): string | null {
  try {
    const url = new URL(referrer);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.origin}${redactPath(url.pathname)}`;
  } catch {
    // Not absolute. A bare same-origin path is still meaningful; anything else
    // is discarded.
    if (referrer.startsWith('/') && !referrer.startsWith('//')) {
      return redactPath(referrer.split('?')[0]);
    }
    return null;
  }
}

/**
 * How long raw request logs are kept.
 *
 * These rows carry client IPs and user agents, so they are not kept
 * indefinitely. 90 days matches the longest window the reports offer, so
 * nothing the UI can ask for is ever missing.
 */
export const RETENTION_DAYS = 90;

/**
 * Delete request logs past the retention window.
 *
 * @returns How many rows were removed.
 */
export async function pruneVercelEvents(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  const { count } = await prisma.vercelEvent.deleteMany({ where: { timestamp: { lt: cutoff } } });
  return count;
}

/** A single page and how many times humans viewed it. */
export interface TopPage {
  path: string;
  views: number;
}

/** Headline server-side traffic figures for a trailing window. */
export interface WebsiteInsights {
  /** Days covered by the window. */
  days: number;
  /** Page views from non-bot user-agents. */
  pageViews: number;
  /** Page views attributed to bots, crawlers and automated agents. */
  botViews: number;
  /** Distinct client IPs behind the human page views. */
  uniqueVisitors: number;
  /** Busiest pages by human views, most popular first. */
  topPages: TopPage[];
}

/**
 * A page view is a successful GET of a real page: not an asset, not a Next.js
 * internal, not an API call. 304s count — a returning visitor hitting cache is
 * still a visit.
 *
 * Re-delivered drain lines are collapsed with COUNT(DISTINCT ...); COALESCE
 * matters because SQL's DISTINCT ignores NULLs, so rows that arrived without a
 * Vercel id would otherwise count as zero instead of one.
 */
const PAGE_VIEW_WHERE = `
  timestamp >= $1
  AND method = 'GET'
  AND status_code IN (200, 304)
  AND coalesce(path, '') <> ''
  AND path NOT LIKE '/_next/%'
  AND path NOT LIKE '/api/%'
  AND path !~* $2
`;

/**
 * Human/bot split, shared verbatim by the headline queries and the daily trend
 * so the two can never disagree. A bot is: a bot-declaring user-agent, a
 * missing user-agent, or a datacenter client IP (`is_datacenter`, stamped at
 * ingest — stealth scrapers wear browser UAs but run on cloud IPs). NULL
 * `is_datacenter` (rows from before the flag existed) counts as human, so
 * uncertainty never invents bots. The two conditions are exact complements:
 * every page view lands in exactly one bucket.
 */
const HUMAN_COND = `(user_agent IS NOT NULL AND user_agent !~* $3 AND is_datacenter IS NOT TRUE)`;
const BOT_COND = `(user_agent IS NULL OR user_agent ~* $3 OR is_datacenter IS TRUE)`;

const HUMAN_WHERE = `AND ${HUMAN_COND}`;
const BOT_WHERE = `AND ${BOT_COND}`;

/**
 * Headline traffic figures for the last N days, split human vs bot.
 *
 * All values are bound as query parameters (the regexes included), so the only
 * interpolated text is the static SQL above.
 *
 * @param days Size of the trailing window in days.
 * @returns Human page views, bot views, unique visitors and the top 10 pages.
 */
export async function getWebsiteInsights(days = 30): Promise<WebsiteInsights> {
  const since = new Date(Date.now() - days * 86_400_000);
  const params = [since, ASSET_PATH_SQL_REGEX, BOT_UA_REGEX];

  const [humanRows, botRows, visitorRows, topPages] = await Promise.all([
    prisma.$queryRawUnsafe<{ c: number }[]>(
      `SELECT COUNT(DISTINCT COALESCE(vercel_id, id))::int AS c FROM vercel_events
       WHERE ${PAGE_VIEW_WHERE} ${HUMAN_WHERE}`,
      ...params
    ),
    prisma.$queryRawUnsafe<{ c: number }[]>(
      `SELECT COUNT(DISTINCT COALESCE(vercel_id, id))::int AS c FROM vercel_events
       WHERE ${PAGE_VIEW_WHERE} ${BOT_WHERE}`,
      ...params
    ),
    prisma.$queryRawUnsafe<{ c: number }[]>(
      `SELECT COUNT(DISTINCT client_ip)::int AS c FROM vercel_events
       WHERE ${PAGE_VIEW_WHERE} ${HUMAN_WHERE}`,
      ...params
    ),
    prisma.$queryRawUnsafe<TopPage[]>(
      `SELECT path, COUNT(DISTINCT COALESCE(vercel_id, id))::int AS views FROM vercel_events
       WHERE ${PAGE_VIEW_WHERE} ${HUMAN_WHERE}
       GROUP BY path ORDER BY views DESC, path ASC LIMIT 10`,
      ...params
    ),
  ]);

  return {
    days,
    pageViews: humanRows[0]?.c ?? 0,
    botViews: botRows[0]?.c ?? 0,
    uniqueVisitors: visitorRows[0]?.c ?? 0,
    topPages: topPages.map((p) => ({ path: p.path, views: Number(p.views) })),
  };
}

/** One day of the traffic trend, bucketed in America/Chicago. */
export interface DailyTraffic {
  /** Calendar day as YYYY-MM-DD (Central time — "US days", not UTC ones). */
  day: string;
  /** Human page views that day. */
  human: number;
  /** Bot page views that day. */
  bot: number;
}

/** Timezone the daily buckets use — a spike should land on the day Austin saw it. */
export const REPORTING_TIME_ZONE = 'America/Chicago';

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: REPORTING_TIME_ZONE });

/**
 * Zero-fill a sparse day series so the chart never invents continuity.
 *
 * SQL GROUP BY skips days with no rows, and a line chart drawn over the gaps
 * would connect points across them as if traffic had smoothly dipped. This puts
 * an explicit zero on every missing day of the window, oldest first.
 *
 * Pure so it can be unit-tested; `now` is injectable for the same reason.
 *
 * @param rows Sparse rows from the daily query.
 * @param days Size of the trailing window in days (the last entry is today).
 * @param now Reference time, defaults to the current moment.
 */
export function fillDailySeries(rows: DailyTraffic[], days: number, now = new Date()): DailyTraffic[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));

  // Resolve "today" in Central time once (en-CA formats as YYYY-MM-DD, matching
  // the SQL's to_char output), then walk backwards by CALENDAR days in UTC
  // space. Subtracting 24h of epoch time instead would skip or duplicate one
  // Central day a year at the DST changeovers.
  const [y, m, d] = dayFormatter.format(now).split('-').map(Number);
  const series: DailyTraffic[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10);
    const row = byDay.get(day);
    series.push({ day, human: Number(row?.human ?? 0), bot: Number(row?.bot ?? 0) });
  }
  return series;
}

/**
 * Human and bot page views per Central-time calendar day, zero-filled.
 *
 * One query: FILTER splits the human/bot counts inside the same page-view
 * definition the headline figures use, so the trend can never disagree with
 * the totals about what a page view is.
 *
 * @param days Size of the trailing window in days.
 */
export async function getDailyTraffic(days = 30): Promise<DailyTraffic[]> {
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await prisma.$queryRawUnsafe<{ day: string; human: number; bot: number }[]>(
    `SELECT to_char(timestamp AT TIME ZONE '${REPORTING_TIME_ZONE}', 'YYYY-MM-DD') AS day,
            COUNT(DISTINCT COALESCE(vercel_id, id)) FILTER (WHERE ${HUMAN_COND})::int AS human,
            COUNT(DISTINCT COALESCE(vercel_id, id)) FILTER (WHERE ${BOT_COND})::int AS bot
     FROM vercel_events
     WHERE ${PAGE_VIEW_WHERE}
     GROUP BY day`,
    since,
    ASSET_PATH_SQL_REGEX,
    BOT_UA_REGEX
  );

  return fillDailySeries(rows, days);
}
