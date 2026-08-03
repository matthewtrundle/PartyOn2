/**
 * Work-queue ordering: the tier ladder (unanswered first), intra-tier event
 * urgency, lane partitioning, and the board-consistent tail sort.
 */

import { describe, it, expect } from 'vitest';
import {
  QUEUE_TIER,
  LOST_REASONS,
  buildWorkQueue,
  compareQueueCards,
  isQueueEligible,
  queueCounts,
  queueTier,
} from '../work-queue';
import { compareBoardCards, type BoardLead } from '../board-types';
import type { PipelineStage } from '../pipeline-types';

const NOW = new Date('2026-07-28T12:00:00Z');
const inDays = (n: number): string =>
  new Date(NOW.getTime() + n * 86_400_000).toISOString().slice(0, 10);

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

const emptyColumns = (): Record<PipelineStage, BoardLead[]> => ({
  NEW: [],
  CONTACTED: [],
  QUALIFIED: [],
  QUOTE_SENT: [],
  WON: [],
  LOST: [],
});

const cols = (
  cards: BoardLead[],
  stage: PipelineStage = 'NEW',
): Record<PipelineStage, BoardLead[]> => {
  const c = emptyColumns();
  c[stage] = cards;
  return c;
};

const idsOf = (cards: BoardLead[]): string[] => cards.map((c) => c.id);

describe('isQueueEligible', () => {
  it('admits cards with a next action and excludes those without', () => {
    expect(isQueueEligible(card({ nextAction: { kind: 'REPLY', reason: 'x' } }))).toBe(true);
    // nextActionFor() already returns null for WON/LOST, tray (stage null) and
    // future-snoozed cards — so this one predicate covers all three.
    expect(isQueueEligible(card({ nextAction: null }))).toBe(false);
  });

  it('queues a card whose snooze has expired (server re-derives nextAction)', () => {
    const expired = card({
      snoozedUntil: '2026-07-01T00:00:00.000Z',
      nextAction: { kind: 'EMAIL', reason: 'Nurture' },
    });
    expect(isQueueEligible(expired)).toBe(true);
  });
});

describe('queueTier', () => {
  it('unanswered leads take the top two tiers, split by event proximity', () => {
    expect(queueTier(card({ needsResponse: true, eventDate: inDays(9) }), NOW)).toBe(
      QUEUE_TIER.WAITING_IMMINENT,
    );
    expect(queueTier(card({ needsResponse: true, eventDate: inDays(40) }), NOW)).toBe(
      QUEUE_TIER.WAITING,
    );
    expect(queueTier(card({ needsResponse: true, eventDate: null }), NOW)).toBe(QUEUE_TIER.WAITING);
  });

  it('walks the rest of the ladder in order', () => {
    expect(
      queueTier(card({ nextAction: { kind: 'CALL', reason: 'Hot lead — call' } }), NOW),
    ).toBe(QUEUE_TIER.CALL_NOW);
    expect(queueTier(card({ eventDate: inDays(3), temperature: 'cold' }), NOW)).toBe(
      QUEUE_TIER.EVENT_SOON,
    );
    expect(queueTier(card({ temperature: 'hot' }), NOW)).toBe(QUEUE_TIER.HOT);
    expect(queueTier(card({ temperature: 'warm' }), NOW)).toBe(QUEUE_TIER.WARM);
    expect(queueTier(card({ temperature: 'cold' }), NOW)).toBe(QUEUE_TIER.NURTURE);
  });

  it('sinks suggest-Lost cards to CLEANUP even when they score hot', () => {
    expect(queueTier(card({ suggestLost: true, temperature: 'hot' }), NOW)).toBe(
      QUEUE_TIER.CLEANUP,
    );
  });

  it('but an unanswered card still leads, even with a passed event', () => {
    // A fresh inbound (needsResponse looks back only 7 days) means a real
    // person is waiting right now — they must not be filed as cleanup.
    const wrote = card({ needsResponse: true, suggestLost: true, eventDate: inDays(-20) });
    expect(queueTier(wrote, NOW)).toBe(QUEUE_TIER.WAITING);
  });

  it('treats a passed event as undated, not imminent', () => {
    expect(queueTier(card({ needsResponse: true, eventDate: inDays(-2) }), NOW)).toBe(
      QUEUE_TIER.WAITING,
    );
    expect(queueTier(card({ eventDate: inDays(-2), temperature: 'cold' }), NOW)).toBe(
      QUEUE_TIER.NURTURE,
    );
  });
});

describe('compareQueueCards', () => {
  it('orders by tier before anything else', () => {
    const waiting = card({ id: 'waiting', needsResponse: true, score: 1 });
    const hot = card({ id: 'hot', temperature: 'hot', score: 99 });
    expect(compareQueueCards(waiting, hot, NOW)).toBeLessThan(0);
  });

  it('inside a tier, the soonest party wins regardless of score', () => {
    const soon = card({ id: 'soon', needsResponse: true, eventDate: inDays(2), score: 10 });
    const later = card({ id: 'later', needsResponse: true, eventDate: inDays(10), score: 90 });
    expect(compareQueueCards(soon, later, NOW)).toBeLessThan(0);
  });

  it('undated cards sink below dated ones in the same tier', () => {
    const dated = card({ id: 'dated', needsResponse: true, eventDate: inDays(30) });
    const undated = card({ id: 'undated', needsResponse: true, eventDate: null });
    expect(compareQueueCards(dated, undated, NOW)).toBeLessThan(0);
  });

  it('falls back to the board order (score desc, newest first) on ties', () => {
    const a = card({ id: 'a', score: 80, createdAt: '2026-07-01T00:00:00.000Z' });
    const b = card({ id: 'b', score: 40, createdAt: '2026-07-02T00:00:00.000Z' });
    // Same tier + both undated → must agree with what the column would do.
    expect(Math.sign(compareQueueCards(a, b, NOW))).toBe(Math.sign(compareBoardCards(a, b)));

    const older = card({ id: 'older', score: 50, createdAt: '2026-07-01T00:00:00.000Z' });
    const newer = card({ id: 'newer', score: 50, createdAt: '2026-07-05T00:00:00.000Z' });
    expect(compareQueueCards(newer, older, NOW)).toBeLessThan(0);
  });

  it('does not produce NaN when both cards are undated', () => {
    const a = card({ id: 'a', score: 50 });
    const b = card({ id: 'b', score: 50 });
    expect(Number.isNaN(compareQueueCards(a, b, NOW))).toBe(false);
  });
});

