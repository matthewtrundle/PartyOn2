/**
 * Next-best-action for a board card — the "what do I do with this lead
 * right now" chip. Pure + server-computed in toBoardLead so the card stays
 * dumb and the rule is unit-tested in one place.
 *
 * Channel bias follows the speed-to-lead + event-industry research the board
 * overhaul was built on: an unanswered signal is always REPLY first; a hot
 * lead with a phone and a near event is worth a CALL; texting beats email for
 * warm follow-up (~98% open vs ~22%), so warm + phone → TEXT. No phone falls
 * back to EMAIL. In-app SMS waits on the A2P number, so TEXT/CALL are just
 * tel:/GHL deep links on the card.
 */

import { daysUntilCT, type Temperature } from './scoring';
import type { PipelineStage } from './pipeline-types';

export type NextActionKind = 'REPLY' | 'CALL' | 'TEXT' | 'EMAIL';

export interface NextAction {
  kind: NextActionKind;
  /** Short why, shown next to the chip (e.g. "Hot · event in 9d"). */
  reason: string;
}

/** Event within this many days makes a hot lead a phone-call priority. */
const CALL_EVENT_WINDOW_DAYS = 14;

export interface NextActionInput {
  needsResponse: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  temperature: Temperature | null;
  eventDate: string | null;
  stage: PipelineStage | null;
  snoozedUntil: string | null;
  now: Date;
}

/**
 * First match wins. Returns null when there's nothing to prompt (closed,
 * off-board, or snoozed into the future) — the card shows no chip.
 */
export function nextActionFor(i: NextActionInput): NextAction | null {
  // Closed / off-board cards need no prompt.
  if (i.stage === 'WON' || i.stage === 'LOST' || i.stage === null) return null;
  // Snoozed = deliberately deferred; respect it.
  if (i.snoozedUntil && new Date(i.snoozedUntil) > i.now) return null;

  // An unanswered customer signal outranks everything — reply first.
  if (i.needsResponse) return { kind: 'REPLY', reason: 'Unanswered — reply now' };

  const days = i.eventDate ? daysUntilCT(i.eventDate, i.now) : null;
  const eventSoon = days != null && days >= 0 && days <= CALL_EVENT_WINDOW_DAYS;

  if (i.temperature === 'hot') {
    if (i.hasPhone && eventSoon) return { kind: 'CALL', reason: `Hot · event in ${days}d` };
    if (i.hasPhone) return { kind: 'CALL', reason: 'Hot lead — call' };
    return { kind: 'EMAIL', reason: 'Hot — email now' };
  }

  if (i.temperature === 'warm') {
    if (i.hasPhone) return { kind: 'TEXT', reason: 'Warm — text intro' };
    return { kind: 'EMAIL', reason: 'Warm — email intro' };
  }

  // Cold / unscored: keep it in the nurture lane.
  if (i.hasEmail) return { kind: 'EMAIL', reason: 'Nurture' };
  if (i.hasPhone) return { kind: 'TEXT', reason: 'Nurture — text' };
  return null;
}
