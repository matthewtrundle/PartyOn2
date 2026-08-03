/**
 * Work-queue advance semantics, rendered end to end (LeadQueue → useLeadQueue →
 * LeadQueueBar → LeadDrawer). Five things this file exists to protect:
 *
 *  1. THE CONFIRMATION GATE. No write fires until the CURRENT lead's own detail
 *     fetch has landed. Without it the keyboard is live the instant the queue
 *     mounts, so on a cold cache an operator can press C and log a call against
 *     a card that has not painted yet. Every test below therefore waits for the
 *     card to arm (`atCard`) before acting — a press before that point is a
 *     no-op, and an assertion made after one is vacuous.
 *
 *  2. THE FAILURE INVARIANT. A mutation that resolves false must leave the
 *     operator exactly where they were — same position, same lead, same
 *     half-typed reply, visible error, no outcome recorded. If this regresses,
 *     a network blip silently eats a lead: the operator sees the next card and
 *     believes the last one was handled, so nobody ever calls that customer
 *     back. The banner then has to clear the moment they move on, or a stale
 *     red line makes them distrust a card that is actually fine.
 *
 *  3. THE NO-REFETCH GUARANTEE. The queue is handed a `useLeadMutations`
 *     instance built on a no-op `onChanged`. Every successful action must
 *     therefore write and stop — never reload /api/v1/admin/leads/board, which
 *     is a 500-card aggregation plus an enroll sweep. Asserted against the real
 *     hook (not a hand-rolled fake) so the wiring itself is under test, with a
 *     paired test proving a normal instance *would* reload — otherwise the
 *     zero-count assertion could pass for the wrong reason.
 *
 *  4. THE WRITE PAYLOADS, ON THE WIRE. Snooze must send `source: 'queue'` and
 *     an ISO timestamp ~3 days out; Lost must send `via: 'queue'` plus the
 *     structured reason. Those two markers are what makes queue work auditable
 *     server-side, and they are only real if they survive JSON.stringify — so
 *     these are asserted against the recorded request body of the real hook,
 *     not against a spy's arguments.
 *
 *  5. THE REPLY HAND-OFF. The composer owns the send; the queue owns what
 *     "sent" means. If that wiring is dropped the queue simply stops advancing
 *     after an email and the summary's "Replies sent" row becomes unreachable —
 *     silent, and invisible to any test that only watches mutations.
 *
 * Plus the double-fire guard (a second keystroke while a mutation is in flight
 * must not fire a second write, including down the Lost path), the skip
 * don't-clobber rule, and the end-of-sitting summary.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * These are full render-to-mutation integration tests: each one walks a card
 * through several sequential async UI waits (arm → press → advance → assert),
 * so they legitimately cost more wall-clock than a unit test. Vitest's default
 * 5s budget is not enough on a contended CI runner — TWO different tests here
 * have now timed out at ~5.00s while passing locally and in isolation (see also
 * the sibling de-flake in #351, which anchored on the mutation instead of a
 * transient label).
 *
 * This raises only the CLOCK. Every assertion, gate, and invariant below is
 * unchanged — a genuine hang still fails, just at 20s instead of 5s.
 */
vi.setConfig({ testTimeout: 20_000 });
import type { Mock } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import type { BoardLead } from '@/lib/leads/board-types';
import LeadQueue from '../lead-queue';
import { useLeadMutations, type LeadMutations } from '../use-lead-mutations';
import { clearDetailCache } from '../lead-detail-cache';
import type { LeadDetail } from '../drawer-types';

// ---------------------------------------------------------------- fixtures

/** Board-card factory — same shape the queue's own unit test uses. */
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

const card = (over: Partial<BoardLead>): BoardLead => ({ ...base, ...over });

/** Distinct next-action reasons — the bar renders them, so they identify the current card. */
const REASON_A = 'Unanswered — reply now';
const REASON_B = 'Hot lead — call';
const REASON_C = 'Nurture';

const QUEUE: readonly BoardLead[] = [
  card({ id: 'lead-a', name: 'Ana Alpha', nextAction: { kind: 'REPLY', reason: REASON_A } }),
  card({ id: 'lead-b', name: 'Ben Bravo', nextAction: { kind: 'CALL', reason: REASON_B } }),
  card({ id: 'lead-c', name: 'Cara Charlie', nextAction: { kind: 'EMAIL', reason: REASON_C } }),
];

