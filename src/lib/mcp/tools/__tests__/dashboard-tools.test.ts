import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * First tests for the MCP server. They cover the two things most likely to be
 * wrong and least likely to be noticed: the derived cruise date, and the
 * envelope/paging contract the tools promise their callers.
 */

const prismaMock = vi.hoisted(() => ({
  groupOrderV2: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  boatSchedule: { findMany: vi.fn(), count: vi.fn() },
  mcpRequestLog: { create: vi.fn().mockResolvedValue({}) },
}));
vi.mock('@/lib/database/client', () => ({ prisma: prismaMock, kv: {}, isKVConfigured: () => false }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock, default: prismaMock }));

import { deriveCruiseDate, normalizeCruiseType, registerGetDashboard } from '../get-dashboard';
import { registerListDashboards } from '../list-dashboards';
import { registerBoatSchedule } from '../boat-schedule';
import type { McpAuth } from '../../auth';

const AUTH: McpAuth = { level: 'read', actor: 'test' };

/** Minimal McpServer stand-in that captures the handler so we can invoke it. */
function captureTool(register: (server: never, auth: McpAuth) => void) {
  const tools = new Map<string, (args: Record<string, unknown>) => Promise<{
    content: { type: string; text: string }[];
    isError?: boolean;
  }>>();
  const fakeServer = {
    registerTool: (name: string, _def: unknown, handler: never) => {
      tools.set(name, handler as never);
    },
  };
  register(fakeServer as never, AUTH);
  return tools;
}

async function callTool(
  register: (server: never, auth: McpAuth) => void,
  name: string,
  args: Record<string, unknown> = {}
) {
  const handler = captureTool(register).get(name)!;
  const res = await handler(args);
  return { raw: res, body: JSON.parse(res.content[0].text) };
}

beforeEach(() => vi.clearAllMocks());

describe('deriveCruiseDate', () => {
  const boat = (iso: string | null) => ({
    deliveryDate: iso ? new Date(iso) : null,
    deliveryContextType: 'BOAT',
  });
  const house = (iso: string) => ({
    deliveryDate: new Date(iso),
    deliveryContextType: 'HOUSE',
  });

  it('uses the BOAT tab, not the earliest tab overall', () => {
    // The lodging leg is earlier — taking min() across all tabs (what the admin
    // list endpoint does) would return the wrong date as the sail date.
    expect(
      deriveCruiseDate([house('2026-08-01T00:00:00Z'), boat('2026-08-10T00:00:00Z')])
    ).toBe('2026-08-10T00:00:00.000Z');
  });

  it('takes the earliest when a dashboard somehow has two BOAT tabs', () => {
    expect(
      deriveCruiseDate([boat('2026-09-01T00:00:00Z'), boat('2026-08-15T00:00:00Z')])
    ).toBe('2026-08-15T00:00:00.000Z');
  });

  it('ignores undated BOAT tabs rather than treating null as earliest', () => {
    expect(deriveCruiseDate([boat(null), boat('2026-08-20T00:00:00Z')])).toBe(
      '2026-08-20T00:00:00.000Z'
    );
  });

  it('returns null when no BOAT tab has a date', () => {
    expect(deriveCruiseDate([boat(null), house('2026-08-01T00:00:00Z')])).toBeNull();
    expect(deriveCruiseDate([])).toBeNull();
  });
});

describe('normalizeCruiseType', () => {
  it('lowercases the free-text override so DISCO and disco compare equal', () => {
    expect(normalizeCruiseType('DISCO')).toBe('disco');
    expect(normalizeCruiseType(' Private ')).toBe('private');
  });

  it('maps null and blank to null', () => {
    expect(normalizeCruiseType(null)).toBeNull();
    expect(normalizeCruiseType('   ')).toBeNull();
  });
});

describe('get_dashboard', () => {
  const row = {
    id: 'd1', name: 'Jane Party', shareCode: 'MFNF37', status: 'ACTIVE', source: 'WEBHOOK',
    partyType: 'BOAT', cruiseType: 'DISCO', externalBookingId: 'xola-1',
    hostName: 'Jane', hostEmail: 'j@x.com', hostPhone: '+15125550123', hostCustomerId: null,
    viewCount: 3, isLastMinute: false, affiliateId: null,
    expiresAt: new Date('2026-09-01T00:00:00Z'),
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-02T00:00:00Z'),
    tabs: [
      { id: 't1', name: 'Cruise', position: 0, deliveryDate: new Date('2026-08-20T00:00:00Z'),
        deliveryDateConfirmed: true, deliveryTime: '10:00', deliveryContextType: 'BOAT', status: 'OPEN' },
    ],
  };

  it('errors when neither identifier is given', async () => {
    const { raw, body } = await callTool(registerGetDashboard, 'get_dashboard', {});
    expect(raw.isError).toBe(true);
    expect(body.error).toBe('missing_identifier');
    expect(prismaMock.groupOrderV2.findUnique).not.toHaveBeenCalled();
  });

  it('looks up a share code by unique key and derives the cruise date', async () => {
    prismaMock.groupOrderV2.findUnique.mockResolvedValue(row);
    const { body } = await callTool(registerGetDashboard, 'get_dashboard', { shareCode: 'MFNF37' });

    expect(prismaMock.groupOrderV2.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shareCode: 'MFNF37' } })
    );
    expect(body.item.cruiseDate).toBe('2026-08-20T00:00:00.000Z');
    expect(body.item.cruiseType).toBe('disco');
    expect(body.item.shareUrl).toContain('MFNF37');
  });

  // externalBookingId is stamped on after creation and has no unique index, so
  // findUnique would throw at runtime — this must use findFirst.
  it('looks up a booking id with findFirst, newest first', async () => {
    prismaMock.groupOrderV2.findFirst.mockResolvedValue(row);
    await callTool(registerGetDashboard, 'get_dashboard', { externalBookingId: 'xola-1' });

    expect(prismaMock.groupOrderV2.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { externalBookingId: 'xola-1' },
        orderBy: { createdAt: 'desc' },
      })
    );
    expect(prismaMock.groupOrderV2.findUnique).not.toHaveBeenCalled();
  });

  it('returns a not_found envelope rather than throwing', async () => {
    prismaMock.groupOrderV2.findUnique.mockResolvedValue(null);
    const { raw, body } = await callTool(registerGetDashboard, 'get_dashboard', { shareCode: 'NOPE' });
    expect(raw.isError).toBe(true);
    expect(body.error).toBe('not_found');
  });
});

