/**
 * The focus-mode keyboard map, proved against a real <LeadQueue> render.
 *
 * This file protects the three guards that stand between a one-keystroke work
 * queue and silent data damage:
 *
 *  1. The typing guard — a keystroke that lands in a text field must never
 *     reach the shortcut map. Without it, typing "call me back" into a reply
 *     logs a call (C), logs a text (T), snoozes (Z), opens mark-Lost (X) and
 *     skips the lead (J) mid-sentence.
 *  2. The Escape guard — Escape while a transient layer is open (the help sheet
 *     or the mark-Lost reason row) closes only that layer, and Escape inside a
 *     field the operator has typed into only blurs it. The drawer's BottomSheet
 *     also listens for Escape on the document, so the queue's capture-phase
 *     listener has to intercept it first or the operator gets thrown out of the
 *     queue and loses a half-typed reply.
 *  3. The confirmation gate — no destructive key fires until THIS lead's own
 *     detail fetch has landed. A prefetched card paints instantly and looks
 *     completely ready, so without the gate an operator can log a call against
 *     a card whose data is still in the air.
 *
 * It also pins the movement keys (J/K/arrows, including hold-to-scan), R
 * (focus the reply body), the modifier-chord and auto-repeat exclusions on the
 * destructive keys, the digit-picks-a-reason path with its bounds (which must
 * send the exact LOST_REASONS string plus via:'queue' for the audit trail), and
 * listener teardown on unmount.
 *
 * Every guard here is paired with a positive control, because "nothing
 * happened" is the passing state of both a working guard and a dead keyboard.
 *
 * Rendering the real container — not the hook in isolation — is deliberate:
 * the interesting failures live in how the queue's listeners interact with the
 * portaled BottomSheet and with the drawer's own form fields.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { BoardLead } from '@/lib/leads/board-types';
import { LOST_REASONS } from '@/lib/leads/work-queue';
import LeadQueue from '../lead-queue';
import { clearDetailCache, writeDetail } from '../lead-detail-cache';
import type { LeadMutations } from '../use-lead-mutations';
import type { LeadDetail } from '../drawer-types';

/** A board card in the queue-eligible shape (nextAction non-null). */
const base: BoardLead = {
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

const card = (over: Partial<BoardLead>): BoardLead => ({ ...base, ...over });

/** Minimal well-formed detail payload for GET /api/v1/admin/leads/[id]. */
function detailFor(id: string): LeadDetail {
  return {
    lead: {
      id,
      email: `${id}@example.com`,
      phone: null,
      firstName: 'Test',
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

/** The response every GET (drawer or prefetch) answers with. */
function detailResponse(input: RequestInfo | URL): Response {
  const match = /\/api\/v1\/admin\/leads\/([^/?]+)/.exec(String(input));
  const body = { success: true, data: detailFor(match ? match[1] : 'lead-1') };
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

/** Every GET the drawer or the prefetch makes answers with that lead's detail. */
function stubFetch(): void {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(detailResponse(input))));
}

interface PendingFetch {
  /** Let every request — already made or still to come — answer. */
  release: () => Promise<void>;
}

/**
 * Same payloads, but nothing answers until `release()`. This is the only way to
 * hold the drawer in the state the confirmation gate exists for: a card fully
 * painted from the prefetch cache while its own revalidate is still in flight.
 */
function stubPendingFetch(): PendingFetch {
  let open = (): void => undefined;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => gate.then(() => detailResponse(input))),
  );
  return {
    release: async (): Promise<void> => {
      await act(async () => {
        open();
        await gate;
      });
    },
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
  const mutations: LeadMutations = { mutating: false, moveStage, patchLead, logTouch };
  return { mutations, moveStage, patchLead, logTouch };
}

/** No mutation of any kind fired. */
function expectNoWrites(f: Fakes): void {
  expect(f.logTouch).not.toHaveBeenCalled();
  expect(f.patchLead).not.toHaveBeenCalled();
  expect(f.moveStage).not.toHaveBeenCalled();
}

const QUEUE_SIZE = 8;

interface Harness extends Fakes {
  onExit: ReturnType<typeof vi.fn>;
  unmount: () => void;
}

/** Mount focus mode over a queue of `size` cards. Waits for nothing. */
function mountQueue(size: number): Harness {
  const fakes = makeMutations();
  const onExit = vi.fn();
  const queue: BoardLead[] = Array.from({ length: size }, (_, i) =>
    card({ id: `lead-${i + 1}`, name: `Lead ${i + 1}` }),
  );
  const element: ReactElement = (
    <LeadQueue queue={queue} mutations={fakes.mutations} onExit={onExit} />
  );
  const { unmount } = render(element);
  return { ...fakes, onExit, unmount };
}

/**
 * Block until the CURRENT card's own detail has landed, which is what arms the
 * write keys. Painting is not enough: the bar keeps its actions disabled (and
 * says so) until the fetch for this exact lead resolves.
 */
async function waitUntilArmed(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /^Log call/ })).toBeEnabled();
  });
  expect(screen.queryByText(/Loading this lead/)).not.toBeInTheDocument();
}