const FIRST_NAMES: Record<string, string> = {
  'lead-a': 'Ana',
  'lead-b': 'Ben',
  'lead-c': 'Cara',
};

/** Minimal but well-formed GET /api/v1/admin/leads/[id] payload. */
function detailFor(id: string): LeadDetail {
  return {
    lead: {
      id,
      email: `${id}@example.com`,
      phone: null,
      firstName: FIRST_NAMES[id] ?? 'Test',
      lastName: 'Lead',
      status: 'NEW',
      pipelineStage: 'NEW',
      leadScore: 50,
      scoreBreakdown: null,
      sourcePage: null,
      sourceWidget: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
      owner: null,
      snoozedUntil: null,
      notes: null,
      metadata: null,
      createdAt: '2026-07-20T12:00:00.000Z',
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

// ------------------------------------------------------------- fetch stub

interface FetchCall {
  url: string;
  method: string;
  /** The serialized request body, so payload assertions can be made on the wire. */
  body: string | null;
}

let fetchCalls: FetchCall[] = [];

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as unknown as Response;
}

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.toString() : String(input);

/** Record a request exactly as the hook issued it — body included. */
function record(url: string, init?: RequestInit): void {
  fetchCalls.push({
    url,
    method: (init?.method ?? 'GET').toUpperCase(),
    body: typeof init?.body === 'string' ? init.body : null,
  });
}

/** Routes every URL the queue path can hit; records each call for the payload assertions. */
async function fetchStub(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = urlOf(input);
  record(url, init);

  if (url.includes('/leads/board')) {
    return jsonResponse({ success: true, data: { columns: {}, kpis: null } });
  }
  if (url.endsWith('/touch')) return jsonResponse({ success: true, data: { logged: true } });
  if (url.endsWith('/stage')) return jsonResponse({ success: true, data: { moved: true } });
  if (url.endsWith('/reply')) return jsonResponse({ success: true, data: { emailLogId: 'e1' } });
  if ((init?.method ?? 'GET').toUpperCase() === 'PATCH') {
    return jsonResponse({ success: true, data: { updated: true } });
  }

  const id = url.split('?')[0].split('/').pop() ?? '';
  return jsonResponse({ success: true, data: detailFor(id) });
}

const urlsMatching = (fragment: string): string[] =>
  fetchCalls.filter((c) => c.url.includes(fragment)).map((c) => c.url);

/**
 * Parsed JSON bodies of every recorded write to exactly this URL. Exact-match
 * on purpose: `/leads/lead-a` must not sweep up `/leads/lead-a/touch`, and the
 * drawer's own bodyless GET of the same path must not count as a write.
 */
function writeBodies(url: string): Array<Record<string, unknown>> {
  return fetchCalls
    .filter((c) => c.url === url && c.body !== null)
    .map((c) => JSON.parse(c.body as string) as Record<string, unknown>);
}

// ------------------------------------------------------------- test doubles

interface QueueMutationsFake {
  mutating: boolean;
  moveStage: Mock<LeadMutations['moveStage']>;
  patchLead: Mock<LeadMutations['patchLead']>;
  logTouch: Mock<LeadMutations['logTouch']>;
}

function fakeMutations(over: Partial<QueueMutationsFake> = {}): QueueMutationsFake {
  return {
    mutating: false,
    moveStage: vi.fn<LeadMutations['moveStage']>().mockResolvedValue(true),
    patchLead: vi.fn<LeadMutations['patchLead']>().mockResolvedValue(true),
    logTouch: vi.fn<LeadMutations['logTouch']>().mockResolvedValue(true),
    ...over,
  };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// ------------------------------------------------------------------ helpers

/** "2 / 3" — the position chip in the queue bar. */
function position(): string {
  return screen.getByText(/^\d+ \/ \d+$/).textContent ?? '';
}

/** Wait until the drawer has painted and the bar shows this position. */
async function atPosition(text: string): Promise<void> {
  await waitFor(() => expect(position()).toBe(text));
}

/**
 * Wait until THIS card's own detail fetch has landed and the write row has
 * armed. The queue refuses every mutation before that (useLeadQueue's
 * confirmedId gate), so acting earlier asserts against a no-op.
 */
async function armed(): Promise<void> {
  await waitFor(() => expect(screen.getByText('Log call')).toBeEnabled());
}

/** The bar shows this position AND the card is armed for a write. */
async function atCard(text: string): Promise<void> {
  await atPosition(text);
  await armed();
}

/** The bar prints "· <reason>", so identify the current card by its reason. */
function expectCurrentReason(reason: string): void {
  expect(screen.getByText(new RegExp(reason))).toBeInTheDocument();
}

const press = (key: string): void => {
  fireEvent.keyDown(document, { key });
};

/** Summary row value for a labelled outcome ("Calls logged" → "1"). */
function summaryCount(label: string): string | null {
  return screen.getByText(label).nextElementSibling?.textContent ?? null;
}

/** Type a draft into the drawer's reply composer. */
function typeReply(field: 'Email subject' | 'Email body', value: string): void {
  fireEvent.change(screen.getByLabelText(field), { target: { value } });
}

const draftValue = (field: 'Email subject' | 'Email body'): string =>
  (screen.getByLabelText(field) as HTMLTextAreaElement | HTMLInputElement).value;

// --------------------------------------------------------- harness (real hook)

/** Module-level so the hook's useCallback identity stays stable across renders. */
const NO_REFETCH = async (): Promise<void> => {};
const RELOAD_BOARD = async (): Promise<void> => {
  await fetch('/api/v1/admin/leads/board?temp=');
};

/**
 * Renders the queue against a REAL useLeadMutations instance, so the refetch
 * behaviour and the request bodies under test are the hook's own, not a fake's.
 */
function QueueHarness({
  onChanged,
  onExit,
}: {
  onChanged: () => Promise<void>;
  onExit: () => void;
}): ReactElement | null {
  const mutations = useLeadMutations(onChanged);
  return <LeadQueue queue={QUEUE} mutations={mutations} onExit={onExit} />;
}

// -------------------------------------------------------------------- tests

beforeEach(() => {
  fetchCalls = [];
  clearDetailCache();
  vi.stubGlobal('fetch', vi.fn(fetchStub));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LeadQueue — a successful action advances exactly one position', () => {
  it('logs the call, moves 1 → 2, and records the outcome on the lead it acted on', async () => {
    const mutations = fakeMutations();
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);

    await atCard('1 / 3');
    expectCurrentReason(REASON_A);

    press('c');

    await atPosition('2 / 3');
    expect(mutations.logTouch).toHaveBeenCalledTimes(1);
    expect(mutations.logTouch).toHaveBeenCalledWith('lead-a', 'call');
    expectCurrentReason(REASON_B);

    // Step back: the worked lead now carries its outcome chip.
    press('k');
    await atPosition('1 / 3');
    expect(screen.getByText('Call logged')).toBeInTheDocument();
    // Stepping back must not re-fire the mutation.
    expect(mutations.logTouch).toHaveBeenCalledTimes(1);
  });

  it('logs a text on T and advances', async () => {
    const mutations = fakeMutations();
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('t');

    await atPosition('2 / 3');
    expect(mutations.logTouch).toHaveBeenCalledWith('lead-a', 'text');
  });
});

describe('LeadQueue — the confirmation gate (no write before the card is on screen)', () => {
  it('ignores an action key until this lead is confirmed, then honours the same key', async () => {
    const gate = deferred<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = urlOf(input);
        // Hold lead-a's detail open: the drawer paints its spinner, the queue
        // stays disarmed. lead-b/lead-c answer normally so the prefetch is real.
        if (url.endsWith('/lead-a')) {
          record(url, init);
          return gate.promise;
        }
        return fetchStub(input, init);
      }),
    );

    const mutations = fakeMutations();
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);
    await screen.findByText('Loading…');

    press('c');
    press('t');
    press('z');

    expect(mutations.logTouch).not.toHaveBeenCalled();
    expect(mutations.patchLead).not.toHaveBeenCalled();

    await act(async () => {
      gate.resolve(jsonResponse({ success: true, data: detailFor('lead-a') }));
    });
    await atCard('1 / 3');

    press('c');
    await atPosition('2 / 3');
    expect(mutations.logTouch).toHaveBeenCalledTimes(1);
    expect(mutations.logTouch).toHaveBeenCalledWith('lead-a', 'call');
  });
});

