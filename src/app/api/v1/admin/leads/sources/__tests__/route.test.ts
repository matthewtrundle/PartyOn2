/**
 * GET /api/v1/admin/leads/sources.
 *
 * Two properties are load-bearing: it is admin-only (leads are PII), and it is
 * genuinely read-only. The board's own GET runs the enrol sweep — a write — so
 * the prisma mock below makes every mutating method throw. If somebody later
 * "helpfully" adds a sweep here, these tests fail rather than the write
 * shipping unnoticed.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const authMock = vi.hoisted(() => ({ requireAdminRole: vi.fn() }));
vi.mock('@/lib/auth/ops-session', () => authMock);

const writeGuard = (name: string) => () => {
  throw new Error(`read-only route attempted a write: ${name}`);
};
const prismaMock = vi.hoisted(() => ({
  lead: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  $transaction: vi.fn(),
}));
vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));

import { GET } from '../route';

function req(qs = ''): NextRequest {
  return new NextRequest(`http://localhost/api/v1/admin/leads/sources${qs}`);
}

const leadRow = {
  id: 'lead-1',
  email: 'guest@example.com',
  phone: null,
  firstName: 'Guest',
  lastName: null,
  status: 'SUBMITTED',
  sourceWidget: 'CONTACT_FORM',
  utmMedium: null,
  metadata: { eventQuiz: { partyType: 'wedding' } },
  affiliateId: null,
  pipelineStage: 'NEW',
  createdAt: new Date('2026-07-01T00:00:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.requireAdminRole.mockResolvedValue({ role: 'admin' });
  prismaMock.lead.findMany.mockResolvedValue([leadRow]);
  prismaMock.$queryRaw.mockResolvedValue([]);
  for (const name of ['create', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert'] as const) {
    prismaMock.lead[name].mockImplementation(writeGuard(`lead.${name}`));
  }
  prismaMock.$executeRaw.mockImplementation(writeGuard('$executeRaw'));
  prismaMock.$transaction.mockImplementation(writeGuard('$transaction'));
});

describe('GET /api/v1/admin/leads/sources', () => {
  it('refuses a caller without the admin role', async () => {
    authMock.requireAdminRole.mockResolvedValue(
      NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    );
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(prismaMock.lead.findMany).not.toHaveBeenCalled();
  });

  it('returns the rollup without performing a single write', async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totals.people).toBe(1);
    expect(json.data.forms[0].key).toBe('event-quiz');

    for (const name of ['create', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert'] as const) {
      expect(prismaMock.lead[name], `lead.${name}`).not.toHaveBeenCalled();
    }
    expect(prismaMock.$executeRaw).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('reads every lead — no score cap, unlike the board', async () => {
    await GET(req());
    const args = prismaMock.lead.findMany.mock.calls[0][0];
    expect(args.take).toBeUndefined();
    expect(args.orderBy).toBeUndefined();
  });

  it('scopes to a window when days is supplied', async () => {
    await GET(req('?days=30'));
    const where = prismaMock.lead.findMany.mock.calls[0][0].where;
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    expect((await (await GET(req('?days=30'))).json()).data.windowDays).toBe(30);
  });

  it('reads all time when days is omitted', async () => {
    await GET(req());
    expect(prismaMock.lead.findMany.mock.calls[0][0].where).toBeUndefined();
  });

  it('rejects an out-of-range window', async () => {
    const res = await GET(req('?days=99999'));
    expect(res.status).toBe(400);
    expect(prismaMock.lead.findMany).not.toHaveBeenCalled();
  });

  it('500s without leaking the underlying error', async () => {
    prismaMock.lead.findMany.mockRejectedValue(new Error('connection string leak'));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('connection string');
  });
});
