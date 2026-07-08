import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StrStartOrderButton from '../StrStartOrderButton';
import type { StrPartnerConfig } from '@/lib/partners/str-partners';

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
vi.mock('@/lib/analytics/ga4-events', () => ({
  trackCTAClick: vi.fn(),
}));

const config: StrPartnerConfig = {
  code: 'TESTCO',
  slug: 'test-co',
  name: 'Test Rentals',
  deliveryContextType: 'HOUSE',
  allowCustomAddress: true,
  properties: [],
};

function mkGroup(shareCode: string) {
  return { shareCode, participants: [{ id: 'host-1', isHost: true }] };
}

/** Stub the attribution endpoint the button calls to resolve code → id. */
function mockAttribution(affiliateId: string | null) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: affiliateId ? { affiliateId } : null }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StrStartOrderButton', () => {
  it('creates a partner-attributed dashboard with NO address and redirects', async () => {
    mockAttribution('aff-123');
    mocks.createDashboardOrderV2.mockResolvedValue(mkGroup('CODE1'));
    render(<StrStartOrderButton config={config} affiliateCode="TESTCO" />);

    fireEvent.click(screen.getByRole('button', { name: /start your order/i }));

    await waitFor(() => expect(mocks.createDashboardOrderV2).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/affiliate/attribution?code=TESTCO');
    const payload = mocks.createDashboardOrderV2.mock.calls[0][0];
    expect(payload).toMatchObject({
      affiliateId: 'aff-123',
      source: 'PARTNER_PAGE',
      deliveryContextType: 'HOUSE',
      tabName: 'Rental Delivery',
    });
    // The lander never sets an address — the dashboard's property dropdown does.
    expect(payload.deliveryAddress).toBeUndefined();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/dashboard/CODE1'));
  });

  it('still creates the dashboard (unattributed) when the code does not resolve', async () => {
    mockAttribution(null);
    mocks.createDashboardOrderV2.mockResolvedValue(mkGroup('CODE2'));
    render(<StrStartOrderButton config={config} affiliateCode="TESTCO" />);

    fireEvent.click(screen.getByRole('button', { name: /start your order/i }));

    await waitFor(() => expect(mocks.createDashboardOrderV2).toHaveBeenCalledTimes(1));
    expect(mocks.createDashboardOrderV2.mock.calls[0][0].affiliateId).toBeUndefined();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/dashboard/CODE2'));
  });

  it('shows an error and re-enables when creation fails', async () => {
    mockAttribution('aff-1');
    mocks.createDashboardOrderV2.mockRejectedValue(new Error('boom'));
    render(<StrStartOrderButton config={config} affiliateCode="TESTCO" />);

    fireEvent.click(screen.getByRole('button', { name: /start your order/i }));

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /start your order/i })).not.toBeDisabled();
  });

  it('renders a custom label', () => {
    render(
      <StrStartOrderButton config={config} affiliateCode="TESTCO" label="Order Your Drinks" />
    );
    expect(screen.getByRole('button', { name: 'Order Your Drinks' })).toBeInTheDocument();
  });
});
