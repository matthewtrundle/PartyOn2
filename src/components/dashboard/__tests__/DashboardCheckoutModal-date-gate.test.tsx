/**
 * Checkout modal delivery-date gate (wrong-date fix 2026-08-01).
 *
 * Partner-seeded dashboards have an address from birth, which used to satisfy
 * the modal's only completeness check — customers paid without ever seeing a
 * date. The modal must now demand a confirmed date (banner + disabled submit)
 * and route the server's DELIVERY_DATE_REQUIRED straight into the date picker.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { SubOrderFull, DraftCartItemView } from '@/lib/group-orders-v2/types';

const mocks = vi.hoisted(() => ({
  checkoutParticipantV2: vi.fn(),
  checkoutAllV2: vi.fn(),
  validateGroupDiscount: vi.fn(),
}));

vi.mock('@/lib/group-orders-v2/api-client', () => {
  class GroupOrdersApiError extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.name = 'GroupOrdersApiError';
      this.code = code;
    }
  }
  return {
    checkoutParticipantV2: mocks.checkoutParticipantV2,
    checkoutAllV2: mocks.checkoutAllV2,
    validateGroupDiscount: mocks.validateGroupDiscount,
    GroupOrdersApiError,
  };
});

vi.mock('@/components/consent/SmsConsentCheckbox', () => ({
  default: () => <div data-testid="sms-consent-stub" />,
}));

import DashboardCheckoutModal from '../DashboardCheckoutModal';
import { GroupOrdersApiError } from '@/lib/group-orders-v2/api-client';

function mkTab(overrides: Partial<SubOrderFull> = {}): SubOrderFull {
  return {
    id: 'tab-1',
    name: 'Boat Order',
    position: 0,
    status: 'OPEN',
    orderType: null,
    partyType: null,
    deliveryContextType: 'BOAT',
    deliveryDate: null,
    deliveryDateConfirmed: false,
    deliveryTime: 'TBD',
    // Partner-seeded marina address — the exact shape that used to slip past
    deliveryAddress: { address1: '16405 Clara Van St Ste B', city: 'Austin', province: 'TX', zip: '78734', country: 'US' },
    deliveryPhone: null,
    deliveryNotes: null,
    orderDeadline: null,
    deliveryFee: 0,
    deliveryFeeWaived: true,
    draftItems: [],
    purchasedItems: [],
    deliveryInvoice: null,
    totals: { draftSubtotal: 0, purchasedSubtotal: 0, deliveryFee: 0 },
    ...overrides,
  };
}

const ITEMS: DraftCartItemView[] = [
  {
    id: 'd1',
    productId: 'p1',
    variantId: 'v1',
    handle: 'beer',
    title: 'Beer',
    variantTitle: null,
    price: 25,
    compareAtPrice: null,
    imageUrl: null,
    quantity: 1,
    addedBy: { id: 'part-1', name: 'Guest', isHost: false },
  },
];

function renderModal(tab: SubOrderFull, extra: Partial<Parameters<typeof DashboardCheckoutModal>[0]> = {}) {
  const onClose = vi.fn();
  const onOpenDeliveryDetails = vi.fn();
  render(
    <DashboardCheckoutModal
      shareCode="ABC123"
      tab={tab}
      participantId="part-1"
      mode="mine"
      items={ITEMS}
      participantEmail="guest@example.com"
      onClose={onClose}
      onOpenDeliveryDetails={onOpenDeliveryDetails}
      {...extra}
    />
  );
  return { onClose, onOpenDeliveryDetails };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DashboardCheckoutModal — delivery-date gate', () => {
  it('with an address but no confirmed date: shows the date banner and disables submit', () => {
    renderModal(mkTab());

    expect(screen.getByText(/please add your delivery date before checking out/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add delivery date/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeDisabled();
  });

  it('the banner button closes the modal and opens the date picker', () => {
    const { onClose, onOpenDeliveryDetails } = renderModal(mkTab());

    fireEvent.click(screen.getByRole('button', { name: /add delivery date/i }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenDeliveryDetails).toHaveBeenCalledOnce();
  });

  it('an unconfirmed placeholder date (legacy fake +7d row) is treated as missing', () => {
    renderModal(mkTab({ deliveryDate: '2026-08-08T12:00:00.000Z', deliveryDateConfirmed: false }));

    expect(screen.getByText(/please add your delivery date before checking out/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeDisabled();
  });

  it('with a confirmed date: no banner, and submit enables after the 21+ acknowledgement', () => {
    renderModal(mkTab({ deliveryDate: '2026-08-22T12:00:00.000Z', deliveryDateConfirmed: true, deliveryTime: '12:00 PM - 2:00 PM' }));

    expect(screen.queryByText(/please add your delivery date/i)).not.toBeInTheDocument();

    const submit = screen.getByRole('button', { name: /continue to payment/i });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /21\+/i }));
    expect(submit).toBeEnabled();
  });

  it('routes the server DELIVERY_DATE_REQUIRED error into the date picker (stale-client fallback)', async () => {
    mocks.checkoutParticipantV2.mockRejectedValue(
      new GroupOrdersApiError('Please add your delivery date before checking out.', 'DELIVERY_DATE_REQUIRED')
    );
    const { onClose, onOpenDeliveryDetails } = renderModal(
      mkTab({ deliveryDate: '2026-08-22T12:00:00.000Z', deliveryDateConfirmed: true, deliveryTime: '12:00 PM - 2:00 PM' })
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /21\+/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce();
      expect(onOpenDeliveryDetails).toHaveBeenCalledOnce();
    });
  });
});
