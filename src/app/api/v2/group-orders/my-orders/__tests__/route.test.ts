/**
 * my-orders identity is session-derived, never request-derived.
 *
 * Both the v1 and v2 routes used to read `?customerId=` and trust it, so
 * anyone holding a customer's id could pull that customer's full order
 * history — delivery addresses and phones, plus every participant's name,
 * email and phone. These pin that the query param can no longer select whose
 * data comes back.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const sessionMock = vi.hoisted(() => ({ getSession: vi.fn() }));
const serviceMock = vi.hoisted(() => ({ getMyGroupOrders: vi.fn() }));
const prismaMock = vi.hoisted(() => ({ groupOrder: { findMany: vi.fn() } }));

vi.mock('@/lib/auth/session', () => sessionMock);
vi.mock('@/lib/group-orders-v2/service', () => serviceMock);
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { GET as v2Get } from '../route';
import { GET as v1Get } from '@/app/api/group-orders/my-orders/route';

const ME = 'customer-me';
const VICTIM = 'customer-someone-else';

function req(qs = ''): NextRequest {
  const url = `http://localhost/api/v2/group-orders/my-orders${qs}`;
  const r = new Request(url) as unknown as NextRequest;
  Object.defineProperty(r, 'nextUrl', { value: new URL(url), configurable: true });
  return r;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.getSession.mockResolvedValue({ customerId: ME, email: 'me@example.com' });
  serviceMock.getMyGroupOrders.mockResolvedValue([]);
  prismaMock.groupOrder.findMany.mockResolvedValue([]);
});

describe.each([
  ['v2', v2Get, () => serviceMock.getMyGroupOrders],
  ['v1', v1Get, () => prismaMock.groupOrder.findMany],
])('%s my-orders', (_label, handler, getQuery) => {
  it('401s with no session, and reads nothing', async () => {
    sessionMock.getSession.mockResolvedValue(null);

    const res = await handler(req(`?customerId=${VICTIM}`));

    expect(res.status).toBe(401);
    expect(getQuery()).not.toHaveBeenCalled();
  });

  it("refuses to return another customer's orders when their id is supplied", async () => {
    const res = await handler(req(`?customerId=${VICTIM}`));

    expect(res.status).toBe(403);
    expect(getQuery()).not.toHaveBeenCalled();
  });

  it('serves the session customer when no param is sent', async () => {
    const res = await handler(req());

    expect(res.status).toBe(200);
    const call = getQuery().mock.calls[0][0];
    // v2 passes the id directly; v1 passes a Prisma arg object.
    const used = typeof call === 'string' ? call : call.where.hostCustomerId;
    expect(used).toBe(ME);
  });

  it('serves the session customer when their own id is sent', async () => {
    const res = await handler(req(`?customerId=${ME}`));

    expect(res.status).toBe(200);
    const call = getQuery().mock.calls[0][0];
    const used = typeof call === 'string' ? call : call.where.hostCustomerId;
    expect(used).toBe(ME);
  });
});
