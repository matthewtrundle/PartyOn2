/**
 * Ops events hub — live summaries.
 *
 * Turns the OPS_EVENTS registry into per-event summary cards: RSVP events get
 * their headcount from `event_rsvps`; ticketed events reuse the SAME
 * ticket-line-scoped roster the Full Moon money/refund path uses, so "$
 * collected" means the same thing everywhere. Read-only, ops-gated at the route.
 */
import { prisma } from '@/lib/database/client';
import { getTicketedEventRoster, type RosterTotals } from '@/lib/full-moon/roster';
import { isFullMoonPostponed } from '@/lib/full-moon/event-state';
import { OPS_EVENTS, type OpsEventType } from './ops-catalog';

export type OpsEventStatus = 'active' | 'upcoming' | 'today' | 'past' | 'postponed';

export interface OpsEventSummary {
  key: string;
  title: string;
  type: OpsEventType;
  date: string | null;
  publicPath: string | null;
  detailPath: string;
  status: OpsEventStatus;
  /** Present for RSVP events. */
  rsvp?: { parties: number; adults: number; kids: number; heads: number };
  /** Present for ticketed events. */
  ticketed?: RosterTotals & { postponed: boolean; productFound: boolean };
}

/**
 * Derive a coarse status from the event date. Pure. Undated events are
 * 'active'; otherwise 'upcoming' before the day, 'today' during it, 'past'
 * after. Handles both `YYYY-MM-DD` and full-ISO dates.
 */
export function deriveDateStatus(isoDate: string | null, nowMs: number): OpsEventStatus {
  if (!isoDate) return 'active';
  const day = isoDate.slice(0, 10);
  const start = Date.parse(`${day}T00:00:00Z`);
  const end = Date.parse(`${day}T23:59:59Z`);
  if (Number.isNaN(start)) return 'active';
  if (nowMs < start) return 'upcoming';
  if (nowMs <= end) return 'today';
  return 'past';
}

/** Sort key: live events first (upcoming/today/active/postponed), past last. */
function statusRank(s: OpsEventStatus): number {
  return s === 'past' ? 1 : 0;
}

/**
 * Build the summary for every registered event, in display order (live events
 * by soonest date first, past events by most-recent first).
 */
export async function getOpsEventSummaries(nowMs: number = Date.now()): Promise<OpsEventSummary[]> {
  const summaries = await Promise.all(
    OPS_EVENTS.map(async (e): Promise<OpsEventSummary> => {
      const base = {
        key: e.key,
        title: e.title,
        type: e.type,
        date: e.date,
        publicPath: e.publicPath,
        detailPath: e.detailPath,
      };

      if (e.type === 'rsvp' && e.rsvpSlug) {
        const agg = await prisma.eventRsvp.aggregate({
          where: { event: e.rsvpSlug },
          _sum: { adults: true, kids: true, totalHeads: true },
          _count: true,
        });
        return {
          ...base,
          status: deriveDateStatus(e.date, nowMs),
          rsvp: {
            parties: agg._count,
            adults: agg._sum.adults ?? 0,
            kids: agg._sum.kids ?? 0,
            heads: agg._sum.totalHeads ?? 0,
          },
        };
      }

      if (e.type === 'ticketed' && e.ticket) {
        const roster = await getTicketedEventRoster(e.ticket.productHandle, {
          minimum: e.ticket.minimum,
          advertisedCapacity: e.ticket.advertisedCapacity,
          hardCap: e.ticket.hardCap,
        });
        const postponed = e.ticket.postponeCheck ? await isFullMoonPostponed() : false;
        return {
          ...base,
          status: postponed ? 'postponed' : deriveDateStatus(e.date, nowMs),
          ticketed: { ...roster.totals, postponed, productFound: roster.productFound },
        };
      }

      return { ...base, status: deriveDateStatus(e.date, nowMs) };
    }),
  );

  return summaries.sort((a, b) => {
    const rank = statusRank(a.status) - statusRank(b.status);
    if (rank !== 0) return rank;
    // Within the same bucket: live → soonest first; past → most recent first.
    const at = a.date ? Date.parse(a.date.slice(0, 10)) : Number.POSITIVE_INFINITY;
    const bt = b.date ? Date.parse(b.date.slice(0, 10)) : Number.POSITIVE_INFINITY;
    const av = Number.isNaN(at) ? Number.POSITIVE_INFINITY : at;
    const bv = Number.isNaN(bt) ? Number.POSITIVE_INFINITY : bt;
    return a.status === 'past' ? bv - av : av - bv;
  });
}
