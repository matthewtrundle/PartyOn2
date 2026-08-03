/**
 * Detail cache + prefetch + the confirmed-fresh guard that disarms the queue.
 *
 * What this protects:
 *
 *  1. The cache itself (lead-detail-cache.ts) — a module-level Map that must
 *     round-trip, must not double-fetch a lead that is cached or already in
 *     flight, must evict FIFO at its cap instead of growing without bound, and
 *     must release its in-flight marker even when the request fails (otherwise
 *     one blip permanently wedges that lead out of the prefetch path).
 *
 *  2. The prefetch WINDOW — useLeadQueue warms `queue[index + 1]`, and the
 *     window must move when the operator advances. If it silently warmed the
 *     current card instead, every card would still stall on a nine-query fetch
 *     and the whole feature would be a no-op nobody notices. Note the trade:
 *     a prefetched lead is fetched TWICE (the warm-up, then the drawer's
 *     unconditional revalidate). This buys an instant first paint, not fewer
 *     requests, and the tests below assert that second hit really happens.
 *
 *  3. The confirmed-fresh guard — the reason this file exists. The drawer paints
 *     a cached lead instantly (stale-while-revalidate), so the operator can be
 *     looking at a snapshot taken minutes ago, or at nothing at all on a cold
 *     cache. Two separate things therefore stay disarmed until THIS lead's own
 *     fetch resolves:
 *       - the drawer's stage picker, via `mutating={mutations.mutating || !confirmed}`
 *       - the QUEUE's own write path — bar buttons and the global keyboard map —
 *         via useLeadQueue's `ready`/`confirmedId` gate, which early-returns out
 *         of act() for any card that has not confirmed.
 *     The second one is the sharp edge: the keyboard is live the instant the
 *     queue mounts, so without the gate `c` logs a call on a card that has not
 *     painted, and `x`+`1` marks a stale card Lost. Confirmation is per-card and
 *     must not leak from the previous lead.
 *
 *  4. Failure containment — a rejected prefetch must not throw, must not poison
 *     the cache, and must leave the queue rendering and navigable.
 *
 * The drawer fetches on mount, so every test here stubs global.fetch, and the
 * module-level cache is cleared between tests (it deliberately outlives unmount).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup, within } from '@testing-library/react';
import type { BoardLead } from '@/lib/leads/board-types';
import LeadQueue from '../lead-queue';
import type { LeadDetail } from '../drawer-types';
import type { LeadMutations } from '../use-lead-mutations';
import {
  clearDetailCache,
  prefetchDetail,
  readDetail,
  writeDetail,
} from '../lead-detail-cache';

/** Mirrors the cap in lead-detail-cache.ts (not exported — kept in sync here). */
const MAX_ENTRIES = 50;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Board-card factory — same shape the work-queue unit tests use. */
const baseCard: BoardLead = {
  id: 'lead-1',
  name: 'Test Lead',
  email: 'a@example.com',
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

const card = (over: Partial<BoardLead>): BoardLead => ({ ...baseCard, ...over });

/** Minimal-but-valid LeadDetail — every array present, nothing the drawer trips on. */
function detailFor(id: string, over: Partial<LeadDetail['lead']> = {}): LeadDetail {
  return {
    lead: {
      id,
      email: `${id}@example.com`,
      phone: null,
      firstName: 'Lead',
      lastName: id,
      status: 'NEW',
      pipelineStage: 'NEW',
      leadScore: 50,
      scoreBreakdown: null,
      sourcePage: null,
      sourceWidget: 'CONTACT_FORM',
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
      owner: null,
      snoozedUntil: null,
      notes: '',
      metadata: null,
      createdAt: '2026-07-20T12:00:00.000Z',
      ...over,
    },
    events: [],
    followUps: [],
    emailLogs: [],
    orders: [],
    drafts: [],
    inboundEmails: [],
    chatConversations: [],
    cart: null,
    affiliate: null,
  };
}

interface Fakes {
  mutations: LeadMutations;
  moveStage: ReturnType<typeof vi.fn>;
  patchLead: ReturnType<typeof vi.fn>;
  logTouch: ReturnType<typeof vi.fn>;
}

/** LeadMutations is a plain object, so a hand-rolled fake is enough. */
function makeMutations(): Fakes {
  const moveStage = vi.fn().mockResolvedValue(true);
  const patchLead = vi.fn().mockResolvedValue(true);
  const logTouch = vi.fn().mockResolvedValue(true);
  return { mutations: { mutating: false, moveStage, patchLead, logTouch }, moveStage, patchLead, logTouch };
}

/**
 * Nothing was written. The drawer autosaves notes through patchLead on a timer,
 * but no test here types into the notes field, so a bare not-called is honest.
 */
function expectNoWrites(f: Fakes): void {
  expect(f.logTouch).not.toHaveBeenCalled();
  expect(f.patchLead).not.toHaveBeenCalled();
  expect(f.moveStage).not.toHaveBeenCalled();
}

// ---------------------------------------------------------------------------
// fetch plumbing
// ---------------------------------------------------------------------------

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Envelope the real route returns: { success, data }. */
function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const detailResponse = (id: string, over: Partial<LeadDetail['lead']> = {}): Response =>
  jsonResponse({ success: true, data: detailFor(id, over) });

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

const idOf = (input: RequestInfo | URL): string => urlOf(input).split('/').pop() ?? '';

const leadUrl = (id: string): string => `/api/v1/admin/leads/${id}`;

/** How many times that lead was actually requested (prefetch + revalidate). */
const hitsFor = (id: string): number => calls.filter((u) => u === leadUrl(id)).length;

/** Drain the microtask queue (a macrotask tick runs strictly after all of it). */
const flush = (): Promise<void> => new Promise((r) => { setTimeout(r, 0); });

let fetchMock: ReturnType<typeof vi.fn>;
let calls: string[];

/** Default stub: every lead id resolves with its own valid detail. */
function stubFetch(
  impl: (input: RequestInfo | URL) => Promise<Response> = (input) =>
    Promise.resolve(detailResponse(idOf(input))),
): void {
  fetchMock = vi.fn((input: RequestInfo | URL) => {
    calls.push(urlOf(input));
    return impl(input);
  });
  vi.stubGlobal('fetch', fetchMock);
}

/**
 * Hold one lead's DRAWER fetch open while everything else resolves.
 *
 * A prefetched lead is hit twice, and the two hits mean different things: the
 * first warms the cache (so the card can paint stale), the second is the
 * drawer's revalidate (the one confirmation waits on). `skipHits` says how many
 * early hits to let through before holding.
 */
function holdDrawerFetch(id: string, skipHits = 0): Deferred<Response> {
  const held = deferred<Response>();
  let seen = 0;
  stubFetch((input) => {
    if (idOf(input) !== id) return Promise.resolve(detailResponse(idOf(input)));
    seen += 1;
    return seen > skipHits ? held.promise : Promise.resolve(detailResponse(id));
  });
  return held;
}

interface Harness extends Fakes {
  onExit: ReturnType<typeof vi.fn>;
}

function renderQueue(ids: string[]): Harness {
  const fakes = makeMutations();
  const onExit = vi.fn();
  render(
    <LeadQueue queue={ids.map((id) => card({ id }))} mutations={fakes.mutations} onExit={onExit} />,
  );
  return { ...fakes, onExit };
}

/**
 * The queue bar, scoped by its position counter.
 *
 * Scoping matters: the drawer renders its own "Snooze 3d" and stage "Lost"
 * buttons, so an unscoped query would silently assert against the wrong control.
 */
function bar(): HTMLElement {
  const section = screen.getByText(/^\d+ \/ \d+$/).closest('section');
  if (!section) throw new Error('queue bar is not rendered');
  return section;
}

/** One of the bar's controls, matched on its label (the kbd hint is trailing). */
const barButton = (label: string): HTMLElement =>
  within(bar()).getByRole('button', { name: new RegExp(`^${label}`, 'i') });

/** The four controls that write. Every one of them is gated on `ready`. */
const BAR_WRITES = ['Log call', 'Log text', 'Snooze 3d', 'Lost'] as const;

/** Text the bar shows while the current lead is still unconfirmed. */
const LOADING_LINE = /Loading this lead/i;

beforeEach(() => {
  // Module-level state that deliberately survives unmount — it would otherwise
  // leak between tests in this file and make prefetches silently no-op.
  clearDetailCache();
  calls = [];
  stubFetch();
});

afterEach(() => {
  // Unmount BEFORE restoring fetch. Vitest runs afterEach hooks last-registered
  // first, so this beats RTL's auto-cleanup — and unmounting flushes the queue's
  // pending prefetch effect, which would otherwise fire at a torn-down stub.
  cleanup();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// (a) the cache itself
// ---------------------------------------------------------------------------

describe('lead-detail-cache', () => {
  it('round-trips a written detail and reports null when cold', () => {
    expect(readDetail('nope')).toBeNull();
    const detail = detailFor('lead-1', { notes: 'hello' });
    writeDetail('lead-1', detail);
    expect(readDetail('lead-1')).toBe(detail);
    expect(readDetail('lead-1')?.lead.notes).toBe('hello');
  });

  it('prefetch stores what the endpoint returned', async () => {
    prefetchDetail('lead-9');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calls[0]).toBe(leadUrl('lead-9'));
    expect(readDetail('lead-9')?.lead.id).toBe('lead-9');
  });

  it('does nothing without an id', () => {
    prefetchDetail(null);
    prefetchDetail(undefined);
    prefetchDetail('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is a no-op when the lead is already cached', () => {
    writeDetail('lead-1', detailFor('lead-1'));
    prefetchDetail('lead-1');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is a no-op while the same lead is already in flight', () => {
    const pending = deferred<Response>();
    stubFetch(() => pending.promise);

    prefetchDetail('lead-1');
    prefetchDetail('lead-1');
    prefetchDetail('lead-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Different lead still goes out — the guard is per-id, not global.
    prefetchDetail('lead-2');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    pending.resolve(detailResponse('lead-1'));
  });

  it('releases the in-flight marker when the request fails, so a retry works', async () => {
    let attempt = 0;
    stubFetch((input) => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(detailResponse(idOf(input)));
    });

    prefetchDetail('lead-1');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(readDetail('lead-1')).toBeNull();

    prefetchDetail('lead-1');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(readDetail('lead-1')?.lead.id).toBe('lead-1');
  });

  it('does not cache a non-ok response', async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ error: 'boom' }, false)));
    prefetchDetail('lead-1');
    await flush();
    expect(readDetail('lead-1')).toBeNull();
  });

  it('evicts FIFO at the cap — the oldest entry goes, the newest stays', () => {
    for (let i = 1; i <= MAX_ENTRIES + 1; i += 1) {
      writeDetail(`lead-${i}`, detailFor(`lead-${i}`));
    }
    expect(readDetail('lead-1')).toBeNull();
    expect(readDetail('lead-2')?.lead.id).toBe('lead-2');
    expect(readDetail(`lead-${MAX_ENTRIES + 1}`)?.lead.id).toBe(`lead-${MAX_ENTRIES + 1}`);
  });

  it('re-writing an existing key does not evict anything', () => {
    for (let i = 1; i <= MAX_ENTRIES; i += 1) writeDetail(`lead-${i}`, detailFor(`lead-${i}`));
    writeDetail('lead-1', detailFor('lead-1', { notes: 'updated' }));
    expect(readDetail('lead-1')?.lead.notes).toBe('updated');
    expect(readDetail('lead-2')?.lead.id).toBe('lead-2');
  });

  it('clearDetailCache empties it', () => {
    writeDetail('lead-1', detailFor('lead-1'));
    writeDetail('lead-2', detailFor('lead-2'));
    clearDetailCache();
    expect(readDetail('lead-1')).toBeNull();
    expect(readDetail('lead-2')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// (b) the prefetch window
// ---------------------------------------------------------------------------

describe('LeadQueue prefetch window', () => {
  it('warms the NEXT lead on mount, not only the current one', async () => {
    renderQueue(['lead-1', 'lead-2', 'lead-3']);

    // Current lead — the drawer's own fetch.
    await waitFor(() => expect(calls).toContain(leadUrl('lead-1')));
    // The point of the feature: lead-2 is already on the wire.
    expect(calls).toContain(leadUrl('lead-2'));
    // …and only one card ahead, not the whole queue.
    expect(calls).not.toContain(leadUrl('lead-3'));
    expect(readDetail('lead-2')?.lead.id).toBe('lead-2');
  });

  it('moves the window forward when the operator advances', async () => {
    renderQueue(['lead-1', 'lead-2', 'lead-3']);
    await waitFor(() => expect(calls).toContain(leadUrl('lead-2')));
    expect(calls).not.toContain(leadUrl('lead-3'));

    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());
    await waitFor(() => expect(calls).toContain(leadUrl('lead-3')));
  });

  it('costs two requests per prefetched lead — warm-up plus the drawer revalidate', async () => {
    renderQueue(['lead-1', 'lead-2']);

    // Warmed once, ahead of time.
    await waitFor(() => expect(readDetail('lead-2')?.lead.id).toBe('lead-2'));
    expect(hitsFor('lead-2')).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    // The drawer revalidates unconditionally — a warm cache is a paint
    // optimisation, never a reason to trust what's on screen.
    await waitFor(() => expect(hitsFor('lead-2')).toBe(2));
    expect(hitsFor('lead-1')).toBe(1);
  });

  it('warms nothing past the end of the queue', async () => {
    renderQueue(['lead-1']);
    await waitFor(() => expect(calls).toContain(leadUrl('lead-1')));
    expect(calls).toEqual([leadUrl('lead-1')]);
  });
});

// ---------------------------------------------------------------------------
// (c) instant paint from cache
// ---------------------------------------------------------------------------

describe('LeadQueue cached paint', () => {
  it('paints a cached lead without waiting for any fetch to resolve', () => {
    writeDetail('lead-1', detailFor('lead-1', { notes: 'stale note' }));
    // Nothing this stub returns ever settles — anything on screen came from cache.
    stubFetch(() => new Promise<Response>(() => {}));

    renderQueue(['lead-1', 'lead-2']);

    expect(screen.getByRole('link', { name: 'lead-1@example.com' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('stale note')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('still revalidates — the cached paint converges on the server copy', async () => {
    writeDetail('lead-1', detailFor('lead-1', { notes: 'stale note' }));
    const pending = holdDrawerFetch('lead-1');

    renderQueue(['lead-1', 'lead-2']);
    expect(screen.getByDisplayValue('stale note')).toBeInTheDocument();
    expect(calls).toContain(leadUrl('lead-1'));

    await act(async () => {
      pending.resolve(detailResponse('lead-1', { notes: 'server note' }));
    });

    await waitFor(() => expect(screen.getByDisplayValue('server note')).toBeInTheDocument());
  });
});

// ---------------------------------------------------------------------------
// (d) the confirmed-fresh guard — the queue's own write path
// ---------------------------------------------------------------------------

describe('LeadQueue confirmed-fresh guard', () => {
  it('cold cache: the keyboard is inert until the card has painted', async () => {
    const pending = holdDrawerFetch('lead-1');
    const h = renderQueue(['lead-1', 'lead-2', 'lead-3']);

    // Nothing is on screen but the spinner — the bar lives inside the drawer's
    // loaded branch, so there is not even a button to disable yet.
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^log call/i })).not.toBeInTheDocument();

    // The document-level listener is live from mount, though, so these land.
    fireEvent.keyDown(document, { key: 'c' });
    fireEvent.keyDown(document, { key: 'z' });
    fireEvent.keyDown(document, { key: 'x' });
    fireEvent.keyDown(document, { key: '1' });
    await flush();

    expectNoWrites(h);
    // Advancing would have moved the prefetch window onto lead-3.
    expect(calls).not.toContain(leadUrl('lead-3'));

    // Prove it by letting the card land: still card one, nothing consumed.
    await act(async () => {
      pending.resolve(detailResponse('lead-1'));
    });
    expect(await screen.findByText('1 / 3')).toBeInTheDocument();
    expectNoWrites(h);
  });

  it('arms the bar and the keyboard once the current lead confirms', async () => {
    const pending = holdDrawerFetch('lead-1');
    const h = renderQueue(['lead-1', 'lead-2']);

    fireEvent.keyDown(document, { key: 'c' });
    await flush();
    expect(h.logTouch).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve(detailResponse('lead-1'));
    });

    // The bar appears armed and stops apologising for itself.
    await waitFor(() => expect(barButton('Log call')).toBeEnabled());
    for (const label of BAR_WRITES) expect(barButton(label)).toBeEnabled();
    expect(screen.queryByText(LOADING_LINE)).not.toBeInTheDocument();

    // And the same keystroke that did nothing a moment ago now writes.
    fireEvent.keyDown(document, { key: 'c' });
    await waitFor(() => expect(h.logTouch).toHaveBeenCalledWith('lead-1', 'call'));
    expect(await screen.findByText('2 / 2')).toBeInTheDocument();
  });

  it('stale cache: the card paints instantly but stays disarmed until the revalidate lands', async () => {
    // The exact scenario the guard exists for — a readable card whose contents
    // may be minutes old, with every control live if nothing stops them.
    writeDetail('lead-1', detailFor('lead-1', { notes: 'stale note' }));
    const pending = holdDrawerFetch('lead-1');
    const h = renderQueue(['lead-1', 'lead-2']);

    // Instant paint is preserved…
    expect(screen.getByRole('link', { name: 'lead-1@example.com' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('stale note')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    // …and the bar is explicit about why it is dead.
    expect(screen.getByText(LOADING_LINE)).toBeInTheDocument();
    for (const label of BAR_WRITES) expect(barButton(label)).toBeDisabled();

    // The keyboard is gated on the same state, not just the button's disabled attr.
    fireEvent.keyDown(document, { key: 'c' });
    fireEvent.keyDown(document, { key: 'z' });
    fireEvent.keyDown(document, { key: 't' });
    await flush();
    expectNoWrites(h);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    await act(async () => {
      pending.resolve(detailResponse('lead-1'));
    });

    await waitFor(() => expect(barButton('Log call')).toBeEnabled());
    expect(screen.queryByText(LOADING_LINE)).not.toBeInTheDocument();
    fireEvent.click(barButton('Log call'));
    await waitFor(() => expect(h.logTouch).toHaveBeenCalledWith('lead-1', 'call'));
  });

  it('keeps the drawer stage picker dead on a cached paint, then arms it on confirmation', async () => {
    writeDetail('lead-1', detailFor('lead-1'));
    const pending = holdDrawerFetch('lead-1');

    renderQueue(['lead-1', 'lead-2']);

    // The card is readable…
    expect(screen.getByRole('link', { name: 'lead-1@example.com' })).toBeInTheDocument();
    // …but not actionable: this snapshot has not been confirmed against the server.
    expect(screen.getByRole('button', { name: 'Qualified' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Quote Sent' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Won' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lost' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Logged call' })).toBeDisabled();

    await act(async () => {
      pending.resolve(detailResponse('lead-1'));
    });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Qualified' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Quote Sent' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Won' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Lost' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Logged call' })).toBeEnabled();
  });

  /**
   * The sharpest regression risk in the gate: confirmation must not carry over.
   *
   * This caught a real bug. When the drawer held a boolean `confirmed`, the
   * reset and the announce lived in two effects that both run in the same pass
   * on a lead change — so the announce saw the PREVIOUS card's `true` beside
   * the NEW leadId and armed the next card before it had been fetched.
   *
   * The fix makes that unrepresentable: lead-drawer.tsx stores `confirmedFor`
   * (the id whose fetch landed) and derives `confirmed = confirmedFor === leadId`
   * on every render, so the moment leadId changes the gate closes in the same
   * render — no effect ordering to get wrong. It also means a slow, out-of-order
   * response can only ever confirm the card it was actually issued for.
   */
  it('re-arms per card — lead 1 confirming does not arm lead 2', async () => {
    // lead-2 gets two hits: the queue's prefetch (allowed through, so the cache
    // warms and the card paints instantly) and later the drawer's revalidate
    // (held, so the unconfirmed window is inspectable).
    const held = holdDrawerFetch('lead-2', 1);
    const h = renderQueue(['lead-1', 'lead-2']);

    // First card confirms normally, and lead-2 lands in the cache.
    await waitFor(() => expect(barButton('Log call')).toBeEnabled());
    await waitFor(() => expect(readDetail('lead-2')?.lead.id).toBe('lead-2'));

    fireEvent.click(barButton('Skip'));

    // lead-2 paints instantly from the prefetch…
    expect(await screen.findByRole('link', { name: 'lead-2@example.com' })).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    // …and the guard must arm again: the previous card's confirmation cannot
    // carry over, and a warm cache never counts as confirmation.
    expect(screen.getByRole('button', { name: 'Qualified' })).toBeDisabled();
    for (const label of BAR_WRITES) expect(barButton(label)).toBeDisabled();
    expect(screen.getByText(LOADING_LINE)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'c' });
    await flush();
    expectNoWrites(h);

    // Only lead-2's own fetch re-arms it — and then it writes against lead-2.
    await act(async () => {
      held.resolve(detailResponse('lead-2'));
    });
    await waitFor(() => expect(barButton('Log call')).toBeEnabled());
    fireEvent.keyDown(document, { key: 'c' });
    await waitFor(() => expect(h.logTouch).toHaveBeenCalledWith('lead-2', 'call'));
    expect(h.logTouch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// (e) failure containment
// ---------------------------------------------------------------------------

describe('LeadQueue prefetch failure', () => {
  it('a rejected prefetch leaves the queue rendered, navigable and un-poisoned', async () => {
    const failOnce = new Set(['lead-2']);
    stubFetch((input) => {
      const id = idOf(input);
      if (failOnce.has(id)) {
        failOnce.delete(id);
        return Promise.reject(new Error('network down'));
      }
      return Promise.resolve(detailResponse(id));
    });

    renderQueue(['lead-1', 'lead-2', 'lead-3']);

    // Current card renders normally despite the next card's prefetch blowing up.
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'lead-1@example.com' })).toBeInTheDocument(),
    );
    await flush();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(readDetail('lead-2')).toBeNull();

    // Still usable: advancing works and the failed lead loads on its own fetch,
    // which is also what re-arms the guard for it.
    fireEvent.click(barButton('Skip'));
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'lead-2@example.com' })).toBeInTheDocument(),
    );
    await waitFor(() => expect(barButton('Log call')).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Qualified' })).toBeEnabled();
  });
});
