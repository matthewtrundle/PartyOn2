/**
 * /admin/leads PAGE wiring — the production hook-up between the board and the
 * work queue, rendered through the real default export of `page.tsx`.
 *
 * This file exists because the no-refetch guarantee was, until now, only ever
 * proven against a harness that declared its own `NO_REFETCH` inside the test
 * file. That proves `useLeadMutations` honours a no-op `onChanged` — it proves
 * nothing about which instance the page actually hands the queue. Swapping the
 * production line
 *
 *     const queueMutations = useLeadMutations(NO_REFETCH);
 *   → const queueMutations = useLeadMutations(load);
 *
 * (the exact regression: the queue silently inherits the board's refetching
 * instance) left the whole suite green. That is what these tests close.
 *
 * The guarantee is a PAIR, and both halves are asserted here:
 *   1. Zero `/leads/board` GETs for the entire sitting, while the mutation
 *      endpoints demonstrably fire — so the zero is never vacuous.
 *   2. Exactly one `/leads/board` GET on exit — the single reconcile. Without
 *      this half, a page that simply stopped reloading the board at all would
 *      also pass, and the operator would return to stale cards.
 *
 * That GET matters: it re-reads up to 500 leads and runs sweepEnrollSubmitted
 * (a write). A 30-action sitting firing 30 of them is the bug being prevented.
 *
 * The last test covers the other half of the page contract — the queue's write
 * actions stay disarmed until the current lead's own detail fetch resolves,
 * exercised through the page rather than a component harness. It is scoped to
 * the FIRST lead of a sitting deliberately: leads 2..N are not gated in the
 * code as it stands (LeadDrawer's `[confirmed, leadId]` effect re-runs on the
 * id change while `confirmed` still holds the previous lead's `true`, so it
 * confirms the incoming lead before that lead's GET resolves). Asserting the
 * correct behaviour there would fail against today's source, so it is reported
 * rather than encoded here — do not "fix" this file to match the bug.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup, within } from '@testing-library/react';
import type { BoardData, BoardLead } from '@/lib/leads/board-types';
import type { PipelineStage } from '@/lib/leads/pipeline-types';
import LeadsPage from '../page';
import { clearDetailCache } from '../_components/lead-detail-cache';
import type { LeadDetail } from '../_components/drawer-types';

// ------------------------------------------------------------ next/navigation

const routerReplace = vi.fn();
/** Stable instance — the page has an effect keyed on the search params. */
const SEARCH_PARAMS = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, push: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => SEARCH_PARAMS,
  usePathname: () => '/admin/leads',
}));

// ---------------------------------------------------------------- fixtures

/** Board-card factory — same shape the work-queue unit test uses. */
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

const card = (over: Partial<BoardLead>): BoardLead => ({ ...base, ...over });

/**
 * Three queue-eligible non-Premier cards (the default 'direct' lane) plus one
 * Premier card that lane must exclude. Tiers are distinct and undated, so the
 * order is deterministic: unanswered → call-now → warm.
 */
const CARDS: readonly BoardLead[] = [
  card({
    id: 'lead-a',
    name: 'Ana Alpha',
    needsResponse: true,
    nextAction: { kind: 'REPLY', reason: 'Unanswered — reply now' },
  }),
  card({
    id: 'lead-b',
    name: 'Ben Bravo',
    nextAction: { kind: 'CALL', reason: 'Hot lead — call' },
  }),
  card({
    id: 'lead-c',
    name: 'Cara Charlie',
    nextAction: { kind: 'EMAIL', reason: 'Nurture' },
  }),
  card({
    id: 'lead-p',
    name: 'Pat Premier',
    isPremier: true,
    nextAction: { kind: 'EMAIL', reason: 'Premier follow-up' },
  }),
];

const NAMES: Record<string, [string, string]> = {
  'lead-a': ['Ana', 'Alpha'],
  'lead-b': ['Ben', 'Bravo'],
  'lead-c': ['Cara', 'Charlie'],
  'lead-p': ['Pat', 'Premier'],
};

const emptyColumns = (): Record<PipelineStage, BoardLead[]> => ({
  NEW: [],
  CONTACTED: [],
  QUALIFIED: [],
  QUOTE_SENT: [],
  WON: [],
  LOST: [],
});

