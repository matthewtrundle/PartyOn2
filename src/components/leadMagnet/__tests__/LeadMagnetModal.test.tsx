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

// The shared test env's localStorage is a partial stub — give this file a
// real Map-backed one so the done-flag write is observable and deterministic.
const lsStore = new Map<string, string>();
beforeEach(() => {
  vi.clearAllMocks();
  lsStore.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => lsStore.get(k) ?? null,
    setItem: (k: string, v: string) => void lsStore.set(k, String(v)),
    removeItem: (k: string) => void lsStore.delete(k),
    clear: () => lsStore.clear(),
  });
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
    // Fake timers are installed BEFORE render so that IF the auto-close
    // regression were reintroduced, its setTimeout would be a fake timer and
    // advanceTimersByTimeAsync would actually fire it. (An earlier version of
    // this test installed fake timers after submit — a real pending timer
    // would never fire under fake advancement, so the test could not fail.)
    // shouldAdvanceTime keeps waitFor/microtasks flowing.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onClose = vi.fn();
    try {
      render(<LeadMagnetModal magnet={codeMagnet} open onClose={onClose} />);
      await submit();
      await waitFor(() => expect(screen.getByText('STOCKED')).toBeInTheDocument());
      await vi.advanceTimersByTimeAsync(1500);
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('CONTROL: a PDF-reward magnet DOES auto-close after ~1100ms (proves the harness catches the regression)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onClose = vi.fn();
    const pdfMagnet = { ...codeMagnet, id: 'pdf-magnet-test', rewardCode: undefined };
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    try {
      render(<LeadMagnetModal magnet={pdfMagnet} open onClose={onClose} />);
      await submit();
      await vi.advanceTimersByTimeAsync(1500);
      expect(onClose).toHaveBeenCalledWith('submit');
      expect(openSpy).toHaveBeenCalledWith('/order', '_blank', 'noopener');
    } finally {
      openSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('writes the permanent done flag on submit so a converted visitor is never re-prompted', async () => {
    render(<LeadMagnetModal magnet={codeMagnet} open onClose={vi.fn()} />);
    await submit();
    await waitFor(() =>
      expect(lsStore.get('pod_lm_done_products-free-delivery-2026')).toBeTruthy(),
    );
  });

  it('the success-state START YOUR ORDER link closes the modal (so the controller can stamp) before navigating', async () => {
    const onClose = vi.fn();
    render(<LeadMagnetModal magnet={codeMagnet} open onClose={onClose} />);
    await submit();
    await waitFor(() => expect(screen.getByText('STOCKED')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('link', { name: /start your order/i }));
    expect(onClose).toHaveBeenCalledWith('submit');
  });
});
