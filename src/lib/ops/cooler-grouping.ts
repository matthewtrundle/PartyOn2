/**
 * Cooler-grouping helpers shared by the weekly summary data layer and the
 * unified orders view. Pure functions only — no Prisma, no fetch.
 *
 * "Cooler" = all orders sharing GroupOrderV2.shareCode + deliveryDate +
 * deliveryTime, merged into one packing unit. Grouping is sacrosanct: every
 * sub-payer belongs to exactly one cooler card and never appears outside it.
 */

export interface WeeklyManifestMatch {
  cruiseDate: string;
  timeSlot: string | null;
  boat: string | null;
  clientName: string | null;
  package: string | null;
  headcount: number | null;
  sheetTab: string | null;
  occasion: string | null;
}

export type WeeklyShortType = 'DISCO' | 'PRIVATE' | 'HOUSE';

/** Raw BoatSchedule row used for manifest matching. */
export interface BoatScheduleRow {
  cruiseDate: Date;
  timeSlot: string | null;
  boat: string;
  clientName: string;
  normalizedName: string | null;
  normalizedPhone: string | null;
  package: string | null;
  headcount: number | null;
  sheetTab: string;
  occasion: string | null;
}

/**
 * Minimal cooler shape the classification helpers need — both the weekly
 * accumulator and the orders-view card builder satisfy it structurally.
 */
export interface CoolerLike {
  primaryName: string;
  address: string;
  source: string;
  partyType: string | null;
  manifestMatch: BoatScheduleRow | null;
  payments: Array<{ payer: string }>;
  /** Operator-set cruise-type override ('DISCO' | 'PRIVATE') from GroupOrderV2. */
  cruiseType?: string | null;
}

/**
 * Authoritative cruise type for a boat delivery: the boat manifest (source of
 * truth) first, then an operator-set override. `known` is false when neither
 * exists — that is what the pick-sheet gate asks the operator to resolve.
 *
 * Deliberately does NOT guess DISCO from a WEBHOOK source the way the on-screen
 * `shortTypeFor` tag does — a private cruise must not be silently labelled Disco.
 */
export function resolveCruiseType(c: CoolerLike): { type: 'DISCO' | 'PRIVATE' | null; known: boolean } {
  const tab = c.manifestMatch?.sheetTab?.toUpperCase() || '';
  if (tab.includes('DSC')) return { type: 'DISCO', known: true };
  if (tab.includes('PVT')) return { type: 'PRIVATE', known: true };
  const override = (c.cruiseType || '').toUpperCase();
  if (override === 'DISCO') return { type: 'DISCO', known: true };
  if (override === 'PRIVATE') return { type: 'PRIVATE', known: true };
  return { type: null, known: false };
}

const PLACEHOLDER_NAMES = new Set([
  'host',
  'party host',
  'unknown',
  '',
  'guest',
  'customer',
  'group host',
]);

const TITLE_WORDS =
  /\b(wedding|bach|bachelor|bachelorette|party|cruise|stag|hen|reunion|birthday|drinks?|delivery|order|bash|weekend|offsite|retreat)\b/i;
const ORDINAL = /\b\d{1,3}(st|nd|rd|th)\b/i;
const POSSESSIVE = /'s\b/;

/** Lowercase, letters+spaces only — for fuzzy name comparison. */
export function normName(s: string | null | undefined): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Last 10 digits — for phone comparison. */
export function normPhone(s: string | null | undefined): string {
  return (s || '').replace(/\D/g, '').slice(-10);
}

/** True for generic non-names like "party host" / "guest". */
export function isPlaceholderName(name: string | null | undefined): boolean {
  return PLACEHOLDER_NAMES.has((name || '').trim().toLowerCase());
}

/** True when a string reads like an event title rather than a person's name. */
export function looksLikeTitle(name: string | null | undefined): boolean {
  if (!name) return false;
  if (isPlaceholderName(name)) return true;
  if (TITLE_WORDS.test(name)) return true;
  if (ORDINAL.test(name)) return true;
  if (POSSESSIVE.test(name)) return true;
  if (/\b\w+\s+and\s+\w+\b/i.test(name) && TITLE_WORDS.test(name)) return true;
  return false;
}