describe('LeadQueue — the failure invariant (a failed action never advances)', () => {
  it('holds position and shows the error when logTouch resolves false', async () => {
    const mutations = fakeMutations({
      logTouch: vi.fn<LeadMutations['logTouch']>().mockResolvedValue(false),
    });
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('c');

    await screen.findByText('Could not log the call — nothing was saved.');
    expect(position()).toBe('1 / 3');
    expectCurrentReason(REASON_A);
    // Nothing was recorded, so no outcome chip may appear.
    expect(screen.queryByText('Call logged')).not.toBeInTheDocument();
  });

  it('keeps the half-typed reply on screen when the action fails', async () => {
    const mutations = fakeMutations({
      logTouch: vi.fn<LeadMutations['logTouch']>().mockResolvedValue(false),
    });
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);
    await atCard('1 / 3');

    const draft = 'Hi Ana — quick one before the 4th, are you still 40 people?';
    typeReply('Email body', draft);

    press('c');

    await screen.findByText('Could not log the call — nothing was saved.');
    // A failure must cost the operator neither their place nor their work: if
    // the queue advanced, the composer would remount (key={lead.id}) and this
    // draft would be gone.
    expect(position()).toBe('1 / 3');
    expect(draftValue('Email body')).toBe(draft);
  });

  it('holds position and shows the error when the snooze patch resolves false', async () => {
    const mutations = fakeMutations({
      patchLead: vi.fn<LeadMutations['patchLead']>().mockResolvedValue(false),
    });
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('z');

    await screen.findByText('Could not snooze this lead — nothing was saved.');
    expect(position()).toBe('1 / 3');
    expectCurrentReason(REASON_A);
    expect(screen.queryByText('Snoozed 3d')).not.toBeInTheDocument();
  });

  it('holds position, keeps the reason row open, and errors when the Lost move resolves false', async () => {
    const mutations = fakeMutations({
      moveStage: vi.fn<LeadMutations['moveStage']>().mockResolvedValue(false),
    });
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('x');
    await screen.findByText('Why was it lost?');
    press('1');

    await screen.findByText('Could not mark this lead Lost — it may have moved already.');
    expect(mutations.moveStage).toHaveBeenCalledTimes(1);
    expect(position()).toBe('1 / 3');
    expectCurrentReason(REASON_A);
    // The operator's half-finished Lost stays on screen so they can retry.
    expect(screen.getByText('Why was it lost?')).toBeInTheDocument();
    expect(screen.queryByText('Marked Lost')).not.toBeInTheDocument();
  });

  it('lets the operator retry after a failure and then advances', async () => {
    const logTouch = vi
      .fn<LeadMutations['logTouch']>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const mutations = fakeMutations({ logTouch });
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('c');
    await screen.findByText('Could not log the call — nothing was saved.');

    press('c');
    await atPosition('2 / 3');
    expect(logTouch).toHaveBeenCalledTimes(2);
    // The error clears once the retry lands.
    expect(
      screen.queryByText('Could not log the call — nothing was saved.'),
    ).not.toBeInTheDocument();
  });

  it('clears the failure banner when the operator skips on to the next card', async () => {
    const mutations = fakeMutations({
      logTouch: vi.fn<LeadMutations['logTouch']>().mockResolvedValue(false),
    });
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('c');
    await screen.findByText('Could not log the call — nothing was saved.');

    press('j');

    // A red line held over from the previous lead makes the operator distrust
    // a card that is perfectly fine.
    await atPosition('2 / 3');
    expect(
      screen.queryByText('Could not log the call — nothing was saved.'),
    ).not.toBeInTheDocument();
    expectCurrentReason(REASON_B);
  });

  it('clears the failure banner when the operator steps back', async () => {
    const mutations = fakeMutations({
      logTouch: vi.fn<LeadMutations['logTouch']>().mockResolvedValue(false),
    });
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('c');
    await screen.findByText('Could not log the call — nothing was saved.');

    press('k');

    await waitFor(() =>
      expect(
        screen.queryByText('Could not log the call — nothing was saved.'),
      ).not.toBeInTheDocument(),
    );
    // Back from the first card is a no-op move, so the card itself is unchanged.
    expect(position()).toBe('1 / 3');
  });
});

