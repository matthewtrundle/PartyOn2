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
const mockSubOrderDeleteMany = vi.fn();
const mockPaymentFindFirst = vi.fn();
const mockGroupFindUnique = vi.fn();
const mockGroupUpdate = vi.fn();
const mockDraftDeleteMany = vi.fn();
const mockParticipantUpdateMany = vi.fn();

vi.mock('@/lib/database/client', () => ({
  prisma: {
    subOrder: {
      findUnique: (...a: unknown[]) => mockSubOrderFindUnique(...a),
      deleteMany: (...a: unknown[]) => mockSubOrderDeleteMany(...a),
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

const HOUR = 60 * 60 * 1000;

interface FakePayment {
  status: string;
  createdAt: Date;
}
interface PaymentNone {
  OR: Array<{ status: string; createdAt?: { gt: Date } }>;
}
interface DeleteWhere {
  id: string;
  purchasedItems: { none: Record<string, never> };
  payments: { none: PaymentNone };
  OR: Array<Record<string, unknown>>;
}

function tabWith(
  { purchased = 0, payments = [], invoice = null }: {
    purchased?: number;
    payments?: FakePayment[];
    invoice?: { status: string } | null;
  } = {}
) {
  return { purchased, payments, invoice };
}

let currentTab: ReturnType<typeof tabWith> | null = tabWith();

function paymentMatches(none: PaymentNone, pay: FakePayment): boolean {
  return none.OR.some((clause) => {
    if (clause.status !== pay.status) return false;
    if (clause.createdAt?.gt) return pay.createdAt > clause.createdAt.gt;
    return true;
  });
}

/**
 * The money test lives inside the DELETE's where-clause — it has to, because
 * checkout writes its PENDING payment row just after opening the Stripe
 * session, so a check-then-delete could cascade away a live session's row.
 * This mimics Postgres applying that predicate, so the tests exercise the real
 * query rather than a canned answer.
 */
function simulateDeleteMany(where: DeleteWhere): { count: number } {
  if (!currentTab) return { count: 0 };
  if (currentTab.purchased > 0) return { count: 0 };
  if (currentTab.payments.some((pay) => paymentMatches(where.payments.none, pay))) {
    return { count: 0 };
  }
  if (currentTab.invoice?.status === 'PAID') return { count: 0 };
  return { count: 1 };
}

beforeEach(() => {
  vi.clearAllMocks();
  currentTab = tabWith();
  mockSubOrderFindUnique.mockImplementation(() =>
    Promise.resolve(currentTab ? { id: 'tab-1' } : null)
  );
  mockSubOrderDeleteMany.mockImplementation((args: { where: DeleteWhere }) =>
    Promise.resolve(simulateDeleteMany(args.where))
  );
  mockPaymentFindFirst.mockResolvedValue(null);
  mockGroupFindUnique.mockResolvedValue({ id: 'g1', participants: [{ id: 'host-1' }] });
  mockGroupUpdate.mockResolvedValue({});
  mockDraftDeleteMany.mockResolvedValue({ count: 0 });
  mockParticipantUpdateMany.mockResolvedValue({ count: 1 });
});

describe('deleteTab', () => {
  it('deletes a tab that has no money attached', async () => {
    await deleteTab('tab-1');

    expect(mockSubOrderDeleteMany).toHaveBeenCalledOnce();
    expect(mockSubOrderDeleteMany.mock.calls[0][0].where.id).toBe('tab-1');
  });

  it('reports not-found for a tab that does not exist', async () => {
    currentTab = null;
    await expect(deleteTab('nope')).rejects.toThrow(/not found/i);
  });

  it('refuses when the tab holds purchased items', async () => {
    currentTab = tabWith({ purchased: 3 });
    await expect(deleteTab('tab-1')).rejects.toBeInstanceOf(TabHasMoneyError);
  });

  it('refuses on a PAID payment however old — the cascade would erase a real charge', async () => {
    currentTab = tabWith({
      payments: [{ status: 'PAID', createdAt: new Date(Date.now() - 200 * 24 * HOUR) }],
    });
    await expect(deleteTab('tab-1')).rejects.toBeInstanceOf(TabHasMoneyError);
  });

  it('refuses on a RECENT pending payment — that Stripe session may still complete', async () => {
    currentTab = tabWith({
      payments: [{ status: 'PENDING', createdAt: new Date(Date.now() - 1 * HOUR) }],
    });
    await expect(deleteTab('tab-1')).rejects.toBeInstanceOf(TabHasMoneyError);
  });

  // Nothing ever moves a v2 payment out of PENDING, so without an age bound an
  // abandoned checkout would weld the tab in place forever (~50 tabs in prod).
  it('ALLOWS deletion when the only pending payment is an abandoned old one', async () => {
    currentTab = tabWith({
      payments: [{ status: 'PENDING', createdAt: new Date(Date.now() - 30 * 24 * HOUR) }],
    });

    await deleteTab('tab-1');
    expect(mockSubOrderDeleteMany).toHaveBeenCalledOnce();
  });

  it('refuses when a paid delivery invoice exists', async () => {
    currentTab = tabWith({ invoice: { status: 'PAID' } });
    await expect(deleteTab('tab-1')).rejects.toBeInstanceOf(TabHasMoneyError);
  });

  // The reason the predicate moved into the delete: if a payment row appears
  // between the existence check and the delete, the delete must match nothing
  // rather than cascade it away.
  it('refuses when the row stops qualifying mid-flight (the TOCTOU case)', async () => {
    mockSubOrderDeleteMany.mockResolvedValueOnce({ count: 0 });

    await expect(deleteTab('tab-1')).rejects.toBeInstanceOf(TabHasMoneyError);
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
