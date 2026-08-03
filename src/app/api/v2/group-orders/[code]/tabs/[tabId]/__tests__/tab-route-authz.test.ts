/**
 * Cross-group authorization on the tab route.
 *
 * The route resolves the group from the share code and checks participation
 * in THAT group — but used to act on [tabId] directly. Since joining a group
 * needs only its share code, that let any participant edit (or, as host of
 * their own group, DELETE) a tab belonging to a different group by id —
 * including rewriting its delivery date, defeating the date gate.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const serviceMock = vi.hoisted(() => ({
  getGroupOrderByCode: vi.fn(),
  updateTab: vi.fn(),
  deleteTab: vi.fn(),
  isParticipantHost: vi.fn(),
  isActiveParticipant: vi.fn(),
}));

vi.mock('@/lib/group-orders-v2/service', () => serviceMock);

import { PATCH, DELETE } from '../route';

const OWN_TAB = 'tab-in-this-group';
const FOREIGN_TAB = 'tab-in-someone-elses-group';

function group() {
  return {
    id: 'group-1',
    shareCode: 'ABC123',
    tabs: [{ id: OWN_TAB, name: 'Boat Order', status: 'OPEN' }],
  };
}

function patchRequest(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/v2/group-orders/ABC123/tabs/x', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function deleteRequest(hostParticipantId: string): NextRequest {
  const url = `http://localhost/api/v2/group-orders/ABC123/tabs/x?hostParticipantId=${hostParticipantId}`;
  const req = new Request(url, { method: 'DELETE' }) as unknown as NextRequest;
  // Route reads request.nextUrl.searchParams
  Object.defineProperty(req, 'nextUrl', { value: new URL(url), configurable: true });
  return req;
}

const params = (tabId: string) => ({ params: Promise.resolve({ code: 'ABC123', tabId }) });

beforeEach(() => {
  vi.clearAllMocks();
  serviceMock.getGroupOrderByCode.mockResolvedValue(group());
  serviceMock.isActiveParticipant.mockResolvedValue(true);
  serviceMock.isParticipantHost.mockResolvedValue(true);
  serviceMock.updateTab.mockResolvedValue({ id: OWN_TAB, name: 'Boat Order' });
  serviceMock.deleteTab.mockResolvedValue(undefined);
});

describe('PATCH tab — cross-group scoping', () => {
  it("404s and writes nothing when the tab belongs to a different group", async () => {
    const res = await PATCH(
      patchRequest({ participantId: 'p1', deliveryDate: '2030-01-15' }),
      params(FOREIGN_TAB)
    );

    expect(res.status).toBe(404);
    expect(serviceMock.updateTab).not.toHaveBeenCalled();
  });

  it('still allows editing a tab that belongs to this group', async () => {
    const res = await PATCH(
      patchRequest({ participantId: 'p1', deliveryDate: '2030-01-15' }),
      params(OWN_TAB)
    );

    expect(res.status).toBe(200);
    expect(serviceMock.updateTab).toHaveBeenCalledOnce();
    expect(serviceMock.updateTab.mock.calls[0][0]).toBe(OWN_TAB);
  });

  it('scopes the tab before the host check, so a foreign lock/unlock also 404s', async () => {
    const res = await PATCH(
      patchRequest({ participantId: 'p1', status: 'OPEN' }),
      params(FOREIGN_TAB)
    );

    expect(res.status).toBe(404);
    expect(serviceMock.updateTab).not.toHaveBeenCalled();
  });
});

describe('DELETE tab — cross-group scoping', () => {
  it("404s and deletes nothing when the tab belongs to a different group, even for a real host", async () => {
    const res = await DELETE(deleteRequest('host-1'), params(FOREIGN_TAB));

    expect(res.status).toBe(404);
    expect(serviceMock.deleteTab).not.toHaveBeenCalled();
  });

  it('still allows the host to delete a tab in their own group', async () => {
    const res = await DELETE(deleteRequest('host-1'), params(OWN_TAB));

    expect(res.status).toBe(200);
    expect(serviceMock.deleteTab).toHaveBeenCalledWith(OWN_TAB);
  });
});
