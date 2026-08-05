/**
 * The lead-magnet modal is now the ask on two previously-dead pages, and its
 * reward is a discount code. These tests pin the three things that make that
 * ask measurable and usable: the submit fires a first-party/GA4 cta_click, the
 * code is sent to the server so the welcome email can carry it, and the success
 * state actually shows the code (and does NOT auto-close over it).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeadMagnetModal from '../LeadMagnetModal';
import type { LeadMagnet } from '@/lib/leadMagnet/config';

const mocks = vi.hoisted(() => ({
  sendLeadEvent: vi.fn(() => Promise.resolve()),
  getAttribution: vi.fn(() => undefined),
  trackCTAClick: vi.fn(),
}));

vi.mock('@/lib/leads/client', () => ({ sendLeadEvent: mocks.sendLeadEvent }));
vi.mock('@/lib/analytics/attribution', () => ({ getAttribution: mocks.getAttribution }));
vi.mock('@/lib/analytics/ga4-events', () => ({ trackCTAClick: mocks.trackCTAClick }));

const codeMagnet: LeadMagnet = {
  id: 'products-free-delivery-2026',
  title: 'Free Delivery on Your First Order',
  subhead: 'We deliver it free.',
  reward: 'A free-delivery code',
  rewardUrl: '/order',
  rewardCode: 'STOCKED',
  cta: 'Get my free delivery',
  askPhone: false,
  accent: { primary: '#D4AF37', primaryText: '#0A1F33', navy: '#0A1F33' },
  pages: ['/products'],
  triggers: [{ type: 'manual' }],
  cooldownDays: 7,
  enabled: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
});

async function submit() {
  // The modal's Input renders <label> + <input> as unassociated siblings, so
  // query by role: with askPhone:false there are exactly two textboxes —
  // [0] first name, [1] email.
  const boxes = screen.getAllByRole('textbox');
  fireEvent.change(boxes[0], { target: { value: 'Sam' } });
  fireEvent.change(boxes[1], { target: { value: 'sam@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /get my free delivery/i }));
}

describe('LeadMagnetModal — discount-code reward', () => {
  it('fires a cta_click on submit', async () => {
    render(<LeadMagnetModal magnet={codeMagnet} open onClose={vi.fn()} />);
    await submit();
    await waitFor(() => expect(mocks.trackCTAClick).toHaveBeenCalledTimes(1));
    expect(mocks.trackCTAClick).toHaveBeenCalledWith(
      codeMagnet.cta,
      '/order',
      'lead_magnet',
    );
  });

  it('sends the rewardCode to the welcome-email endpoint', async () => {
    render(<LeadMagnetModal magnet={codeMagnet} open onClose={vi.fn()} />);
    await submit();
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/lead-magnet',
        expect.anything(),
      ),
    );
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === '/api/v1/lead-magnet',
    );
    const bodyObj = JSON.parse(call![1].body as string);
    expect(bodyObj.rewardCode).toBe('STOCKED');
  });

  it('shows the code in the success state and does NOT auto-close over it', async () => {
    const onClose = vi.fn();
    render(<LeadMagnetModal magnet={codeMagnet} open onClose={onClose} />);
    await submit();
    await waitFor(() => expect(screen.getByText('STOCKED')).toBeInTheDocument());
    // The code-reward path must not schedule the 1100ms auto-close (the visitor
    // needs to read the code). Advance well past that window with fake timers —
    // no real wall-clock wait, so this can't add flake pressure to the suite.
    vi.useFakeTimers();
    try {
      vi.advanceTimersByTime(1500);
    } finally {
      vi.useRealTimers();
    }
    expect(onClose).not.toHaveBeenCalled();
  });
});
