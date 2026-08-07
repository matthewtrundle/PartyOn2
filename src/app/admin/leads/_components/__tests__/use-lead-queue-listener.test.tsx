/**
 * The keyboard-listener architecture pin.
 *
 * useLeadQueue's document keydown listeners must subscribe ONCE and dispatch
 * through refs re-pointed at commit time in a LAYOUT effect. The previous shape
 * re-subscribed in a passive effect whenever the action callback's deps changed,
 * which opened a post-paint window where the UI showed an armed card while the
 * attached handler still closed over the previous confirmedId/lostOpen — a
 * keypress in that window was silently swallowed. That race cost three CI
 * failures in one day (2026-08-05: two lead-queue-advance cases + one
 * lead-queue-keyboard case), each passing in isolation and failing only under
 * parallel-worker load — the worst kind of red. Fixed in PR #383 (`397db939`).
 *
 * The rest of the suite catches the race only probabilistically, by hammering
 * the whole board render under contention. This file pins the underlying
 * architecture DETERMINISTICALLY, from three angles that a mutation audit
 * proved are each load-bearing (nothing else in the suite catches all three):
 *
 *   1. subscribe-once + correct phase — exactly one capture and one bubble
 *      keydown listener at mount, never re-subscribed across state churn. Catches
 *      the actual regression (re-subscription in a state-keyed effect) AND a
 *      capture→bubble phase flip that would let Escape fall through to the sheet.
 *   2. the ref refresh runs in the LAYOUT phase — a keypress fired during the
 *      arming commit already sees the fresh handler. Catches downgrading the ref
 *      refresh from useLayoutEffect to useEffect, the subtlest form of the
 *      original race and the one shape that escapes every other test in jsdom.
 *   3. the dispatch routes through the live ref, not a frozen mount-time closure.
 *
 * It spies on document.addEventListener rather than the ref/effect internals, so
 * (1) stays true no matter how the once-subscribe is spelled (the merged fix uses
 * one combined mount effect + one combined layout effect; an earlier draft used a
 * separate pair per listener). The count assertions assume renderHook is NOT
 * wrapped in StrictMode — if that ever changes globally the []-effect
 * double-invokes and these fail loudly (a welcome tripwire, not a flake).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, render, act } from '@testing-library/react';
import { useLayoutEffect, type ReactElement } from 'react';
import type { BoardLead } from '@/lib/leads/board-types';
import { useLeadQueue } from '../use-lead-queue';
import { clearDetailCache } from '../lead-detail-cache';
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

/** The document.addEventListener / removeEventListener calls for 'keydown'. */
const keydownCalls = (spy: { mock: { calls: unknown[][] } }): unknown[][] =>
  spy.mock.calls.filter((c) => c[0] === 'keydown');

/** Capture-phase registration is the 3rd arg === true; bubble is anything else. */
const captureCount = (calls: unknown[][]): number => calls.filter((c) => c[2] === true).length;
const bubbleCount = (calls: unknown[][]): number => calls.filter((c) => c[2] !== true).length;

beforeEach(() => {
  clearDetailCache();
  // The hook's prefetch effect fetches the next card's detail; answer with a
  // non-ok response so the cache stays empty and nothing else happens.
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false }) as Response));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useLeadQueue keyboard listeners', () => {
  it('subscribes exactly one capture + one bubble listener, and NEVER re-subscribes across state churn', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const mutations = fakeMutations();

    const { result, unmount } = renderHook(() => useLeadQueue(QUEUE, mutations));

    const addsAtMount = keydownCalls(addSpy);
    expect(addsAtMount).toHaveLength(2);
    // Phase matters: the capture-phase listener is what intercepts Escape before
    // the drawer's BottomSheet sees it. A capture→bubble flip is a real
    // regression the count alone would miss, so pin both.
    expect(captureCount(addsAtMount)).toBe(1);
    expect(bubbleCount(addsAtMount)).toBe(1);

    // Heavy state churn — every one of these changed a dep of the old
    // re-subscribing effect (confirmedId, index, busy, lostOpen):
    await act(async () => result.current.markConfirmed('lead-a'));
    await act(async () => result.current.act('called')); // busy → advance → index 1
    await act(async () => result.current.setLostOpen(true));
    await act(async () => result.current.setLostOpen(false));
    await act(async () => result.current.skip()); // index 2
    await act(async () => result.current.prev()); // index 1
    await act(async () => result.current.markConfirmed('lead-b'));

    // The architecture property: still exactly the two mount-time subscriptions,
    // zero removals — so there is no window in which a stale closure can be the
    // attached handler.
    expect(keydownCalls(addSpy)).toHaveLength(2);
    expect(keydownCalls(removeSpy)).toHaveLength(0);

    unmount();
    // Both come off, and the flags match the registrations (a capture listener
    // removed without the capture flag is a silent leak).
    const removes = keydownCalls(removeSpy);
    expect(removes).toHaveLength(2);
    expect(captureCount(removes)).toBe(1);
    expect(bubbleCount(removes)).toBe(1);
  });

  it('routes a keypress through the LIVE ref, not a frozen mount-time closure', async () => {
    const mutations = fakeMutations();
    const { result, unmount } = renderHook(() => useLeadQueue(QUEUE, mutations));

    // Arm the card (its effects flush inside act), then press C. If the listener
    // held a frozen mount-time closure (confirmedId stuck at null), the action
    // gate would reject and logTouch would never fire.
    await act(async () => result.current.markConfirmed('lead-a'));
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
    });

    expect(mutations.logTouch).toHaveBeenCalledTimes(1);
    expect(mutations.logTouch).toHaveBeenCalledWith('lead-a', 'call');
    unmount();
  });

  it('re-points the ref in the commit LAYOUT phase — a key fired inside the arming commit already sees fresh state', async () => {
    // The subtlest form of the original race: keep subscribe-once but move the
    // ref refresh from a layout effect to a passive one, and the fresh handler
    // is not installed until AFTER the commit. act() normally hides this by
    // flushing passive effects before the next line runs — so manufacture the
    // exact window by dispatching FROM a layout effect.
    //
    // React runs a fiber's layout effects in registration order, and all layout
    // effects before any passive effect in the same commit. useLeadQueue's ref
    // refresh is registered first (inside the hook call), so on the arming commit
    // it repoints the ref BEFORE this harness's layout effect fires the key. If
    // that refresh were passive, it would not have run yet and the key would hit
    // the stale ref — deterministically, with no dependence on wall-clock or load.
    const mutations = fakeMutations();
    let confirm: (id: string) => void = () => undefined;

    function Harness(): ReactElement | null {
      const q = useLeadQueue(QUEUE, mutations);
      confirm = q.markConfirmed; // stable (useCallback []), safe to capture
      useLayoutEffect(() => {
        if (q.ready) {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
        }
      }, [q.ready]);
      return null;
    }

    const { unmount } = render(<Harness />);
    await act(async () => {
      confirm('lead-a');
    });

    expect(mutations.logTouch).toHaveBeenCalledTimes(1);
    expect(mutations.logTouch).toHaveBeenCalledWith('lead-a', 'call');
    unmount();
  });
});
