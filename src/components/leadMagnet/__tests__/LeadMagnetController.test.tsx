import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import LeadMagnetController from '../LeadMagnetController';

/**
 * Isolate the controller's trigger-gating logic from the modal's rendering
 * (next/image, lead-event client, etc.). We only care WHETHER the controller
 * decides to open a magnet, not how the modal looks.
 */
vi.mock('../LeadMagnetModal', () => ({
  default: ({ open, magnet }: { open: boolean; magnet: { id: string } }) =>
    open ? <div data-testid="lead-magnet-modal">{magnet.id}</div> : null,
}));

// `usePathname` is globally mocked to '/' in src/__tests__/setup.ts, which
// matches the flagship magnet's `pages: ['/', ...]`, so it becomes the
// candidate on mount.

function setAgeVerified() {
  localStorage.setItem('age_verified', '1');
}

const modal = () => screen.queryByTestId('lead-magnet-modal');

beforeEach(() => {
  // The test env's localStorage global is a partial stub; install a complete
  // Map-backed one so getItem/setItem/removeItem all behave and stay isolated.
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('LeadMagnetController — age-gate sequencing', () => {
  it('does NOT open the magnet on the time trigger while the 21+ age gate is unresolved', () => {
    render(<LeadMagnetController />);

    // Advance well past the 25s time trigger (and ~100 poll ticks).
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    // age_verified is absent, so the automatic trigger was never wired.
    expect(modal()).toBeNull();
  });

  it('opens the magnet only after age_verified is set (poll tick, then time trigger)', () => {
    render(<LeadMagnetController />);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(modal()).toBeNull();

    // Visitor clears the age gate.
    setAgeVerified();

    // The 300ms poll notices and wires the triggers...
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(modal()).toBeNull(); // wired, but the 25s timer hasn't elapsed yet

    // ...then the time trigger fires.
    act(() => {
      vi.advanceTimersByTime(25_000);
    });
    expect(modal()).toBeInTheDocument();
  });

  it('wires the trigger immediately when age was already verified before mount', () => {
    setAgeVerified();
    render(<LeadMagnetController />);

    act(() => {
      vi.advanceTimersByTime(25_000);
    });
    expect(modal()).toBeInTheDocument();
  });

  it('honors a manual lead-magnet:open even before the age gate is cleared', () => {
    render(<LeadMagnetController />);

    act(() => {
      window.dispatchEvent(new CustomEvent('lead-magnet:open', { detail: {} }));
    });

    // Manual (user-initiated) triggers are never gated — the flyer preview
    // button must still work.
    expect(modal()).toBeInTheDocument();
  });
});