/** Render focus mode over an 8-card queue and wait for the first card to arm. */
async function renderQueue(size: number = QUEUE_SIZE): Promise<Harness> {
  const h = mountQueue(size);
  // Painting and arming are two separate awaits on purpose — the cache is cold
  // here so they land together, but only the second one makes the keys live.
  await screen.findByText(`1 / ${size}`);
  await waitUntilArmed();
  return h;
}

/**
 * Escape has to travel a real capture→bubble path to prove the guard, so it is
 * dispatched on an element *inside* the document rather than on the document
 * itself. Dispatching straight at the document would run the queue's capture
 * listener and the BottomSheet's bubble listener as same-target siblings, where
 * stopPropagation() cannot separate them — a test artifact, not the browser.
 */
function pressEscape(): void {
  fireEvent.keyDown(document.body, { key: 'Escape' });
}

beforeEach(() => {
  clearDetailCache();
  stubFetch();
});

afterEach(() => {
  // Unmount BEFORE restoring fetch. Vitest runs afterEach hooks last-registered
  // first, so this one beats RTL's auto-cleanup and the tree comes down while
  // the stub is still installed.
  //
  // It does NOT "flush" the pending prefetch — unmount runs effect *cleanups*,
  // never effect bodies. What the ordering buys is that work still in flight (a
  // resolving mutation, a drawer fetch) can no longer land a state update,
  // advance the index and re-run the prefetch effect after the unstub has put
  // setup.ts's bare `vi.fn()` back as `fetch`: that returns undefined, and
  // prefetchDetail calls `.then()` on it. Nothing in this file currently lands
  // in that window (verified — the suite is green with the cleanup removed), so
  // this is cheap insurance for the next test, not a proven guard.
  cleanup();
  vi.unstubAllGlobals();
});

