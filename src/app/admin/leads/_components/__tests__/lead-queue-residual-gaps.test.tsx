/**
 * Two gaps a mutation audit proved were uncovered — both survived the rest of
 * the suite untouched, so they get their own file rather than a footnote.
 *
 *  1. `okIf: stageMoved` IS WIRED INTO moveStage. stageMoved() is unit-tested as
 *     a pure function elsewhere, but nothing proved the hook actually consults
 *     it. Delete the `{ okIf: stageMoved }` argument and a 200 carrying
 *     { moved: false } — what transitionStage returns when it loses a race —
 *     reads as success: the queue records a Lost that never happened and moves
 *     on. Testing the predicate alone cannot catch that; only the hook can.
 *
 *  2. A DRAFT MUST NOT FOLLOW THE OPERATOR TO THE NEXT LEAD. ReplyComposer is
 *     keyed on lead.id so it remounts per card. Drop the key and React reuses
 *     the instance, carrying half a sentence written for Ana into Ben's reply
 *     box — where the next keystroke could send it to the wrong customer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook, act, cleanup } from '@testing-library/react';
import type { BoardLead } from '@/lib/leads/board-types';
import type { LeadDetail } from '../drawer-types';
import LeadQueue from '../lead-queue';
import { useLeadMutations } from '../use-lead-mutations';
import { clearDetailCache } from '../lead-detail-cache';

// ---------------------------------------------------------------- fixtures

const baseCard: BoardLead = {
  id: 'lead-a',
  name: 'Ana Alpha',
  email: 'lead-a@example.com',
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
  needsResponse: true,
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
  nextAction: { kind: 'REPLY', reason: 'Unanswered — reply now' },
  touchCount: 0,
  daysInStage: 1,
  stalled: false,
};

const card = (over: Partial<BoardLead>): BoardLead => ({ ...baseCard, ...over });

function detailFor(id: string): LeadDetail {
  return {
    lead: {
      id,
      email: `${id}@example.com`,
      phone: null,
      firstName: id === 'lead-a' ? 'Ana' : 'Ben',
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

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  clearDetailCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const m = /\/api\/v1\/admin\/leads\/([^/?]+)$/.exec(url);
      if (m && m[1] !== 'board') {
        return jsonResponse({ success: true, data: detailFor(m[1]) });
      }
      return jsonResponse({ success: true, data: {} });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// ------------------------------------------------- 1. okIf is wired into moveStage

describe('moveStage consults stageMoved (the okIf wiring, not just the predicate)', () => {
  const setup = () => renderHook(() => useLeadMutations(async () => {}));

  it('reports FAILURE when the server 200s but says the card did not move', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      success: true,
      data: { moved: false, reason: 'concurrent-change', lead: null },
    })));
    const { result } = setup();

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.moveStage('lead-a', 'LOST', { via: 'queue' });
    });

    // If okIf were dropped, this would be true and the queue would advance,
    // recording a Lost that the database never performed.
    expect(outcome).toBe(false);
  });

  it('reports success for a move that really happened', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      success: true,
      data: { moved: true, reason: null, lead: { id: 'lead-a' } },
    })));
    const { result } = setup();

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.moveStage('lead-a', 'LOST', { via: 'queue' });
    });

    expect(outcome).toBe(true);
  });

  it('does not fire onChanged for a move that did not happen', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      success: true,
      data: { moved: false, reason: 'concurrent-change' },
    })));
    const onChanged = vi.fn(async () => {});
    const { result } = renderHook(() => useLeadMutations(onChanged));

    await act(async () => {
      await result.current.moveStage('lead-a', 'LOST', { via: 'queue' });
    });

    expect(onChanged).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------- 2. drafts must not leak forward

describe('a half-typed reply never follows the operator to the next lead', () => {
  const QUEUE = [card({ id: 'lead-a' }), card({ id: 'lead-b', name: 'Ben Beta' })];

  const fakeMutations = () => ({
    mutating: false,
    moveStage: vi.fn(async () => true),
    patchLead: vi.fn(async () => true),
    logTouch: vi.fn(async () => true),
  });

  const replyBody = (): HTMLTextAreaElement =>
    screen.getByLabelText('Email body') as HTMLTextAreaElement;

  it('clears the composer when the queue advances to a different card', async () => {
    render(<LeadQueue queue={QUEUE} mutations={fakeMutations()} onExit={vi.fn()} />);

    // Wait for lead A to arm, so we know we are on a fully-loaded card.
    await waitFor(() => expect(screen.getByText('1 / 2')).toBeInTheDocument());
    await screen.findByLabelText('Email body');

    fireEvent.change(replyBody(), { target: { value: 'Hi Ana, about your August 15th party' } });
    expect(replyBody().value).toContain('August 15th');

    // Skip is deliberately not gated on confirmation, so it works immediately.
    fireEvent.keyDown(document, { key: 'j' });
    await waitFor(() => expect(screen.getByText('2 / 2')).toBeInTheDocument());
    await screen.findByLabelText('Email body');

    // Without key={lead.id} on ReplyComposer, Ana's sentence is still sitting
    // in the box while Ben's name is on the card.
    expect(replyBody().value).not.toContain('August 15th');
    expect(replyBody().value).not.toContain('Ana');
  });

  it('greets the lead actually on screen', async () => {
    render(<LeadQueue queue={QUEUE} mutations={fakeMutations()} onExit={vi.fn()} />);

    await screen.findByLabelText('Email body');
    await waitFor(() => expect(replyBody().value).toContain('Ana'));

    fireEvent.keyDown(document, { key: 'j' });
    await waitFor(() => expect(screen.getByText('2 / 2')).toBeInTheDocument());

    await waitFor(() => expect(replyBody().value).toContain('Ben'));
  });
});