describe('list_dashboards', () => {
  beforeEach(() => {
    prismaMock.groupOrderV2.findMany.mockResolvedValue([]);
    prismaMock.groupOrderV2.count.mockResolvedValue(0);
  });

  // Filtering after fetching would return short pages whenever a row on the
  // page had no dated BOAT tab.
  it('pushes the cruise-date filter into SQL against BOAT tabs', async () => {
    await callTool(registerListDashboards, 'list_dashboards', { cruiseDateFrom: '2026-08-01' });
    const where = prismaMock.groupOrderV2.findMany.mock.calls[0][0].where;
    expect(where.tabs.some.deliveryContextType).toBe('BOAT');
    expect(where.tabs.some.deliveryDate.gte).toEqual(new Date('2026-08-01'));
  });

  it('matches the free-text cruise type case-insensitively', async () => {
    await callTool(registerListDashboards, 'list_dashboards', { cruiseType: 'disco' });
    const where = prismaMock.groupOrderV2.findMany.mock.calls[0][0].where;
    expect(where.cruiseType).toEqual({ equals: 'disco', mode: 'insensitive' });
  });

  it('clamps an oversized limit and reports truncation', async () => {
    prismaMock.groupOrderV2.findMany.mockResolvedValue([]);
    prismaMock.groupOrderV2.count.mockResolvedValue(500);
    const { body } = await callTool(registerListDashboards, 'list_dashboards', { limit: 9999 });
    expect(prismaMock.groupOrderV2.findMany.mock.calls[0][0].take).toBe(50);
    expect(body.truncated).toBe(true);
  });
});

describe('boat_schedule', () => {
  beforeEach(() => {
    prismaMock.boatSchedule.findMany.mockResolvedValue([]);
    prismaMock.boatSchedule.count.mockResolvedValue(0);
  });

  // Cancelled cruises stay in the table flagged stale; returning them as
  // upcoming would put called-off sailings on the day sheet.
  it('excludes stale rows by default and includes them on request', async () => {
    await callTool(registerBoatSchedule, 'boat_schedule', {});
    expect(prismaMock.boatSchedule.findMany.mock.calls[0][0].where.isStale).toBe(false);

    vi.clearAllMocks();
    prismaMock.boatSchedule.findMany.mockResolvedValue([]);
    prismaMock.boatSchedule.count.mockResolvedValue(0);
    await callTool(registerBoatSchedule, 'boat_schedule', { includeStale: true });
    expect(prismaMock.boatSchedule.findMany.mock.calls[0][0].where.isStale).toBeUndefined();
  });

  it('defaults to upcoming cruises when no date filter is given', async () => {
    await callTool(registerBoatSchedule, 'boat_schedule', {});
    const where = prismaMock.boatSchedule.findMany.mock.calls[0][0].where;
    expect(where.cruiseDate.gte).toBeInstanceOf(Date);
    expect(where.cruiseDate.lte).toBeUndefined();
  });

  it('converts Decimal amounts to numbers so they serialize', async () => {
    prismaMock.boatSchedule.findMany.mockResolvedValue([{
      id: 1, cruiseDate: new Date('2026-08-20T00:00:00Z'), dayOfWeek: 'Thu', timeSlot: 'AM',
      boat: 'Disco', clientName: 'Jane', clientPhone: null, package: null, addOns: null,
      occasion: null, headcount: 12, amount: { toString: () => '1200.50' }, tip: null,
      dj: null, photographer: null, captainCrew: null, isStale: false,
      lastSeenAt: new Date('2026-08-12T00:00:00Z'),
    }]);
    prismaMock.boatSchedule.count.mockResolvedValue(1);

    const { body } = await callTool(registerBoatSchedule, 'boat_schedule', {});
    expect(body.items[0].amount).toBe(1200.5);
    expect(body.items[0].cruiseDate).toBe('2026-08-20');
  });
});