describe('LeadQueue keyboard map', () => {
  it('advances with j / ArrowRight and comes back with k / ArrowLeft', async () => {
    const h = await renderQueue();

    for (let i = 0; i < 5; i += 1) fireEvent.keyDown(document, { key: 'j' });
    expect(await screen.findByText(`6 / ${QUEUE_SIZE}`)).toBeInTheDocument();

    for (let i = 0; i < 5; i += 1) fireEvent.keyDown(document, { key: 'k' });
    expect(await screen.findByText(`1 / ${QUEUE_SIZE}`)).toBeInTheDocument();

    // Movement records no outcome server-side — skipping is local bookkeeping.
    expectNoWrites(h);
  });

  it('treats the arrow keys as aliases for j and k', async () => {
    await renderQueue();

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(await screen.findByText(`3 / ${QUEUE_SIZE}`)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(await screen.findByText(`2 / ${QUEUE_SIZE}`)).toBeInTheDocument();
  });

  it('will not step back past the first card', async () => {
    await renderQueue();
    fireEvent.keyDown(document, { key: 'k' });
    fireEvent.keyDown(document, { key: 'k' });
    expect(await screen.findByText(`1 / ${QUEUE_SIZE}`)).toBeInTheDocument();
  });

  it('toggles the help sheet with ?', async () => {
    await renderQueue();
    expect(screen.queryByText('Keyboard shortcuts')).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: '?' });
    expect(await screen.findByText('Keyboard shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Log a call, then advance')).toBeInTheDocument();
    expect(screen.getByText('Mark Lost — then 1-6 picks the reason')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: '?' });
    await waitFor(() => {
      expect(screen.queryByText('Keyboard shortcuts')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Log a call, then advance')).not.toBeInTheDocument();
  });

  it('Escape closes only the help sheet — the queue survives', async () => {
    const h = await renderQueue();

    fireEvent.keyDown(document, { key: '?' });
    expect(await screen.findByText('Keyboard shortcuts')).toBeInTheDocument();

    pressEscape();

    await waitFor(() => {
      expect(screen.queryByText('Keyboard shortcuts')).not.toBeInTheDocument();
    });
    // Still on the same card, still in focus mode, drawer not dismissed.
    expect(screen.getByText(`1 / ${QUEUE_SIZE}`)).toBeInTheDocument();
    expect(h.onExit).not.toHaveBeenCalled();
  });

  it('r puts the cursor in the reply body', async () => {
    await renderQueue();
    const body = screen.getByLabelText('Email body');
    expect(document.activeElement).not.toBe(body);

    fireEvent.keyDown(document, { key: 'r' });
    expect(document.activeElement).toBe(body);

    // Shifted R is the same shortcut — an operator holding shift still gets it.
    body.blur();
    expect(document.activeElement).not.toBe(body);
    fireEvent.keyDown(document, { key: 'R' });
    expect(document.activeElement).toBe(body);
  });
});

describe('LeadQueue typing guard', () => {
  it('ignores every shortcut typed into the reply body', async () => {
    const h = await renderQueue();
    const body = screen.getByLabelText('Email body');
    body.focus();

    for (const key of ['c', 't', 'z', 'x', 'j']) {
      fireEvent.keyDown(body, { key, target: body });
    }

    // Nothing was written, nothing was opened, and the operator did not move.
    expectNoWrites(h);
    expect(screen.queryByText('Why was it lost?')).not.toBeInTheDocument();
    expect(screen.getByText(`1 / ${QUEUE_SIZE}`)).toBeInTheDocument();
  });

  it('ignores shortcuts typed into a single-line input too', async () => {
    const h = await renderQueue();
    const subject = screen.getByLabelText('Email subject');
    subject.focus();

    for (const key of ['c', 't', 'z', 'x', 'j']) {
      fireEvent.keyDown(subject, { key, target: subject });
    }

    expectNoWrites(h);
    expect(screen.getByText(`1 / ${QUEUE_SIZE}`)).toBeInTheDocument();
  });

  it('ignores shortcuts aimed at the owner select', async () => {
    // A <select> answers to letter keys itself (type-ahead), so the guard has to
    // cover it too — the drawer's owner picker is one Tab from the action row.
    const h = await renderQueue();
    const owner = screen.getByRole('combobox');
    owner.focus();

    for (const key of ['c', 't', 'z', 'x', 'j']) {
      fireEvent.keyDown(owner, { key, target: owner });
    }

    expectNoWrites(h);
    expect(screen.queryByText('Why was it lost?')).not.toBeInTheDocument();
    expect(screen.getByText(`1 / ${QUEUE_SIZE}`)).toBeInTheDocument();
  });

  it('still fires every one of those keys when focus is not in a field', async () => {
    // The guard would be worthless if it were just "nothing ever fires", so each
    // key the loops above suppress is proved to do its real work out here.
    const h = await renderQueue();

    // C — logs a call against this lead, then advances.
    fireEvent.keyDown(document, { key: 'c' });
    await waitFor(() => expect(h.logTouch).toHaveBeenCalledWith('lead-1', 'call'));
    expect(await screen.findByText(`2 / ${QUEUE_SIZE}`)).toBeInTheDocument();

    // T — logs a text against the next lead, then advances.
    await waitUntilArmed();
    fireEvent.keyDown(document, { key: 't' });
    await waitFor(() => expect(h.logTouch).toHaveBeenCalledWith('lead-2', 'text'));
    expect(await screen.findByText(`3 / ${QUEUE_SIZE}`)).toBeInTheDocument();

    // Z — snoozes, then advances.
    await waitUntilArmed();
    fireEvent.keyDown(document, { key: 'z' });
    await waitFor(() =>
      expect(h.patchLead).toHaveBeenCalledWith('lead-3', {
        snoozedUntil: expect.any(String),
        source: 'queue',
      }),
    );
    expect(await screen.findByText(`4 / ${QUEUE_SIZE}`)).toBeInTheDocument();

    // X — opens the reason row. It writes nothing on its own and holds position.
    await waitUntilArmed();
    fireEvent.keyDown(document, { key: 'x' });
    expect(await screen.findByText('Why was it lost?')).toBeInTheDocument();
    expect(h.moveStage).not.toHaveBeenCalled();
    expect(screen.getByText(`4 / ${QUEUE_SIZE}`)).toBeInTheDocument();
    pressEscape();
    await waitFor(() => {
      expect(screen.queryByText('Why was it lost?')).not.toBeInTheDocument();
    });

    // J — advances without writing anything.
    fireEvent.keyDown(document, { key: 'j' });
    expect(await screen.findByText(`5 / ${QUEUE_SIZE}`)).toBeInTheDocument();
    expect(h.logTouch).toHaveBeenCalledTimes(2);
    expect(h.patchLead).toHaveBeenCalledTimes(1);
    expect(h.moveStage).not.toHaveBeenCalled();
  });
});

describe('LeadQueue destructive-key exclusions', () => {
  it('ignores modifier chords so browser shortcuts stay the browser’s', async () => {
    const h = await renderQueue();

    fireEvent.keyDown(document, { key: 'c', metaKey: true });
    fireEvent.keyDown(document, { key: 'c', ctrlKey: true });

    expect(h.logTouch).not.toHaveBeenCalled();
  });

  it('ignores auto-repeat on a write key but allows hold-to-scan on j', async () => {
    const h = await renderQueue();

    fireEvent.keyDown(document, { key: 'c', repeat: true });
    expect(h.logTouch).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'j', repeat: true });
    expect(await screen.findByText(`2 / ${QUEUE_SIZE}`)).toBeInTheDocument();
  });
});

