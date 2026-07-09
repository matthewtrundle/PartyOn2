/**
 * Ops events catalog — the single registry of every real event the ops team
 * runs, so the /ops/events hub can list them all with live stats.
 *
 * Events are heterogeneous: some are free RSVP invites (headcount in the
 * `event_rsvps` table, keyed by slug) and some are ticketed (paid Orders for a
 * ticket product). Each entry says which type it is and how to find its data.
 *
 * To add an event: append one entry here when you build its page. No DB table —
 * each event still ships its own bespoke landing page, so a code registry keeps
 * the hub in sync with what actually exists.
 */
import { EVENT, TICKET_PRODUCT_HANDLE } from '@/components/full-moon/event';

export type OpsEventType = 'rsvp' | 'ticketed';

export interface OpsEventEntry {
  /** Stable id (also used as the React key). */
  key: string;
  title: string;
  type: OpsEventType;
  /** Event date (ISO `YYYY-MM-DD` or full ISO); null when undated. */
  date: string | null;
  /** Public landing page path, or null if there isn't one. */
  publicPath: string | null;
  /** Ops detail/roster page to drill into. */
  detailPath: string;
  /** RSVP events: the slug stored in `event_rsvps.event`. */
  rsvpSlug?: string;
  /** Ticketed events: product handle + thresholds for the roster summary. */
  ticket?: {
    productHandle: string;
    minimum: number;
    advertisedCapacity: number;
    hardCap: number;
    /**
     * When true, the summary also reflects the Full Moon "postponed" flag.
     * (Currently Full-Moon-specific — the flag key is per-event; generalize when
     * a second event needs a postpone toggle.)
     */
    postponeCheck?: boolean;
  };
}

export const OPS_EVENTS: OpsEventEntry[] = [
  {
    key: 'full-moon-aug1',
    title: 'Lake Travis Full Moon Party',
    type: 'ticketed',
    date: EVENT.isoDate,
    publicPath: '/full-moon-aug1',
    detailPath: '/ops/full-moon',
    ticket: {
      productHandle: TICKET_PRODUCT_HANDLE,
      minimum: EVENT.minimum,
      advertisedCapacity: EVENT.capacity,
      hardCap: EVENT.hardCap,
      postponeCheck: true,
    },
  },
  {
    key: 'dads-gone-wild',
    title: "Dad's Gone Wild",
    type: 'rsvp',
    date: null,
    publicPath: '/dads-gone-wild',
    detailPath: '/ops/rsvps',
    rsvpSlug: 'dads-gone-wild',
  },
];
