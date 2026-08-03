/**
 * Destructive actions refuse to take money records with them.
 *
 * These guards are deliberately identity-independent. Group dashboards
 * authorize on a participant id that the public GET hands to anyone with the
 * share code, so "was this really the host?" cannot currently be answered with
 * confidence. Rather than rely on that answer, the blast radius is removed:
 * whoever calls, an irreversible action over money is refused.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSubOrderFindUnique = vi.fn();
const mockSubOrderDelete = vi.fn();
const mockPaymentFindFirst = vi.fn();
const mockGroupFindUnique = vi.fn();
const mockGroupUpdate = vi.fn();
const mockDraftDeleteMany = vi.fn();
const mockParticipantUpdateMany = vi.fn();

vi.mock('@/lib/database/client', () => ({
  prisma: {
    subOrder: {
      findUnique: (...a: unknown[]) => mockSubOrderFindUnique(...a),
      delete: (...a: unknown[]) => mockSubOrderDelete(...a),
    },
    participantPayment: { findFirst: (...a: unknown[]) => mockPaymentFindFirst(...a) },
    groupOrderV2: {
      findUnique: (...a: unknown[]) => mockGroupFindUnique(...a),
      update: (...a: unknown[]) => mockGroupUpdate(...a),
    },
    draftCartItem: { deleteMany: (...a: unknown[]) => mockDraftDeleteMany(...a) },
    groupParticipantV2: { updateMany: (...a: unknown[]) => mockParticipantUpdateMany(...a) },
  },
}));

import { deleteTab, cancelGroupOrder, removeParticipant, TabHasMoneyError } from '../service';

const CLEAN_TAB = {
  _count: { purchasedItems: 0 },
  payments: [],
  deliveryInvoice: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSubOrderFindUnique.mockResolvedValue(CLEAN_TAB);
  mockSubOrderDelete.mockResolvedValue({});
  mockPaymentFindFirst.mockResolvedValue(null);
  mockGroupFindUnique.mockResolvedValue({ id: 'g1', participants: [{ id: 'host-1' }] });
  mockGroupUpdate.mockResolvedValue({});
  mockDraftDeleteMany.mockResolvedValue({ count: 0 });
  mockParticipantUpdateMany.mockResolvedValue({ count: 1 });
});

describe('deleteTab', () => {
  it('deletes a tab that has no money attached', async () => {
    await deleteTab('tab-1');
    expect(mockSubOrderDelete).toHaveBeenCalledWith({ where: { id: 'tab-1' } });
  });

  it('refuses when the tab holds purchased items', async () => {
    mockSubOrderFindUnique.mockResolvedValue({ ...CLEAN_TAB, _count: { purchasedItems: 3 } });

    await expect(deleteTab('tab-1')).rejects.toBeInstanceOf(TabHasMoneyError);
    expect(mockSubOrderDelete).not.toHaveBeenCalled();
  });

  it('refuses when a payment is PAID — the cascade would erase the record of a real charge', async () => {
    mockSubOrderFindUnique.mockResolvedValue({ ...CLEAN_TAB, payments: [{ id: 'pay-1' }] });

    await expect(deleteTab('tab-1')).rejects.toBeInstanceOf(TabHasMoneyError);
    expect(mockSubOrderDelete).not.toHaveBeenCalled();
  });

  it('refuses when a paid delivery invoice exists', async () => {
    mockSubOrderFindUnique.mockResolvedValue({
      ...CLEAN_TAB,
      deliveryInvoice: { status: 'PAID' },
    });

    await expect(deleteTab('tab-1')).rejects.toBeInstanceOf(TabHasMoneyError);
    expect(mockSubOrderDelete).not.toHaveBeenCalled();
  });

  it('queries PENDING as well as PAID — a pending session still needs this tab', async () => {
    await deleteTab('tab-1');
    const where = mockSubOrderFindUnique.mock.calls[0][0].select.payments.where;
    expect(where.status.in).toEqual(expect.arrayContaining(['PAID', 'PENDING']));
  });
});

describe('cancelGroupOrder', () => {
  it('cancels an order with no payments', async () => {
    await cancelGroupOrder('ABC123', 'host-1');
    expect(mockGroupUpdate).toHaveBeenCalled();
  });

  it('refuses once any payment is PAID (cancelling blocks checkout on every tab)', async () => {
    mockPaymentFindFirst.mockResolvedValue({ id: 'pay-1' });

    await expect(cancelGroupOrder('ABC123', 'host-1')).rejects.toThrow('HAS_PAID_PAYMENT');
    expect(mockGroupUpdate).not.toHaveBeenCalled();
  });
});

describe('removeParticipant', () => {
  it('removes a participant who has not paid', async () => {
    await removeParticipant('g1', 'p9');
    expect(mockParticipantUpdateMany).toHaveBeenCalled();
  });

  it('refuses to evict someone who has already paid', async () => {
    mockPaymentFindFirst.mockResolvedValue({ id: 'pay-1' });

    await expect(removeParticipant('g1', 'p9')).rejects.toThrow('HAS_PAID_PAYMENT');
    expect(mockDraftDeleteMany).not.toHaveBeenCalled();
    expect(mockParticipantUpdateMany).not.toHaveBeenCalled();
  });
});