describe('LeadQueue mark-Lost reason row', () => {
  it('x opens the reasons and a digit picks the matching one', async () => {
    const h = await renderQueue();

    fireEvent.keyDown(document, { key: 'x' });
    expect(await screen.findByText('Why was it lost?')).toBeInTheDocument();
    for (const reason of LOST_REASONS) {
      expect(screen.getByRole('button', { name: new RegExp(reason) })).toBeInTheDocument();
    }

    fireEvent.keyDown(document, { key: '2' });

    await waitFor(() => {
      expect(h.moveStage).toHaveBeenCalledWith('lead-1', 'LOST', {
        lostReason: LOST_REASONS[1],
        via: 'queue',
      });
    });
    expect(LOST_REASONS[1]).toBe('Wrong timing');
    // A successful mark-Lost advances to the next card.
    expect(await screen.findByText(`2 / ${QUEUE_SIZE}`)).toBeInTheDocument();
  });

  it('ignores digits outside the reason list', async () => {
    // An out-of-range digit must not fall through to act('lost') with an
    // undefined reason — that writes a Lost row nobody can ever analyse.
    const h = await renderQueue();
    expect(LOST_REASONS.length).toBe(6);

    fireEvent.keyDown(document, { key: 'x' });
    expect(await screen.findByText('Why was it lost?')).toBeInTheDocument();

    for (const key of ['0', '7', '9']) fireEvent.keyDown(document, { key });

    expect(h.moveStage).not.toHaveBeenCalled();
    // Row still open, still on the same card — the keystroke did nothing at all.
    expect(screen.getByText('Why was it lost?')).toBeInTheDocument();
    expect(screen.getByText(`1 / ${QUEUE_SIZE}`)).toBeInTheDocument();

    // The last real reason still works, pinning the bound at exactly the count.
    fireEvent.keyDown(document, { key: String(LOST_REASONS.length) });
    await waitFor(() => {
      expect(h.moveStage).toHaveBeenCalledWith('lead-1', 'LOST', {
        lostReason: LOST_REASONS[LOST_REASONS.length - 1],
        via: 'queue',
      });
    });
    expect(await screen.findByText(`2 / ${QUEUE_SIZE}`)).toBeInTheDocument();
  });

  it('Escape closes the reason row without leaving the queue', async () => {
    const h = await renderQueue();

    fireEvent.keyDown(document, { key: 'x' });
    expect(await screen.findByText('Why was it lost?')).toBeInTheDocument();

    pressEscape();

    await waitFor(() => {
      expect(screen.queryByText('Why was it lost?')).not.toBeInTheDocument();
    });
    // Back to the normal action row, same card, still in focus mode.
    expect(screen.getByRole('button', { name: /^Log call/ })).toBeInTheDocument();
    expect(screen.getByText(`1 / ${QUEUE_SIZE}`)).toBeInTheDocument();
    expect(h.onExit).not.toHaveBeenCalled();
    expect(h.moveStage).not.toHaveBeenCalled();
  });
});