describe('LeadQueue — the write payloads that reach the server', () => {
  it('snoozes with source "queue" and an ISO timestamp ~3 days out', async () => {
    const before = Date.now();
    render(<QueueHarness onChanged={NO_REFETCH} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('z');
    await atPosition('2 / 3');

    // Asserted on the wire: a `source` that never survives JSON.stringify is
    // not an audit trail, and a spy's arguments cannot tell the difference.
    const bodies = writeBodies('/api/v1/admin/leads/lead-a');
    expect(bodies).toHaveLength(1);
    const [body] = bodies;
    expect(body.source).toBe('queue');

    const until = body.snoozedUntil;
    expect(typeof until).toBe('string');
    // Round-trips as a real ISO instant, not a local-format string.
    expect(new Date(until as string).toISOString()).toBe(until);
    const deltaDays = (new Date(until as string).getTime() - before) / 86_400_000;
    expect(deltaDays).toBeGreaterThan(2.99);
    expect(deltaDays).toBeLessThan(3.01);
  });

  it('marks Lost with via "queue" and the structured reason picked by number', async () => {
    render(<QueueHarness onChanged={NO_REFETCH} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('x');
    await screen.findByText('Why was it lost?');
    press('1');

    await atPosition('2 / 3');
    expect(writeBodies('/api/v1/admin/leads/lead-a/stage')).toEqual([
      { stage: 'LOST', lostReason: 'No response', via: 'queue' },
    ]);
    // The reason row closes behind a successful move.
    expect(screen.queryByText('Why was it lost?')).not.toBeInTheDocument();
  });
});

describe('LeadQueue — the reply hand-off', () => {
  it('advances on a successful send and counts it as a reply in the summary', async () => {
    const mutations = fakeMutations();
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);
    await atCard('1 / 3');

    typeReply('Email subject', 'Your Fourth of July boat party');
    typeReply('Email body', 'Hi Ana — here is the quote we talked about.');
    fireEvent.click(screen.getByText('Send email'));

    // The composer owns the send; the queue only records it and moves on.
    await atPosition('2 / 3');
    expect(writeBodies('/api/v1/admin/leads/lead-a/reply')).toEqual([
      {
        subject: 'Your Fourth of July boat party',
        body: 'Hi Ana — here is the quote we talked about.',
      },
    ]);
    expect(mutations.logTouch).not.toHaveBeenCalled();
    expectCurrentReason(REASON_B);

    press('j');
    await atPosition('3 / 3');
    press('j');
    await screen.findByText('Queue clear');

    expect(summaryCount('Replies sent')).toBe('1');
    expect(screen.getByText(/leads worked/).textContent).toBe('1 of 3 leads worked.');
  });
});

describe('LeadQueue — the no-refetch guarantee', () => {
  // Scope note: this proves the *hook's* behaviour given a no-op `onChanged`.
  // That /admin/leads actually hands the queue such an instance in production
  // is a separate claim, covered by the page-level test — not duplicated here.
  it('works three leads through the real hook without ever reloading the board', async () => {
    render(<QueueHarness onChanged={NO_REFETCH} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('c'); // POST /touch
    await atCard('2 / 3');

    press('z'); // PATCH /leads/:id
    await atCard('3 / 3');

    press('x');
    await screen.findByText('Why was it lost?');
    press('1'); // PATCH /leads/:id/stage
    await screen.findByText('Queue clear');

    // The writes really happened — so the zero below is not vacuous.
    expect(writeBodies('/api/v1/admin/leads/lead-a/touch')).toEqual([{ channel: 'call' }]);
    expect(urlsMatching('/stage')).toEqual(['/api/v1/admin/leads/lead-c/stage']);
    expect(writeBodies('/api/v1/admin/leads/lead-b')).toHaveLength(1);

    // The whole point: no 500-card board aggregation during the sitting.
    expect(urlsMatching('/leads/board')).toEqual([]);
  });

  it('confirms a normal (refetching) instance WOULD reload the board on the same action', async () => {
    render(<QueueHarness onChanged={RELOAD_BOARD} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('c');
    await atPosition('2 / 3');

    expect(urlsMatching('/leads/board').length).toBeGreaterThan(0);
  });

  it('does not reload the board when an action fails either', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = urlOf(input);
        if (url.endsWith('/touch')) {
          record(url, init);
          return jsonResponse({ success: false }, false);
        }
        return fetchStub(input, init);
      }),
    );

    render(<QueueHarness onChanged={RELOAD_BOARD} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('c');
    await screen.findByText('Could not log the call — nothing was saved.');

    expect(position()).toBe('1 / 3');
    expect(urlsMatching('/leads/board')).toEqual([]);
  });
});

