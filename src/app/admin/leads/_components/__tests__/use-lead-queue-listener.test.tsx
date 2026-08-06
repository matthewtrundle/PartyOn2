/**
 * The keyboard-listener architecture pin.
 *
 * useLeadQueue's document keydown listeners must subscribe ONCE and dispatch
 * through a ref refreshed at commit time. The previous shape re-subscribed in a
 * passive effect whenever the action callback's deps changed, which opened a
 * post-paint window where the UI showed an armed card while the attached
 * handler still closed over the previous confirmedId — a keypress in that
 * window was silently swallowed. That race cost three CI failures in one day
 * (2026-08-05: two lead-queue-advance cases + one lead-queue-keyboard case),
 * each passing in isolation and failing only under parallel-worker load — the
 * worst kind of red.
 *
 * These tests pin the architecture property (no re-subscription across state
 * churn), which is deterministic — unlike the race itself, which could only be
 * caught probabilistically by hammering the suite.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { BoardLead } from '@/lib/leads/board-types';
import { useLeadQueue } from '../use-lead-queue';
import type { LeadMutations } from '../use-lead-mutations';

const base: BoardLead = {
  id: 'lead-a',
  name: 'Ana Alpha',
  email: 'ana@example.com',
  phone: null,
  stage: 'NEW',
  sortOrder: 0,
  score: 50,
  temperature: 'warm',
  occasion: null,
  eventDate: null,
  headcount: null,
  budgetPerPerson: null,
  sourceWidget: null,
  sourceKey: 'CONTACT_FORM',
  sourceLabel: 'Contact / Quote',
  channel: 'direct',
  formKey: null,
  formLabel: null,
  sourcePage: null,
  isB2b: false,
  tags: [],
  owner: null,
  needsResponse: false,
  hasFollowUp: false,
  isDuplicate: false,
  snoozedUntil: null,
  lastContactedAt: null,
  lastActivityAt: null,
  lostReason: null,
  createdAt: '2026-07-20T12:00:00.000Z',
  stageChangedAt: null,
  suggestLost: false,
  cart: null,
  affiliate: null,
  isPremier: false,
  adsClick: false,
  nextAction: { kind: 'EMAIL', reason: 'Nurture' },
  touchCount: 0,
  daysInStage: 1,
  stalled: false,
};

const QUEUE: readonly BoardLead[] = [
  { ...base, id: 'lead-a' },
  { ...base, id: 'lead-b', name: 'Ben Bravo' },
  { ...base, id: 'lead-c', name: 'Cara Charlie' },
];

function fakeMutations(): LeadMutations {
  return {
    mutating: false,
    moveStage: vi.fn().mockResolvedValue(true),
    patchLead: vi.fn().mockResolvedValue(true),
    logTouch: vi.fn().mockResolvedValue(true),
  } as unknown as LeadMutations;
}

const keydownAdds = (spy: { mock: { calls: unknown[][] } }): number =>
  spy.mock.calls.filter((c) => c[0] === 'keydown').length;

beforeEach(() => {
  // The hook's prefetch effect fetches the next card's detail; answer with a
  // non-ok response so the cache stays empty and nothing else happens.
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false }) as Response));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useLeadQueue keyboard listeners', () => {
  it('subscribes exactly twice (capture + bubble) and NEVER re-subscribes across state churn', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const mutations = fakeMutations();

    const { result, unmount } = renderHook(() => useLeadQueue(QUEUE, mutations));
    const addsAtMount = keydownAdds(addSpy);
    expect(addsAtMount).toBe(2); // capture-phase Escape + bubble-phase keymap

    // Heavy state churn — every one of these changed a dep of the old
    // re-subscribing effect (confirmedId, index, busy, lostOpen):
    await act(async () => result.current.markConfirmed('lead-a'));
    await act(async () => result.current.act('called')); // busy → advance → index 1
    await act(async () => result.current.setLostOpen(true));
    await act(async () => result.current.setLostOpen(false));
    await act(async () => result.current.skip()); // index 2
    await act(async () => result.current.prev()); // index 1
    await act(async () => result.current.markConfirmed('lead-b'));

    // The architecture property: still exactly the two mount-time
    // subscriptions, zero removals — so there is no window in which a stale
    // closure can be the attached handler.
    expect(keydownAdds(addSpy)).toBe(addsAtMount);
    expect(removeSpy.mock.calls.filter((c) => c[0] === 'keydown').length).toBe(0);

    unmount();
    expect(removeSpy.mock.calls.filter((c) => c[0] === 'keydown').length).toBe(2);
  });

  it('a keydown dispatched immediately after the arming commit reaches the FRESH handler', async () => {
    const mutations = fakeMutations();
    const { result } = renderHook(() => useLeadQueue(QUEUE, mutations));

    // Arm the card and, with no waits in between, press C. If the handler
    // lagged the commit (the old race), this press would be swallowed and the
    // mutation never fired.
    await act(async () => result.current.markConfirmed('lead-a'));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
    });

    expect(mutations.logTouch).toHaveBeenCalledTimes(1);
    expect(mutations.logTouch).toHaveBeenCalledWith('lead-a', 'call');
  });
});
