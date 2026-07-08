import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeliveryDetailsModal from '../DeliveryDetailsModal';
import type { SubOrderFull } from '@/lib/group-orders-v2/types';

const mocks = vi.hoisted(() => ({
  updateTabV2: vi.fn(),
}));

vi.mock('@/lib/group-orders-v2/api-client', () => ({
  updateTabV2: mocks.updateTabV2,
}));

// Fake STR registry so the test controls the roster (the real Five Star
// config ships with an empty roster until the partner sends their list).
vi.mock('@/lib/partners/str-partners', () => ({
  getStrPartnerByCode: (code: string | null | undefined) =>
    code === 'TESTCO'
      ? {
          code: 'TESTCO',
          slug: 'test-co',
          name: 'Test Rentals',
          deliveryContextType: 'HOUSE',
          allowCustomAddress: true,
          properties: [
            {
              id: 'prop-1',
              label: 'Lakeside Villa — 4BR',
              address1: '77 Lakeside Dr',
              city: 'Austin',
              province: 'TX',
              zip: '78732',
            },
          ],
        }
      : null,
}));

function mkTab(overrides: Partial<SubOrderFull> = {}): SubOrderFull {
  return {
    id: 'tab-1',
    name: 'Rental Delivery',
    position: 0,
    status: 'OPEN',
    orderType: null,
    partyType: null,
    deliveryContextType: 'HOUSE',
    deliveryDate: 'TBD',
    deliveryDateConfirmed: false,
    deliveryTime: 'TBD',
    deliveryAddress: { address1: '', city: '', province: 'TX', zip: '', country: 'US' },
    deliveryPhone: null,
    deliveryNotes: null,
    orderDeadline: '',
    deliveryFee: 20,
    deliveryFeeWaived: false,
    draftItems: [],
    purchasedItems: [],
    deliveryInvoice: null,
    totals: { draftSubtotal: 0, purchasedSubtotal: 0, deliveryFee: 20 },
    ...overrides,
  };
}

const baseProps = {
  shareCode: 'ABC123',
  participantId: 'p-1',
  onClose: vi.fn(),
  onSaved: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DeliveryDetailsModal — STR property dropdown', () => {
  it('shows the partner property dropdown when the group affiliate is an STR partner', () => {
    render(<DeliveryDetailsModal {...baseProps} tab={mkTab()} affiliateCode="TESTCO" />);
    expect(screen.getByLabelText(/choose your test rentals rental/i)).toBeInTheDocument();
    expect(screen.getByText('Lakeside Villa — 4BR')).toBeInTheDocument();
    expect(screen.getByText(/my place isn't listed/i)).toBeInTheDocument();
  });

  it('pre-fills the address fields when a property is selected', () => {
    render(<DeliveryDetailsModal {...baseProps} tab={mkTab()} affiliateCode="TESTCO" />);
    fireEvent.change(screen.getByLabelText(/choose your test rentals rental/i), {
      target: { value: 'prop-1' },
    });
    expect(screen.getByPlaceholderText('Street address')).toHaveValue('77 Lakeside Dr');
    expect(screen.getByPlaceholderText('Austin')).toHaveValue('Austin');
    expect(screen.getByPlaceholderText('78701')).toHaveValue('78732');
  });

  it('clears the fields for manual entry when "my place isn\'t listed" is chosen', () => {
    render(<DeliveryDetailsModal {...baseProps} tab={mkTab()} affiliateCode="TESTCO" />);
    const select = screen.getByLabelText(/choose your test rentals rental/i);
    fireEvent.change(select, { target: { value: 'prop-1' } });
    fireEvent.change(select, { target: { value: '__custom__' } });
    expect(screen.getByPlaceholderText('Street address')).toHaveValue('');
    expect(screen.getByPlaceholderText('Street address')).not.toHaveAttribute('readonly');
  });

  it('preselects the matching property when the tab already has that address', () => {
    const tab = mkTab({
      deliveryAddress: {
        address1: '77 Lakeside Dr',
        city: 'Austin',
        province: 'TX',
        zip: '78732',
        country: 'US',
      },
    });
    render(<DeliveryDetailsModal {...baseProps} tab={tab} affiliateCode="TESTCO" />);
    expect(screen.getByLabelText(/choose your test rentals rental/i)).toHaveValue('prop-1');
  });

  it('renders the plain address form when the group has no STR affiliate', () => {
    render(<DeliveryDetailsModal {...baseProps} tab={mkTab()} affiliateCode="MISCHIEF" />);
    expect(screen.queryByLabelText(/rental$/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Street address')).toBeInTheDocument();
  });
});
