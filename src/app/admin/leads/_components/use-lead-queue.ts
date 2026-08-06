/**
 * Work-queue state machine for /admin/leads focus mode.
 *
 * Owns position, per-lead outcomes, the in-flight/error state, the global
 * keyboard map, and the next-lead prefetch. The queue array is frozen by the
 * caller (a key-remount), so advancing is always index + 1 — nothing reshuffles
 * under the operator mid-session.
 *
 * A failed action never advances: position and any half-typed reply survive, and
 * the error surfaces in the bar. That is the whole ergonomic thesis — a network
 * blip must not cost you your place or your work.
 */

'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BoardLead } from '@/lib/leads/board-types';
import { LOST_REASONS } from '@/lib/leads/work-queue';
import type { LeadMutations } from './use-lead-mutations';
import { prefetchDetail } from './lead-detail-cache';

/** What the operator did with a card this sitting. */
export type QueueOutcome = 'replied' | 'called' | 'texted' | 'snoozed' | 'lost' | 'skipped';

/** Outcomes that fire a mutation (reply is owned by the composer). */
export type QueueAction = 'called' | 'texted' | 'snoozed' | 'lost';

/** Days a one-keystroke snooze buys. */
export const SNOOZE_DAYS = 3;

const FAILURE_MESSAGE: Record<QueueAction, string> = {
  called: 'Could not log the call — nothing was saved.',
  texted: 'Could not log the text — nothing was saved.',
  snoozed: 'Could not snooze this lead — nothing was saved.',
  lost: 'Could not mark this lead Lost — it may have moved already.',
};

/**
 * True when a keystroke landed in a text field, so shortcuts must not fire.
 *
 * The sharpest edge in this feature: without it, typing "call me back" into a
 * reply logs a call and skips the lead. Duck-typed rather than `instanceof
 * HTMLElement` so it is unit-testable without a DOM.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as { tagName?: unknown; isContentEditable?: unknown } | null;
  if (!el || typeof el.tagName !== 'string') return false;
  if (el.isContentEditable === true) return true;
  const tag = el.tagName.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** True when the event target is a field the operator has actually typed into. */
function hasDraftText(target: EventTarget | null): boolean {
  const el = target as { value?: unknown; textContent?: unknown } | null;
  if (!el) return false;
  if (typeof el.value === 'string') return el.value.trim().length > 0;
  return typeof el.textContent === 'string' && el.textContent.trim().length > 0;
}

/** Move focus into the drawer's reply body (the sheet is portaled, so query the document). */
function focusReplyBody(): void {
  document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Email body"]')?.focus();
}

export interface LeadQueueState {
  current: BoardLead | null;
  index: number;
  total: number;
  handled: ReadonlyMap<string, QueueOutcome>;
  busy: boolean;
  error: string | null;
  done: boolean;
  /** The current lead's own detail fetch has landed — destructive actions are armed. */
  ready: boolean;
  /** Called by the drawer once this lead's fetch confirms. */
  markConfirmed: (leadId: string) => void;
  /** Mark-Lost reason row is open (keys 1..n pick a reason). */
  lostOpen: boolean;
  setLostOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  act: (action: QueueAction, opts?: { lostReason?: string }) => void;
  /** The composer sends its own email; this records it and advances. */
  recordReply: () => void;
  skip: () => void;
  prev: () => void;
}

