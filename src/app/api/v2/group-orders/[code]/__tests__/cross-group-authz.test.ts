/**
 * Cross-group authorization on the draft-item and participant routes.
 *
 * Same bug class as the tab route: the handler proves you belong to the group
 * named in the URL, then acts on a resource id that was never checked against
 * that group. Because anyone can create a dashboard (unauthenticated) and is
 * host of it, "host of my own group" was enough to reach into a stranger's.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const serviceMock = vi.hoisted(() => ({
  getGroupOrderByCode: vi.fn(),
  updateDraftItem: vi.fn(),
  removeDraftItem: vi.fn(),
  removeParticipant: vi.fn(),
  addDraftItem: vi.fn(),
  isParticipantHost: vi.fn(),
  isActiveParticipant: vi.fn(),
  updateParticipant: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  groupParticipantV2: { updateMany: vi.fn(), update: vi.fn() },
}));

vi.mock('@/lib/group-orders-v2/service', () => serviceMock);
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import {
  PATCH as itemPatch,
  DELETE as itemDelete,
} from '../tabs/[tabId]/items/[itemId]/route';
import { DELETE as participantDelete } from '../participants/[pid]/route';
import { POST as addItem } from '../tabs/[tabId]/items/route';

const OWN_TAB = 'tab-own';
const FOREIGN_TAB = 'tab-foreign';
const OWN_PID = 'participant-own';
const FOREIGN_PID = 'participant-foreign';

function group() {
  return {
    id: 'group-1',
    shareCode: 'ABC123',
    tabs: [{ id: OWN_TAB, name: 'Boat Order', status: 'OPEN' }],
    participants: [{ id: OWN_PID, name: 'Guest', isHost: false }],
  };
}

function jsonRequest(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/x', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function queryRequest(qs: string): NextRequest {
  const url = `http://localhost/x?${qs}`;
  const req = new Request(url, { method: 'DELETE' }) as unknown as NextRequest;
  Object.defineProperty(req, 'nextUrl', { value: new URL(url), configurable: true });
  return req;
}

const itemParams = (tabId: string) => ({
  params: Promise.resolve({ code: 'ABC123', tabId, itemId: 'item-1' }),
});
const pidParams = (pid: string) => ({ params: Promise.resolve({ code: 'ABC123', pid }) });

beforeEach(() => {
  vi.clearAllMocks();
  serviceMock.getGroupOrderByCode.mockResolvedValue(group());
  serviceMock.isParticipantHost.mockResolvedValue(true);
  serviceMock.isActiveParticipant.mockResolvedValue(true);
  serviceMock.updateDraftItem.mockResolvedValue({ id: 'item-1', quantity: 2 });
  serviceMock.removeDraftItem.mockResolvedValue(undefined);
  serviceMock.removeParticipant.mockResolvedValue(undefined);
});

describe('draft item routes — tab must belong to the group', () => {
  it('PATCH 404s for a tab in another group and never touches the item', async () => {
    const res = await itemPatch(
      jsonRequest({ participantId: 'p1', quantity: 99 }),
      itemParams(FOREIGN_TAB)
    );

    expect(res.status).toBe(404);
    expect(serviceMock.updateDraftItem).not.toHaveBeenCalled();
  });

  it('DELETE 404s for a tab in another group and never removes the item', async () => {
    const res = await itemDelete(queryRequest('participantId=p1'), itemParams(FOREIGN_TAB));

    expect(res.status).toBe(404);
    expect(serviceMock.removeDraftItem).not.toHaveBeenCalled();
  });

  it('PATCH passes the group+tab scope through so the service can re-check it', async () => {
    const res = await itemPatch(
      jsonRequest({ participantId: 'p1', quantity: 2 }),
      itemParams(OWN_TAB)
    );

    expect(res.status).toBe(200);
    const [itemId, participantId, quantity, isHost, scope] =
      serviceMock.updateDraftItem.mock.calls[0];
    expect(itemId).toBe('item-1');
    expect(participantId).toBe('p1');
    expect(quantity).toBe(2);
    expect(isHost).toBe(true);
    expect(scope).toEqual({ groupOrderId: 'group-1', subOrderId: OWN_TAB });
  });

  it('DELETE passes the group+tab scope through', async () => {
    const res = await itemDelete(queryRequest('participantId=p1'), itemParams(OWN_TAB));

    expect(res.status).toBe(200);
    expect(serviceMock.removeDraftItem.mock.calls[0][3]).toEqual({
      groupOrderId: 'group-1',
      subOrderId: OWN_TAB,
    });
  });
});

describe('add-item host auto-promotion — privilege escalation guard', () => {
  const HOSTLESS = {
    id: 'group-hostless',
    shareCode: 'HOSTLESS',
    // No participant here is a host — this is the state every webhook-created
    // dashboard starts in (324 such groups existed in production).
    participants: [{ id: 'someone-else', isHost: false }],
    tabs: [{ id: 'tab-hostless', name: 'Marina Delivery', status: 'OPEN' }],
  };

  const itemBody = {
    participantId: FOREIGN_PID,
    productId: 'p1',
    variantId: 'v1',
    title: 'Beer',
    price: 10,
    quantity: 1,
  };

  beforeEach(() => {
    serviceMock.getGroupOrderByCode.mockResolvedValue(HOSTLESS);
    serviceMock.addDraftItem.mockResolvedValue({ id: 'item-new' });
    prismaMock.groupParticipantV2.updateMany.mockResolvedValue({ count: 1 });
  });

  it('does NOT promote a participant who belongs to a different group', async () => {
    const res = await addItem(jsonRequest(itemBody) as never, {
      params: Promise.resolve({ code: 'HOSTLESS', tabId: 'tab-hostless' }),
    } as never);

    expect(res.status).toBe(201);
    // The item may be added, but no host promotion may occur — being promoted
    // to host grants tab deletion, which cascades payments.
    expect(prismaMock.groupParticipantV2.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.groupParticipantV2.update).not.toHaveBeenCalled();
  });

  it('still promotes a real member of the hostless group, scoped by group id', async () => {
    const res = await addItem(
      jsonRequest({ ...itemBody, participantId: 'someone-else' }) as never,
      { params: Promise.resolve({ code: 'HOSTLESS', tabId: 'tab-hostless' }) } as never
    );

    expect(res.status).toBe(201);
    expect(prismaMock.groupParticipantV2.updateMany).toHaveBeenCalledWith({
      where: { id: 'someone-else', groupOrderId: 'group-hostless' },
      data: { isHost: true },
    });
  });
});

describe('participant removal — participant must belong to the group', () => {
  it("404s when removing a participant who isn't in this group", async () => {
    const res = await participantDelete(
      queryRequest('hostParticipantId=host-1'),
      pidParams(FOREIGN_PID)
    );

    expect(res.status).toBe(404);
    expect(serviceMock.removeParticipant).not.toHaveBeenCalled();
  });

  it('still lets the host remove a participant in their own group', async () => {
    const res = await participantDelete(
      queryRequest('hostParticipantId=host-1'),
      pidParams(OWN_PID)
    );

    expect(res.status).toBe(200);
    expect(serviceMock.removeParticipant).toHaveBeenCalledWith('group-1', OWN_PID);
  });
});
