import { NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';

/**
 * GET /api/ops/event-rsvps — the guest list for one-off event invites
 * (e.g. /dads-gone-wild). Ops-only. Returns RSVPs grouped by event slug, each
 * group carrying rolled-up head counts so the ops page can show totals without
 * re-summing on the client.
 */
export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const rsvps = await prisma.eventRsvp.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        event: true,
        name: true,
        adults: true,
        kids: true,
        dish: true,
        totalHeads: true,
        createdAt: true,
      },
    });

    // Group by event slug, newest-first within each group (the query order is
    // preserved as we push).
    const groups = new Map<
      string,
      {
        event: string;
        parties: number;
        totalAdults: number;
        totalKids: number;
        totalHeads: number;
        rsvps: typeof rsvps;
      }
    >();

    for (const r of rsvps) {
      const g = groups.get(r.event) ?? {
        event: r.event,
        parties: 0,
        totalAdults: 0,
        totalKids: 0,
        totalHeads: 0,
        rsvps: [],
      };
      g.parties += 1;
      g.totalAdults += r.adults;
      g.totalKids += r.kids;
      g.totalHeads += r.totalHeads;
      g.rsvps.push(r);
      groups.set(r.event, g);
    }

    return NextResponse.json({ events: Array.from(groups.values()) });
  } catch (error) {
    console.error('[Ops Event RSVPs] error:', error);
    return NextResponse.json({ error: 'Failed to load RSVPs.' }, { status: 500 });
  }
}