export function useLeadQueue(
  queue: readonly BoardLead[],
  mutations: LeadMutations,
): LeadQueueState {
  const [index, setIndex] = useState(0);
  const [handled, setHandled] = useState<ReadonlyMap<string, QueueOutcome>>(new Map());
  const [busy, setBusy] = useState(false);
  // Hard in-flight mutex behind the `busy` state. The state re-renders the bar,
  // but a second keypress or click can arrive before that commit lands — a
  // closure reading `busy` would still see false and fire the write twice. The
  // ref flips synchronously inside act(), so the second press is refused no
  // matter how the renders are timed.
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [lostOpen, setLostOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const total = queue.length;
  const current = queue[index] ?? null;
  const done = index >= total;

  /**
   * Nothing destructive fires until THIS lead's own fetch has landed. Without
   * it the keyboard is live the instant the queue mounts, so an operator could
   * log a call on a card that has not painted yet — or act on a stale one
   * served from the prefetch cache.
   */
  const ready = current !== null && confirmedId === current.id;
  const markConfirmed = useCallback((leadId: string): void => setConfirmedId(leadId), []);

  const advance = useCallback((id: string, outcome: QueueOutcome): void => {
    setHandled((prev) => new Map(prev).set(id, outcome));
    setLostOpen(false);
    setError(null);
    setIndex((i) => i + 1);
  }, []);

  const act = useCallback(
    (action: QueueAction, opts?: { lostReason?: string }): void => {
      const card = queue[index];
      // confirmedId gate: never write against a card whose detail hasn't landed.
      if (!card || busyRef.current || confirmedId !== card.id) return;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      void (async () => {
        let ok = false;
        if (action === 'called') ok = await mutations.logTouch(card.id, 'call');
        else if (action === 'texted') ok = await mutations.logTouch(card.id, 'text');
        else if (action === 'snoozed') {
          const until = new Date(Date.now() + SNOOZE_DAYS * 86_400_000).toISOString();
          ok = await mutations.patchLead(card.id, { snoozedUntil: until, source: 'queue' });
        } else {
          ok = await mutations.moveStage(card.id, 'LOST', {
            lostReason: opts?.lostReason ?? null,
            via: 'queue',
          });
        }
        busyRef.current = false;
        setBusy(false);
        // Stay put on failure so the operator keeps their place and their draft.
        if (!ok) {
          setError(FAILURE_MESSAGE[action]);
          return;
        }
        advance(card.id, action);
      })();
    },
    [queue, index, mutations, advance, confirmedId],
  );

  const recordReply = useCallback((): void => {
    const card = queue[index];
    if (card) advance(card.id, 'replied');
  }, [queue, index, advance]);

  const skip = useCallback((): void => {
    const card = queue[index];
    if (!card) return;
    // Recorded so the session summary can separate "worked" from "passed on".
    setHandled((prev) => (prev.has(card.id) ? prev : new Map(prev).set(card.id, 'skipped')));
    setLostOpen(false);
    setError(null);
    setIndex((i) => i + 1);
  }, [queue, index]);

  const prev = useCallback((): void => {
    setLostOpen(false);
    setError(null);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Warm the next card's detail while this one is being read.
  useEffect(() => {
    prefetchDetail(queue[index + 1]?.id);
  }, [queue, index]);

  // Escape must not destroy a half-typed reply. BottomSheet listens on the
  // document bubble phase, so a capture-phase listener sees the key first and
  // can stop it from ever reaching the sheet.
  const onCaptureKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    if (lostOpen) {
      e.stopPropagation();
      setLostOpen(false);
      return;
    }
    if (helpOpen) {
      e.stopPropagation();
      setHelpOpen(false);
      return;
    }
    if (isTypingTarget(e.target) && hasDraftText(e.target)) {
      e.stopPropagation();
      (e.target as HTMLElement).blur();
    }
  };

  /** Movement and other keys that change nothing. True when the key was consumed. */
  const handleNavKey = (e: KeyboardEvent): boolean => {
    switch (e.key) {
      case 'j':
      case 'J':
      case 'ArrowRight':
        e.preventDefault();
        skip();
        return true;
      case 'k':
      case 'K':
      case 'ArrowLeft':
        e.preventDefault();
        prev();
        return true;
      case '?':
        e.preventDefault();
        setHelpOpen((v) => !v);
        return true;
      case 'r':
      case 'R':
        e.preventDefault();
        focusReplyBody();
        return true;
      default:
        return false;
    }
  };

  /** Keys that write. Auto-repeat is ignored so a held key can't burn a run of leads. */
  const handleActionKey = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    switch (e.key) {
      case 'c':
      case 'C':
        e.preventDefault();
        act('called');
        break;
      case 't':
      case 'T':
        e.preventDefault();
        act('texted');
        break;
      case 'z':
      case 'Z':
        e.preventDefault();
        act('snoozed');
        break;
      case 'x':
      case 'X':
        e.preventDefault();
        setLostOpen(true);
        break;
      default:
        break;
    }
  };

  /** While the reason row is open, digits pick a reason and nothing else fires. */
  const handleLostKey = (e: KeyboardEvent): void => {
    const pick = Number.parseInt(e.key, 10);
    if (Number.isInteger(pick) && pick >= 1 && pick <= LOST_REASONS.length) {
      e.preventDefault();
      act('lost', { lostReason: LOST_REASONS[pick - 1] });
    }
  };

  const onBubbleKeyDown = (e: KeyboardEvent): void => {
    // Browser/OS chords stay the browser's.
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;
    if (lostOpen) {
      handleLostKey(e);
      return;
    }
    if (handleNavKey(e)) return;
    handleActionKey(e);
  };

  // Both document listeners are attached ONCE and dispatch through refs that
  // are re-pointed at this render's closures in a layout effect. Layout effects
  // run synchronously inside the same commit that updates the DOM, so anything
  // able to observe the new UI is guaranteed the matching handler.
  //
  // The previous design re-attached the listeners in a passive effect keyed on
  // state, which left a deferred-task-sized window after every commit — wider
  // under CPU load — where the UI already showed the new state (Log call
  // enabled, reason row open) while the listener still closed over the old
  // state. A keypress in that window was silently swallowed or misrouted: an
  // operator shrugs and presses again, but it also meant Escape right after X
  // could fall through to the BottomSheet and eat a half-typed reply, and it
  // made every press-once-then-wait test a coin flip on a loaded CI runner.
  const captureRef = useRef(onCaptureKeyDown);
  const bubbleRef = useRef(onBubbleKeyDown);
  useLayoutEffect(() => {
    captureRef.current = onCaptureKeyDown;
    bubbleRef.current = onBubbleKeyDown;
  });

  useEffect(() => {
    const capture = (e: KeyboardEvent): void => captureRef.current(e);
    const bubble = (e: KeyboardEvent): void => bubbleRef.current(e);
    document.addEventListener('keydown', capture, true);
    document.addEventListener('keydown', bubble);
    return () => {
      document.removeEventListener('keydown', capture, true);
      document.removeEventListener('keydown', bubble);
    };
  }, []);

  return useMemo(
    () => ({
      current,
      index,
      total,
      handled,
      busy,
      error,
      done,
      ready,
      markConfirmed,
      lostOpen,
      setLostOpen,
      helpOpen,
      setHelpOpen,
      act,
      recordReply,
      skip,
      prev,
    }),
    [
      current, index, total, handled, busy, error, done, ready, markConfirmed,
      lostOpen, helpOpen, act, recordReply, skip, prev,
    ],
  );
}
