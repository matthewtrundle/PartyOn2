/**
 * Lead Flow work queue — the ordering behind /admin/leads focus mode.
 *
 * The queue is a pure, client-side derivation of the BoardData the page has
 * already loaded: no new query, no new endpoint, no schema change. That works
 * because toBoardLead() already computes nextAction, needsResponse, suggestLost
 * and score onto every card, and getBoardData() already applied the operator's
 * filters — so the queue inherits both for free and can never disagree with the
 * chip rendered on the card.
 *
 * Ordering is deliberately NOT score-first. With 131 of 336 open leads flagged
 * "needs response" but only 2 scoring "hot", score has almost no variance in
 * this corpus — sorting by it is close to sorting by noise. "They wrote and we
 * haven't answered" is the signal with real spread, so it leads.
 *
 * Prisma-free on purpose (like board-types.ts) — client components import this.
 */

import { compareBoardCards, type BoardLead } from './board-types';
import { ACTIVE_STAGES, type PipelineStage } from './pipeline-types';
import { daysUntilCT } from './scoring';

/**
 * Which slice of the board to work. Premier (the cruise-partner flood) and
 * Ads & Direct (the paid funnel) are different motions — mixing them forces a
 * mental context-switch on every card, which is the tax a queue exists to remove.
 */
export type QueueLane = 'all' | 'premier' | 'direct';

/** Unanswered AND the party is this close → the top tier. */
export const WAITING_IMMINENT_DAYS = 14;

/** Nobody is waiting on us, but the party is this close → still jump the line. */
export const EVENT_SOON_DAYS = 7;

/**
 * Work order. Lower runs first. The ladder encodes "answer the people who
 * wrote to you, then chase the parties that are about to happen, then work
 * down by temperature, then clean up the dead ones."
 */
export const QUEUE_TIER = {
  /** Unanswered, party within WAITING_IMMINENT_DAYS. */
  WAITING_IMMINENT: 0,
  /** Unanswered. */
  WAITING: 1,
  /** Card's own next-action says pick up the phone. */
  CALL_NOW: 2,
  /** Party within EVENT_SOON_DAYS. */
  EVENT_SOON: 3,
  HOT: 4,
  WARM: 5,
  NURTURE: 6,
  /** Event passed or quiet 30+ days — a mark-Lost keystroke, not a lead. */
  CLEANUP: 7,
} as const;

export type QueueTier = (typeof QUEUE_TIER)[keyof typeof QUEUE_TIER];

/**
 * Structured mark-Lost reasons. A free-text prompt yields N unique strings and
 * zero analyzable reasons; these stay countable. Exported so the board's drag
 * path can adopt the same set later.
 */
export const LOST_REASONS = [
  'No response',
  'Wrong timing',
  'Too expensive',
  'Booked elsewhere',
  'Not a real lead',
  'Event passed',
] as const;

export type LostReason = (typeof LOST_REASONS)[number];

/** Whole days until the card's event; negative when it has passed, null when undated. */
function daysToEvent(card: BoardLead, now: Date): number | null {
  return card.eventDate ? daysUntilCT(card.eventDate, now) : null;
}

/** Days until an *upcoming* event, or null when undated or already passed. */
function daysUntilUpcoming(card: BoardLead, now: Date): number | null {
  const days = daysToEvent(card, now);
  return days !== null && days >= 0 ? days : null;
}

/**
 * A card earns a queue slot when it has a next action. nextActionFor() already
 * returns null for WON/LOST, for off-board tray cards (stage === null) and for
 * future-snoozed leads — so this one predicate covers all three exclusions and
 * can't drift from what the board shows.
 */
export function isQueueEligible(card: BoardLead): boolean {
  return card.nextAction !== null;
}

/** Which lane a card belongs to. */
function inLane(card: BoardLead, lane: QueueLane): boolean {
  if (lane === 'all') return true;
  return lane === 'premier' ? card.isPremier : !card.isPremier;
}

/** Where a card sits in the work order. */
export function queueTier(card: BoardLead, now: Date): QueueTier {
  const upcomingIn = daysUntilUpcoming(card, now);

  // Unanswered outranks everything — including a passed event, because a fresh
  // inbound (needsResponse only looks back 7 days) means a real person is
  // waiting on us right now, whatever their old event date says.
  if (card.needsResponse) {
    return upcomingIn !== null && upcomingIn <= WAITING_IMMINENT_DAYS
      ? QUEUE_TIER.WAITING_IMMINENT
      : QUEUE_TIER.WAITING;
  }
  // A dead event is not a hot lead, so it must not outrank live work.
  if (card.suggestLost) return QUEUE_TIER.CLEANUP;
  if (card.nextAction?.kind === 'CALL') return QUEUE_TIER.CALL_NOW;
  if (upcomingIn !== null && upcomingIn <= EVENT_SOON_DAYS) return QUEUE_TIER.EVENT_SOON;
  if (card.temperature === 'hot') return QUEUE_TIER.HOT;
  if (card.temperature === 'warm') return QUEUE_TIER.WARM;
  return QUEUE_TIER.NURTURE;
}

/** Intra-tier urgency: soonest upcoming party first; undated and past sink. */
function urgencyKey(card: BoardLead, now: Date): number {
  return daysUntilUpcoming(card, now) ?? Number.POSITIVE_INFINITY;
}

/**
 * Tier, then soonest event, then the board's own hot→cold order. Reusing
 * compareBoardCards for the tail means the queue never contradicts the column
 * the operator was just looking at for equally-urgent cards.
 */
export function compareQueueCards(a: BoardLead, b: BoardLead, now: Date): number {
  const tierDiff = queueTier(a, now) - queueTier(b, now);
  if (tierDiff !== 0) return tierDiff;

  // Compared with !== rather than subtraction: both undated gives
  // Infinity - Infinity = NaN, which would corrupt the sort.
  const urgencyA = urgencyKey(a, now);
  const urgencyB = urgencyKey(b, now);
  if (urgencyA !== urgencyB) return urgencyA < urgencyB ? -1 : 1;

  return compareBoardCards(a, b);
}

/**
 * Build the ordered queue from an already-loaded board payload.
 *
 * Callers snapshot the result and work it by index — see use-lead-queue.ts.
 * Only ACTIVE_STAGES columns contribute; the tray is excluded (its cards have
 * stage === null, so their move semantics differ from a board card's).
 */
export function buildWorkQueue(
  columns: Record<PipelineStage, BoardLead[]>,
  opts: { lane: QueueLane; now: Date; limit?: number },
): BoardLead[] {
  const { lane, now, limit } = opts;
  const pool: BoardLead[] = [];
  for (const stage of ACTIVE_STAGES) {
    for (const card of columns[stage] ?? []) {
      if (isQueueEligible(card) && inLane(card, lane)) pool.push(card);
    }
  }
  pool.sort((a, b) => compareQueueCards(a, b, now));
  return typeof limit === 'number' ? pool.slice(0, limit) : pool;
}

/**
 * How many cards each lane would serve — drives the counts on the "Work the
 * queue" button. Eligibility doesn't depend on the clock (nextAction is
 * computed server-side), so this needs no `now`.
 */
export function queueCounts(
  columns: Record<PipelineStage, BoardLead[]>,
): Record<QueueLane, number> {
  let premier = 0;
  let direct = 0;
  for (const stage of ACTIVE_STAGES) {
    for (const card of columns[stage] ?? []) {
      if (!isQueueEligible(card)) continue;
      if (card.isPremier) premier += 1;
      else direct += 1;
    }
  }
  return { all: premier + direct, premier, direct };
}