/** A full BoardData envelope, exactly as GET /leads/board returns it. */
function boardData(): BoardData {
  const columns = emptyColumns();
  columns.NEW = [...CARDS];
  return {
    columns,
    closedCounts: { won: 0, lost: 0 },
    tray: [],
    kpis: { newThisWeek: 4, hot: 0, needsResponse: 1, won30d: 0, lost30d: 0, conversionPct: null },
    generatedAt: '2026-07-28T12:00:00.000Z',
  };
}

/** Minimal but well-formed GET /api/v1/admin/leads/[id] payload. */
function detailFor(id: string): LeadDetail {
  const [firstName, lastName] = NAMES[id] ?? ['Test', 'Lead'];
  return {
    lead: {
      id,
      email: `${id}@example.com`,
      phone: null,
      firstName,
      lastName,
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
}

let fetchCalls: FetchCall[] = [];
/** Per-lead detail GET counter — lets a test hold only the drawer's revalidate. */
let detailGets: Map<string, number>;
/** Optional hold on a detail response: return a promise to stall it. */
let holdDetail: ((id: string, nth: number) => Promise<void> | null) | null = null;

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as unknown as Response;
}

/** Routes every URL the page + queue can hit and records each call. */
async function fetchStub(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.toString() : String(input);
  const method = (init?.method ?? 'GET').toUpperCase();
  fetchCalls.push({ url, method });

  if (url.includes('/leads/board')) return jsonResponse({ success: true, data: boardData() });
  if (url.endsWith('/touch')) return jsonResponse({ success: true, data: { logged: true } });
  if (url.endsWith('/stage')) return jsonResponse({ success: true, data: { moved: true } });
  if (method === 'PATCH') return jsonResponse({ success: true, data: { updated: true } });

  const id = url.split('?')[0].split('/').pop() ?? '';
  const nth = (detailGets.get(id) ?? 0) + 1;
  detailGets.set(id, nth);
  const hold = holdDetail?.(id, nth);
  if (hold) await hold;
  return jsonResponse({ success: true, data: detailFor(id) });
}

const callsMatching = (fragment: string): FetchCall[] =>
  fetchCalls.filter((c) => c.url.includes(fragment));

const boardGets = (): FetchCall[] => callsMatching('/leads/board');

/** Index of the last call whose URL contains `fragment`, or -1. */
const lastIndexMatching = (fragment: string): number =>
  fetchCalls.map((c) => c.url).reduce((last, url, i) => (url.includes(fragment) ? i : last), -1);

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// ------------------------------------------------------------------ helpers

/** The drawer is portaled; scope queue queries to its dialog. */
const sheet = (): ReturnType<typeof within> => within(screen.getByRole('dialog'));

const startButton = (): HTMLElement => screen.getByRole('button', { name: 'Work the queue' });
const logCallButton = (): HTMLElement => sheet().getByRole('button', { name: /Log call/ });

/** "2 / 3" — the position chip in the queue bar. */
const position = (): string => sheet().getByText(/^\d+ \/ \d+$/).textContent ?? '';

const atPosition = async (text: string): Promise<void> => {
  await waitFor(() => expect(position()).toBe(text));
};

/** Wait until THIS lead's detail has landed and the write actions are armed. */
const armed = async (): Promise<void> => {
  await waitFor(() => expect(logCallButton()).toBeEnabled());
};

const press = (key: string): void => {
  fireEvent.keyDown(document, { key });
};

/** Render the page and wait for the first board load to paint. */
async function renderBoard(): Promise<void> {
  render(<LeadsPage />);
  await waitFor(() => expect(startButton()).toBeEnabled());
}

// -------------------------------------------------------------------- setup

beforeEach(() => {
  fetchCalls = [];
  detailGets = new Map();
  holdDetail = null;
  clearDetailCache();
  routerReplace.mockClear();
  vi.stubGlobal('fetch', vi.fn(fetchStub));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// -------------------------------------------------------------------- tests

describe('/admin/leads page — the queue gets a non-refetching mutations instance', () => {
  it('works two leads with zero board reloads, then reconciles exactly once on exit', async () => {
    await renderBoard();

    // Baseline: the page's own initial load, and nothing else.
    expect(boardGets()).toHaveLength(1);

    fireEvent.click(startButton());
    await atPosition('1 / 3');
    await armed();

    press('c'); // POST /leads/lead-a/touch
    await atPosition('2 / 3');
    await armed();

    press('z'); // PATCH /leads/lead-b (snooze)
    await atPosition('3 / 3');

    // The writes really happened, so the zero below is not vacuous.
    expect(callsMatching('/leads/lead-a/touch').map((c) => c.method)).toEqual(['POST']);
    expect(
      fetchCalls.some((c) => c.method === 'PATCH' && c.url.endsWith('/leads/lead-b')),
    ).toBe(true);

    // THE GUARANTEE: not one 500-card board aggregation during the sitting.
    expect(boardGets()).toHaveLength(1);

    // ...and the other half — exit reconciles the board exactly once.
    fireEvent.click(sheet().getByRole('button', { name: 'Done for now' }));
    await waitFor(() => expect(boardGets()).toHaveLength(2));

    // That reconcile is the LAST board read, after the writes — not an
    // incidental refetch that happened to land mid-sitting.
    expect(lastIndexMatching('/leads/board')).toBeGreaterThan(lastIndexMatching('/leads/lead-b'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // The queue is a mode, not a route — it never rewrites ?lead=. Wiring it
    // through openDrawer/closeDrawer instead would drag closeDrawer's own
    // board load in behind it, on top of the reconcile.
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('does not reload the board when a queue action fails either', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === 'string' ? input : String(input);
        if (url.endsWith('/touch')) {
          fetchCalls.push({ url, method: 'POST' });
          return jsonResponse({ success: false }, false);
        }
        return fetchStub(input, init);
      }),
    );

    await renderBoard();
    fireEvent.click(startButton());
    await atPosition('1 / 3');
    await armed();

    press('c');
    await sheet().findByText('Could not log the call — nothing was saved.');

    expect(position()).toBe('1 / 3');
    expect(boardGets()).toHaveLength(1);
  });

  it('serves the lane the launcher is set to, from the board payload it already loaded', async () => {
    await renderBoard();

    const lane = screen.getByLabelText('Queue lane');
    expect(within(lane).getByRole('option', { name: 'Ads & Direct (3)' })).toBeInTheDocument();
    expect(within(lane).getByRole('option', { name: 'Premier (1)' })).toBeInTheDocument();
    expect(within(lane).getByRole('option', { name: 'Everything (4)' })).toBeInTheDocument();

    fireEvent.change(lane, { target: { value: 'premier' } });
    fireEvent.click(startButton());

    await atPosition('1 / 1');
    expect(sheet().getByText(/Premier follow-up/)).toBeInTheDocument();
    // Switching lanes is a client-side derivation — still no second board GET.
    expect(boardGets()).toHaveLength(1);
  });
});

describe('/admin/leads page — queue actions stay disarmed until the lead is on screen', () => {
  /**
   * The cold-cache window at the very start of a sitting: the queue mounts, the
   * keyboard goes live, and the first lead's detail has not come back. Nothing
   * has painted, so a 'c' here logs a call against a card the operator has never
   * seen. `act()`'s confirmedId gate is what stops it.
   *
   * NOTE: this covers the FIRST lead only. Leads 2..N are NOT gated today — see
   * the drawer's stale-`confirmed` effect, reported separately.
   */
  it('ignores C while the first lead is still loading, and fires it once confirmed', async () => {
    const gate = deferred<void>();
    holdDetail = (id, nth) => (id === 'lead-a' && nth === 1 ? gate.promise : null);

    await renderBoard();
    fireEvent.click(startButton());

    // Drawer is open but empty — no bar, no card, detail still in flight.
    await screen.findByRole('dialog');
    expect(sheet().getByText('Loading…')).toBeInTheDocument();
    expect(sheet().queryByRole('button', { name: /Log call/ })).not.toBeInTheDocument();

    press('c');
    press('z');
    press('x');
    press('1');
    await act(async () => {});

    expect(callsMatching('/touch')).toHaveLength(0);
    expect(callsMatching('/stage')).toHaveLength(0);
    expect(fetchCalls.some((c) => c.method === 'PATCH')).toBe(false);

    await act(async () => {
      gate.resolve();
    });
    await atPosition('1 / 3');

    // 'x' only opened the reason row (local state); the '1' behind it never wrote.
    expect(sheet().getByText('Why was it lost?')).toBeInTheDocument();
    fireEvent.click(sheet().getByRole('button', { name: 'Cancel' }));
    await armed();

    // Same keystroke, now that the card is actually on screen.
    press('c');
    await atPosition('2 / 3');
    expect(callsMatching('/leads/lead-a/touch').map((c) => c.method)).toEqual(['POST']);
    expect(boardGets()).toHaveLength(1);
  });
});
