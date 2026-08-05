/**
 * Map GA4 Default Channel Group labels → the five scalar session columns on
 * AnalyticsSnapshot (organic / direct / referral / social / paid), plus a
 * `residual` catch-all.
 *
 * WHY this is its own tested module: the GA4 label strings are the fragile
 * part. `getTrafficSources` returns rows keyed by `sessionDefaultChannelGroup`
 * ("Organic Search", "Paid Search", "Cross-network", …), and until now the
 * snapshot upsert never projected them into the scalar columns at all — every
 * `organicSessions`/`paidSessions`/… row sat at the schema `@default(0)`, so
 * no consumer could trust them. A label GA4 renames, or a new channel group we
 * don't recognise, must NOT silently vanish into a wrong bucket or a dropped
 * count — it lands in `residual`, which stays visible in `top_referrers`.
 *
 * The taxonomy is platform-based, not spend-based: `social` is ALL social
 * traffic (organic AND paid), and `paid` is paid NON-social ad channels. So
 * Paid Social lives in `social`, not `paid` — read `paidSessions` as "paid
 * non-social ad traffic", not "all paid advertising". (No consumer reads these
 * columns as a paid-spend denominator today; if one ever does, revisit this.)
 *
 * Buckets (case-insensitive, whitespace-tolerant):
 *   organic  ← Organic Search
 *   direct   ← Direct
 *   referral ← Referral
 *   social   ← Organic Social, Paid Social  (all social platforms)
 *   paid     ← Paid Search, Paid Shopping, Paid Video, Paid Other, Display,
 *              Cross-network  (paid non-social ad channels)
 *   residual ← everything else (Organic Shopping, Organic Video, Unassigned,
 *              Email, SMS, Affiliates, AI Assistant, and any future/unknown
 *              label) — kept visible, never dropped, never mis-filed
 *
 * NOTE on totals: `getTrafficSources` pulls only the top 10 channel groups, so
 * these five columns + residual sum to slightly LESS than total sessions
 * (verified 2026-08-04: 3,786 mapped vs 3,897 total, ~3% short). This is a
 * documented limitation, not a bug — widening the GA4 pull was deliberately
 * deferred. Read the columns as "at least this many", never as exact.
 */

export interface ChannelSource {
  source: string;
  sessions: number;
}

export interface ChannelSessionBuckets {
  organic: number;
  direct: number;
  referral: number;
  social: number;
  paid: number;
  /** Recognised-but-uncategorised + unknown labels. Never dropped. */
  residual: number;
}

type Bucket = keyof ChannelSessionBuckets;

/**
 * Exact GA4 Default Channel Group label (normalised: lowercased, inner
 * whitespace collapsed) → bucket. Anything not here falls to `residual`.
 * Matching is exact-after-normalisation on purpose: a substring rule would
 * mis-file "Organic Shopping" as organic and "Paid Social" as paid.
 */
const LABEL_TO_BUCKET: Record<string, Bucket> = {
  'organic search': 'organic',
  direct: 'direct',
  referral: 'referral',
  'organic social': 'social',
  'paid social': 'social',
  'paid search': 'paid',
  'paid shopping': 'paid',
  'paid video': 'paid',
  'paid other': 'paid',
  display: 'paid',
  'cross-network': 'paid',
};

/** Lowercase + trim + collapse internal whitespace so " Organic  Search " matches. */
function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Classify a single GA4 channel-group label into one of the five columns, or
 * `residual` when it isn't one of the mapped channels. Exported for tests and
 * for any caller that needs per-label routing.
 */
export function bucketForChannel(label: string): Bucket {
  const key = normalizeLabel(label);
  // Object.hasOwn, not `LABEL_TO_BUCKET[key] ?? 'residual'`: a plain-object
  // lookup on an Object.prototype name ('constructor', '__proto__', …) returns
  // an inherited truthy value that would bypass the `?? 'residual'` fallback
  // and make the session count silently vanish — violating this module's own
  // "never dropped" invariant. Same footgun that ate whole lead submissions in
  // PR #363 (a `constructor` source string). GA4's fixed taxonomy makes such a
  // label unrealistic today, but the guard costs nothing.
  return Object.hasOwn(LABEL_TO_BUCKET, key) ? LABEL_TO_BUCKET[key] : 'residual';
}

/**
 * Sum a list of {source, sessions} rows into the five session columns.
 * Non-finite / negative session counts are treated as 0 so a bad GA4 row can't
 * corrupt a column. An empty or missing list yields all zeros.
 */
export function mapChannelSessions(
  sources: ReadonlyArray<ChannelSource> | null | undefined,
): ChannelSessionBuckets {
  const buckets: ChannelSessionBuckets = {
    organic: 0,
    direct: 0,
    referral: 0,
    social: 0,
    paid: 0,
    residual: 0,
  };
  if (!sources) return buckets;
  for (const row of sources) {
    if (!row || typeof row.source !== 'string') continue;
    const sessions =
      typeof row.sessions === 'number' && Number.isFinite(row.sessions) && row.sessions > 0
        ? Math.round(row.sessions)
        : 0;
    buckets[bucketForChannel(row.source)] += sessions;
  }
  return buckets;
}