describe('buildWorkQueue', () => {
  it('ignores closed columns entirely', () => {
    const columns = emptyColumns();
    columns.WON = [card({ id: 'won', nextAction: { kind: 'EMAIL', reason: 'x' } })];
    columns.LOST = [card({ id: 'lost', nextAction: { kind: 'EMAIL', reason: 'x' } })];
    columns.NEW = [card({ id: 'open' })];
    expect(idsOf(buildWorkQueue(columns, { lane: 'all', now: NOW }))).toEqual(['open']);
  });

  it('drops cards with no next action', () => {
    const columns = cols([card({ id: 'keep' }), card({ id: 'drop', nextAction: null })]);
    expect(idsOf(buildWorkQueue(columns, { lane: 'all', now: NOW }))).toEqual(['keep']);
  });

  it('pulls from every active stage', () => {
    const columns = emptyColumns();
    columns.NEW = [card({ id: 'new', temperature: 'cold' })];
    columns.CONTACTED = [card({ id: 'contacted', temperature: 'cold' })];
    columns.QUALIFIED = [card({ id: 'qualified', temperature: 'cold' })];
    columns.QUOTE_SENT = [card({ id: 'quote', temperature: 'cold' })];
    expect(buildWorkQueue(columns, { lane: 'all', now: NOW })).toHaveLength(4);
  });

  it('partitions lanes cleanly — premier ∪ direct === all, with no overlap', () => {
    const columns = cols([
      card({ id: 'p1', isPremier: true }),
      card({ id: 'p2', isPremier: true }),
      card({ id: 'd1', isPremier: false }),
    ]);
    const all = idsOf(buildWorkQueue(columns, { lane: 'all', now: NOW }));
    const premier = idsOf(buildWorkQueue(columns, { lane: 'premier', now: NOW }));
    const direct = idsOf(buildWorkQueue(columns, { lane: 'direct', now: NOW }));

    expect(premier.sort()).toEqual(['p1', 'p2']);
    expect(direct).toEqual(['d1']);
    expect([...premier, ...direct].sort()).toEqual([...all].sort());
    expect(premier.filter((id) => direct.includes(id))).toEqual([]);
  });

  it('applies the ladder end to end', () => {
    const columns = cols([
      card({ id: 'nurture', temperature: 'cold' }),
      card({ id: 'cleanup', suggestLost: true, temperature: 'hot' }),
      card({ id: 'waiting', needsResponse: true, eventDate: null }),
      card({ id: 'imminent', needsResponse: true, eventDate: inDays(5) }),
      card({ id: 'call', nextAction: { kind: 'CALL', reason: 'Hot lead — call' } }),
      card({ id: 'hot', temperature: 'hot' }),
    ]);
    expect(idsOf(buildWorkQueue(columns, { lane: 'all', now: NOW }))).toEqual([
      'imminent',
      'waiting',
      'call',
      'hot',
      'nurture',
      'cleanup',
    ]);
  });

  it('is deterministic across repeated builds', () => {
    const columns = cols([
      card({ id: 'a', score: 50 }),
      card({ id: 'b', score: 50 }),
      card({ id: 'c', score: 50, needsResponse: true }),
      card({ id: 'd', score: 70 }),
    ]);
    const first = idsOf(buildWorkQueue(columns, { lane: 'all', now: NOW }));
    const second = idsOf(buildWorkQueue(columns, { lane: 'all', now: NOW }));
    expect(first).toEqual(second);
  });

  it('truncates from the front when a limit is given', () => {
    const columns = cols([
      card({ id: 'low', temperature: 'cold' }),
      card({ id: 'top', needsResponse: true }),
    ]);
    expect(idsOf(buildWorkQueue(columns, { lane: 'all', now: NOW, limit: 1 }))).toEqual(['top']);
  });

  it('returns an empty queue for an empty board', () => {
    expect(buildWorkQueue(emptyColumns(), { lane: 'all', now: NOW })).toEqual([]);
  });
});

describe('queueCounts', () => {
  it('counts eligible cards per lane', () => {
    const columns = emptyColumns();
    columns.NEW = [
      card({ id: 'p1', isPremier: true }),
      card({ id: 'd1', isPremier: false }),
      card({ id: 'skip', nextAction: null }),
    ];
    columns.CONTACTED = [card({ id: 'd2', isPremier: false })];
    columns.WON = [card({ id: 'won' })];

    expect(queueCounts(columns)).toEqual({ all: 3, premier: 1, direct: 2 });
  });
});

describe('LOST_REASONS', () => {
  it('is a non-empty set of unique, human-readable reasons', () => {
    expect(LOST_REASONS.length).toBeGreaterThan(0);
    expect(new Set(LOST_REASONS).size).toBe(LOST_REASONS.length);
  });
});
