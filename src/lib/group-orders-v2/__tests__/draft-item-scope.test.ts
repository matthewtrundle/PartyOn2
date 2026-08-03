/**
 * Service-layer scoping for draft-item mutations.
 *
 * The route handlers 404 a foreign tab before calling these, but the scoped
 * where-clause here is the second line of defence — a refactor that touches
 * only the service would otherwise silently reopen the cross-group hole with
 * no test failing. These assert the query itself, not the handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockDeleteMany = vi.fn();
const mockParticipantUpdateMany = vi.fn();
const mockPaymentFindFirst = vi.fn();

vi.mock('@/lib/database/client', () => ({
  prisma: {
    draftCartItem: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
      delete: (...a: unknown[]) => mockDelete(...a),
      deleteMany: (...a: unknown[]) => mockDeleteMany(...a),
    },
    groupParticipantV2: {
      updateMany: (...a: unknown[]) => mockParticipantUpdateMany(...a),
    },
    participantPayment: {
      findFirst: (...a: unknown[]) => mockPaymentFindFirst(...a),
    },
  },
}));

import { updateDraftItem, removeDraftItem, removeParticipant } from '../service';

const SCOPE = { groupOrderId: 'group-1', subOrderId: 'tab-1' };

const OPEN_ITEM = {
  id: 'item-1',
  addedByParticipantId: 'p1',
  subOrder: { status: 'OPEN' },
  addedBy: { id: 'p1', guestName: 'Guest', isHost: false },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFindFirst.mockResolvedValue(OPEN_ITEM);
  mockUpdate.mockResolvedValue({
    ...OPEN_ITEM,
    quantity: 3,
    productId: 'prod-1',
    variantId: 'var-1',
    title: 'Beer',
    variantTitle: null,
    price: 10,
    imageUrl: null,
    product: { handle: 'beer' },
    variant: null,
  });
  mockDelete.mockResolvedValue({});
  mockDeleteMany.mockResolvedValue({ count: 0 });
  mockParticipantUpdateMany.mockResolvedValue({ count: 1 });
  mockPaymentFindFirst.mockResolvedValue(null); // no paid payment blocking removal
});

describe('updateDraftItem scoping', () => {
  it('looks the item up scoped to BOTH the group and the tab', async () => {
    await updateDraftItem('item-1', 'p1', 3, false, SCOPE);

    expect(mockFindFirst).toHaveBeenCalledOnce();
    expect(mockFindFirst.mock.calls[0][0].where).toEqual({
      id: 'item-1',
      subOrderId: 'tab-1',
      subOrder: { groupOrderId: 'group-1' },
    });
  });

  it('throws (and writes nothing) when the scoped lookup finds no item', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(updateDraftItem('foreign-item', 'p1', 99, true, SCOPE)).rejects.toThrow(/not found/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('removeDraftItem scoping', () => {
  it('looks the item up scoped to BOTH the group and the tab', async () => {
    await removeDraftItem('item-1', 'p1', false, SCOPE);

    expect(mockFindFirst.mock.calls[0][0].where).toEqual({
      id: 'item-1',
      subOrderId: 'tab-1',
      subOrder: { groupOrderId: 'group-1' },
    });
  });

  it('throws (and deletes nothing) when the scoped lookup finds no item', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(removeDraftItem('foreign-item', 'p1', true, SCOPE)).rejects.toThrow(/not found/i);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe('removeParticipant scoping', () => {
  it('confines both writes to the given group', async () => {
    await removeParticipant('group-1', 'p9');

    // Drafts: only this group's tabs, not every group the person belongs to.
    expect(mockDeleteMany.mock.calls[0][0].where).toEqual({
      addedByParticipantId: 'p9',
      subOrder: { groupOrderId: 'group-1' },
    });
    // Status flip: scoped by group, and updateMany so a foreign id is a no-op.
    expect(mockParticipantUpdateMany.mock.calls[0][0].where).toEqual({
      id: 'p9',
      groupOrderId: 'group-1',
    });
  });
});