/**
 * America/Chicago YYYY-MM-DD for "today".
 */
export function todayCT(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

/**
 * Match a cooler to a same-day boat-manifest row by fuzzy name, falling back
 * to phone. Returns null when nothing on the manifest matches.
 */
export function findManifestMatch(
  candidates: BoatScheduleRow[],
  args: { manifestName: string | null; payerPhone: string | null; deliveryDate: Date }
): BoatScheduleRow | null {
  const dateKey = args.deliveryDate.toISOString().slice(0, 10);
  const sameDay = candidates.filter(
    (b) => b.cruiseDate.toISOString().slice(0, 10) === dateKey
  );
  if (!sameDay.length) return null;
  const targetName = normName(args.manifestName);
  const targetPhone = normPhone(args.payerPhone);
  const byName = targetName
    ? sameDay.find((c) => {
        const cn = c.normalizedName || normName(c.clientName);
        if (!cn || !targetName) return false;
        return cn === targetName || cn.includes(targetName) || targetName.includes(cn);
      })
    : undefined;
  if (byName) return byName;
  if (targetPhone) {
    return (
      sameDay.find((c) => (c.normalizedPhone || '') === targetPhone) || null
    );
  }
  return null;
}

/** Boat-related cooler: manifest-matched, webhook-sourced, BOAT party, or marina address. */
export function isBoatish(c: CoolerLike): boolean {
  if (c.manifestMatch) return true;
  if (c.source === 'WEBHOOK') return true;
  if (c.partyType === 'BOAT') return true;
  const a = (c.address || '').toLowerCase();
  return /marina|fm 2769|farm to market 2769|premier/i.test(a);
}

/** DISCO / PRIVATE / HOUSE classification used for the colored type tags. */
export function shortTypeFor(c: CoolerLike): WeeklyShortType {
  if (c.manifestMatch?.sheetTab) {
    const tab = c.manifestMatch.sheetTab.toUpperCase();
    if (tab.includes('DSC')) return 'DISCO';
    if (tab.includes('PVT')) return 'PRIVATE';
  }
  if (c.source === 'WEBHOOK') return 'DISCO';
  return 'HOUSE';
}

/**
 * Best human name for a cooler header: manifest client name, else the group
 * label when it reads like a person, else the payer(s) ("Sarah +2 more").
 */
export function preferredCustomerName(c: CoolerLike): string {
  if (c.manifestMatch?.clientName) return c.manifestMatch.clientName;
  if (isBoatish(c)) {
    const stripped = (c.primaryName || '').trim();
    if (stripped && !looksLikeTitle(stripped) && !isPlaceholderName(stripped)) {
      return stripped;
    }
  }
  const payers = c.payments.map((p) => p.payer).filter(Boolean);
  if (!payers.length) return c.primaryName || '(no name)';

  const original = (c.primaryName || '').trim();
  if (original && !looksLikeTitle(original)) {
    const hostMatch = payers.find((p) => p.toLowerCase() === original.toLowerCase());
    if (hostMatch) {
      return payers.length > 1 ? `${hostMatch} +${payers.length - 1} more` : hostMatch;
    }
  }
  return payers.length > 1 ? `${payers[0]} +${payers.length - 1} more` : payers[0];
}

/** Serialize a raw manifest row for API responses. */
export function serializeManifestMatch(m: BoatScheduleRow | null): WeeklyManifestMatch | null {
  if (!m) return null;
  return {
    cruiseDate: m.cruiseDate.toISOString().slice(0, 10),
    timeSlot: m.timeSlot || null,
    boat: m.boat || null,
    clientName: m.clientName || null,
    package: m.package || null,
    headcount: m.headcount ?? null,
    sheetTab: m.sheetTab || null,
    occasion: m.occasion || null,
  };
}

/** Cooler grouping key: shareCode+date+time for groups, order id for solos. */
export function coolerKey(args: {
  shareCode: string | null;
  deliveryDate: string;
  deliveryTime: string;
  orderId: string;
}): string {
  return args.shareCode
    ? `g:${args.shareCode}|${args.deliveryDate}|${args.deliveryTime}`
    : `s:${args.orderId}`;
}