describe('LeadQueue Escape draft guard', () => {
  it('Escape in a half-typed reply keeps the queue, the card and the draft', async () => {
    const h = await renderQueue();
    const body = screen.getByLabelText<HTMLTextAreaElement>('Email body');
    fireEvent.change(body, { target: { value: 'Ringing you this afternoon' } });
    body.focus();

    fireEvent.keyDown(body, { key: 'Escape' });

    // The BottomSheet's own Escape listener never sees the key, so focus mode
    // survives — losing it here costs the operator the words they just typed.
    expect(h.onExit).not.toHaveBeenCalled();
    expect(screen.getByText(`1 / ${QUEUE_SIZE}`)).toBeInTheDocument();
    expect(screen.getByLabelText<HTMLTextAreaElement>('Email body').value).toBe(
      'Ringing you this afternoon',
    );
    // What Escape does instead: drop focus, so the shortcuts come back.
    expect(document.activeElement).not.toBe(body);
  });

  it('Escape in an empty field still leaves the queue', async () => {
    // The guard is scoped to work in progress on purpose. With nothing to lose,
    // Escape stays Escape — otherwise a stray focus traps the operator.
    const h = await renderQueue();
    const notes = screen.getByPlaceholderText('Internal notes — autosaves');
    notes.focus();

    fireEvent.keyDown(notes, { key: 'Escape' });

    expect(h.onExit).toHaveBeenCalledTimes(1);
  });
});

describe('LeadQueue confirmation gate', () => {
  it('fires nothing until this lead’s own detail lands, then fires normally', async () => {
    // The dangerous case: a prefetched card paints instantly and looks entirely
    // ready while its revalidate is still in the air.
    writeDetail('lead-1', detailFor('lead-1'));
    const pending = stubPendingFetch();
    const h = mountQueue(3);

    expect(await screen.findByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText(/Loading this lead/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Log call/ })).toBeDisabled();

    for (const key of ['c', 't', 'z']) fireEvent.keyDown(document, { key });

    expectNoWrites(h);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    await pending.release();
    await waitUntilArmed();

    fireEvent.keyDown(document, { key: 'c' });
    await waitFor(() => expect(h.logTouch).toHaveBeenCalledWith('lead-1', 'call'));
    expect(await screen.findByText('2 / 3')).toBeInTheDocument();
  });

  it('still lets the operator move while a lead is loading', async () => {
    // Navigation is deliberately outside the gate: waiting on a fetch to skip a
    // card would make the queue feel broken. Both cards are pre-warmed so each
    // one paints from cache while its own revalidate stays in flight.
    writeDetail('lead-1', detailFor('lead-1'));
    writeDetail('lead-2', detailFor('lead-2'));
    const pending = stubPendingFetch();
    const h = mountQueue(3);

    expect(await screen.findByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText(/Loading this lead/)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'j' });

    expect(await screen.findByText('2 / 3')).toBeInTheDocument();
    expectNoWrites(h);

    await pending.release();
    await waitUntilArmed();
  });
});

describe('LeadQueue teardown', () => {
  it('removes its keydown listeners on unmount', async () => {
    const h = await renderQueue();
    h.unmount();

    fireEvent.keyDown(document, { key: 'c' });
    fireEvent.keyDown(document, { key: 'x' });
    fireEvent.keyDown(document, { key: 'j' });

    expectNoWrites(h);
    expect(screen.queryByText(`1 / ${QUEUE_SIZE}`)).not.toBeInTheDocument();
  });
});
