import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({ eventRsvp: { aggregate: vi.fn() } }));
const getTicketedEventRosterMock = vi.hoisted(() => vi.fn());
const isFullMoonPostponedMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));
vi.mock('@/lib/full-moon/roster', () => ({ getTicketedEventRoster: getTicketedEventRosterMock }));
vi.mock('@/lib/full-moon/event-state', () => ({ isFullMoonPostponed: isFullMoonPostponedMock }));

import { deriveDateStatus, getOpsEventSummaries } from '../ops-summary';

describe('deriveDateStatus', () => {
  const AUG1_NOON = Date.parse('2026-08-01T12:00:00Z');

  it('is "active" for an undated event', () => {
    expect(deriveDateStatus(null, AUG1_NOON)).toBe('active');
  });
  it('is "upcoming" before the event day', () => {
    expect(deriveDateStatus('2026-08-01', Date.parse('2026-07-20T00:00:00Z'))).toBe('upcoming');
  });
  it('is "today" during the event day', () => {
    expect(deriveDateStatus('2026-08-01', AUG1_NOON)).toBe('today');
  });
  it('is "past" after the event day', () => {
    expect(deriveDateStatus('2026-08-01', Date.parse('2026-08-02T00:00:01Z'))).toBe('past');
  });
  it('handles full-ISO dates by using the day part', () => {
    expect(deriveDateStatus('2026-08-01T20:00:00-05:00', Date.parse('2026-07-01T00:00:00Z'))).toBe('upcoming');
  });
});

describe('getOpsEventSummaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTicketedEventRosterMock.mockResolvedValue({
      productFound: true,
      orders: [],
      totals: {
        ticketsSold: 10,
        payingOrders: 9,
        compOrders: 1,
        collected: 531,
        minimum: 32,
        advertisedCapacity: 50,
        hardCap: 60,
        overMinimum: false,
      },
    });
    isFullMoonPostponedMock.mockResolvedValue(false);
    prismaMock.eventRsvp.aggregate.mockResolvedValue({
      _sum: { adults: 12, kids: 4, totalHeads: 16 },
      _count: 5,
    });
  });

  it('summarizes the ticketed event from the shared roster + postponed flag', async () => {
    const summaries = await getOpsEventSummaries(Date.parse('2026-07-20T00:00:00Z'));
    const fm = summaries.find((s) => s.key === 'full-moon-aug28')!;
    expect(fm.type).toBe('ticketed');
    expect(fm.ticketed?.ticketsSold).toBe(10);
    expect(fm.ticketed?.collected).toBe(531);
    expect(fm.ticketed?.postponed).toBe(false);
    expect(fm.status).toBe('upcoming');
  });

  it('reflects the postponed flag in the ticketed status', async () => {
    isFullMoonPostponedMock.mockResolvedValue(true);
    const summaries = await getOpsEventSummaries(Date.parse('2026-07-20T00:00:00Z'));
    const fm = summaries.find((s) => s.key === 'full-moon-aug28')!;
    expect(fm.status).toBe('postponed');
    expect(fm.ticketed?.postponed).toBe(true);
  });

  it('summarizes the RSVP event from event_rsvps aggregates', async () => {
    const summaries = await getOpsEventSummaries();
    const dgw = summaries.find((s) => s.key === 'dads-gone-wild')!;
    expect(dgw.type).toBe('rsvp');
    expect(dgw.rsvp).toEqual({ parties: 5, adults: 12, kids: 4, heads: 16 });
  });

  it('returns a summary per registered event', async () => {
    const summaries = await getOpsEventSummaries();
    expect(summaries.length).toBe(2);
  });
});