describe('LeadQueue — end of the sitting', () => {
  it('shows the summary with worked-vs-skipped counts and exits via "Back to the board"', async () => {
    const onExit = vi.fn();
    const mutations = fakeMutations();
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={onExit} />);
    await atCard('1 / 3');

    press('j'); // skip lead-a
    await atCard('2 / 3');

    press('c'); // call on lead-b
    await atCard('3 / 3');

    press('z'); // snooze lead-c → queue is clear
    await screen.findByText('Queue clear');

    expect(screen.getByText(/leads worked/).textContent).toBe('2 of 3 leads worked.');
    expect(summaryCount('Calls logged')).toBe('1');
    expect(summaryCount('Snoozed')).toBe('1');
    expect(summaryCount('Skipped')).toBe('1');
    expect(screen.queryByText('Replies sent')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Back to the board'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('keeps a recorded outcome when the operator steps back over it and skips forward again', async () => {
    const mutations = fakeMutations();
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('c'); // lead-a → called
    await atCard('2 / 3');

    press('k'); // back onto the lead we just worked
    await atPosition('1 / 3');
    expect(screen.getByText('Call logged')).toBeInTheDocument();

    press('j'); // forward past it — a skip must NOT overwrite the call
    await atCard('2 / 3');

    press('j'); // skip lead-b for real
    await atCard('3 / 3');

    press('z'); // snooze lead-c → queue is clear
    await screen.findByText('Queue clear');

    // Without the don't-clobber guard lead-a reads "skipped": the Calls-logged
    // row vanishes, Skipped reads 2, and the sitting under-reports its work.
    expect(summaryCount('Calls logged')).toBe('1');
    expect(summaryCount('Skipped')).toBe('1');
    expect(summaryCount('Snoozed')).toBe('1');
    expect(screen.getByText(/leads worked/).textContent).toBe('2 of 3 leads worked.');
  });

  it('calls onExit when the operator stops early with "Done for now"', async () => {
    const onExit = vi.fn();
    render(<LeadQueue queue={QUEUE} mutations={fakeMutations()} onExit={onExit} />);
    await atCard('1 / 3');

    fireEvent.click(screen.getByText('Done for now'));

    expect(onExit).toHaveBeenCalledTimes(1);
    // Exiting is the parent's business — the queue must not write anything.
    expect(urlsMatching('/touch')).toEqual([]);
  });
});

