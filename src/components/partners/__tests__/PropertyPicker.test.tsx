import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PropertyPicker from '../PropertyPicker';
import type { StrPartnerConfig } from '@/lib/partners/str-partners';

// Capture router.push + mock the dashboard-create API and attribution helper.
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  createDashboardOrderV2: vi.fn(),
  getAttributionForDashboard: vi.fn(() => undefined),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock('@/lib/group-orders-v2/api-client', () => ({
  createDashboardOrderV2: mocks.createDashboardOrderV2,
}));
vi.mock('@/lib/analytics/attribution', () => ({
  getAttributionForDashboard: mocks.getAttributionForDashboard,
}));

const config: StrPartnerConfig = {
  code: 'TESTCO',
  slug: 'test-co',
  name: 'Test Rentals',
  deliveryContextType: 'HOUSE',
  allowCustomAddress: true,
  properties: [
    { id: 'prop-1', label: 'Prop One', address1: '10 A St', city: 'Austin', province: 'TX', zip: '78701' },
  ],
};

function mkGroup(shareCode: string) {
  return { shareCode, participants: [{ id: 'host-1', isHost: true }] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PropertyPicker', () => {
  it('renders the property dropdown + the custom-address option', () => {
    render(<PropertyPicker config={config} affiliateId="aff-1" />);
    expect(screen.getByText('Prop One')).toBeInTheDocument();
    expect(screen.getByText(/my place isn't listed/i)).toBeInTheDocument();
  });

  it('creates a dashboard pre-filled with the selected property address + partner attribution', async () => {
    mocks.createDashboardOrderV2.mockResolvedValue(mkGroup('CODE9'));
    render(<PropertyPicker config={config} affiliateId="aff-123" />);

    fireEvent.change(screen.getByLabelText('Choose your rental'), { target: { value: 'prop-1' } });
    fireEvent.click(screen.getByRole('button', { name: /start your order/i }));

    await waitFor(() => expect(mocks.createDashboardOrderV2).toHaveBeenCalledTimes(1));
    expect(mocks.createDashboardOrderV2).toHaveBeenCalledWith(
      expect.objectContaining({
        affiliateId: 'aff-123',
        source: 'PARTNER_PAGE',
        deliveryContextType: 'HOUSE',
        tabName: 'Prop One',
        deliveryAddress: expect.objectContaining({
          address1: '10 A St',
          city: 'Austin',
          province: 'TX',
          zip: '78701',
          country: 'US',
        }),
      })
    );
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/dashboard/CODE9'));
  });

  it('supports a custom address when the unit is not listed', async () => {
    mocks.createDashboardOrderV2.mockResolvedValue(mkGroup('C2'));
    render(<PropertyPicker config={config} affiliateId="aff-1" />);

    fireEvent.change(screen.getByLabelText('Choose your rental'), { target: { value: '__custom__' } });
    fireEvent.change(screen.getByLabelText('Rental street address'), { target: { value: '99 Custom Ln' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Austin' } });
    fireEvent.change(screen.getByLabelText('ZIP code'), { target: { value: '78704' } });
    fireEvent.click(screen.getByRole('button', { name: /start your order/i }));

    await waitFor(() => expect(mocks.createDashboardOrderV2).toHaveBeenCalledTimes(1));
    expect(mocks.createDashboardOrderV2).toHaveBeenCalledWith(
      expect.objectContaining({
        tabName: 'Rental Delivery',
        deliveryAddress: expect.objectContaining({
          address1: '99 Custom Ln',
          city: 'Austin',
          province: 'TX',
          zip: '78704',
          country: 'US',
        }),
      })
    );
  });

  it('blocks submission and shows an error when the custom address is incomplete', () => {
    render(<PropertyPicker config={config} affiliateId="aff-1" />);
    fireEvent.change(screen.getByLabelText('Choose your rental'), { target: { value: '__custom__' } });
    fireEvent.click(screen.getByRole('button', { name: /start your order/i }));

    expect(screen.getByText(/enter your rental address/i)).toBeInTheDocument();
    expect(mocks.createDashboardOrderV2).not.toHaveBeenCalled();
  });
});