describe('LeadQueue — double-fire guard', () => {
  it('ignores further action keys while a mutation is still in flight', async () => {
    const gate = deferred<boolean>();
    const logTouch = vi.fn<LeadMutations['logTouch']>().mockReturnValue(gate.promise);
    const mutations = fakeMutations({ logTouch });
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);
    await atCard('1 / 3');

    press('c');
    // Anchor on the dispatched mutation, not on the "Saving…" label. The label
    // is a transient render, and waiting for it was this test's only real
    // dependency on scheduling latency — it timed out on a contended CI runner
    // even though the guard itself was working. The call count IS the contract.
    await waitFor(() => expect(logTouch).toHaveBeenCalledTimes(1));
    // The bar still has to show the write is in flight — kept as coverage, but
    // retried instead of raced.
    await waitFor(() => expect(screen.getByText('Saving…')).toBeInTheDocument());

    // Same key again, then a different write key, then all the way down the
    // Lost path — X only opens the reason row, so the digit is what would
    // actually reach moveStage if the busy guard were missing.
    press('c');
    press('t');
    press('x');
    press('1');

    expect(logTouch).toHaveBeenCalledTimes(1);
    expect(mutations.patchLead).not.toHaveBeenCalled();
    expect(mutations.moveStage).not.toHaveBeenCalled();
    expect(position()).toBe('1 / 3');

    await act(async () => {
      gate.resolve(true);
    });

    await atPosition('2 / 3');
    expect(logTouch).toHaveBeenCalledTimes(1);
  });

  it('ignores a held-down key (auto-repeat) so one press cannot burn a run of leads', async () => {
    const mutations = fakeMutations();
    render(<LeadQueue queue={QUEUE} mutations={mutations} onExit={vi.fn()} />);
    await atCard('1 / 3');

    fireEvent.keyDown(document, { key: 'c', repeat: true });
    fireEvent.keyDown(document, { key: 'c', repeat: true });

    expect(mutations.logTouch).not.toHaveBeenCalled();
    expect(position()).toBe('1 / 3');
  });
});
