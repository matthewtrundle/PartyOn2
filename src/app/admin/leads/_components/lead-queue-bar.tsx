/**
 * The work-queue bar that sits at the top of the drawer in focus mode:
 * position, why this lead is here, the one-keystroke action row, the
 * mark-Lost reason chips, and any failure from the last action.
 *
 * Presentational — every handler comes from useLeadQueue.
 */

'use client';

import type { ReactElement } from 'react';
import type { BoardLead } from '@/lib/leads/board-types';
import { LOST_REASONS } from '@/lib/leads/work-queue';
import type { QueueAction, QueueOutcome } from './use-lead-queue';

const OUTCOME_LABEL: Record<QueueOutcome, string> = {
  replied: 'Replied',
  called: 'Call logged',
  texted: 'Text logged',
  snoozed: 'Snoozed 3d',
  lost: 'Marked Lost',
  skipped: 'Skipped',
};

/** Keyboard hint chip — `text-xs` is sanctioned for badges only. */
function Key({ k }: { k: string }): ReactElement {
  return (
    <kbd className="ml-1.5 rounded border border-gray-300 bg-gray-50 px-1 text-xs font-semibold text-gray-500">
      {k}
    </kbd>
  );
}

const ACTION_BTN =
  'min-h-[36px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:border-brand-blue disabled:opacity-50';

export default function LeadQueueBar({
  lead,
  index,
  total,
  outcome,
  busy,
  ready,
  error,
  lostOpen,
  onAct,
  onOpenLost,
  onCancelLost,
  onSkip,
  onPrev,
  onExit,
}: {
  lead: BoardLead;
  index: number;
  total: number;
  outcome: QueueOutcome | null;
  busy: boolean;
  /** This lead's detail has landed — until then the write actions stay disarmed. */
  ready: boolean;
  error: string | null;
  lostOpen: boolean;
  onAct: (action: QueueAction, opts?: { lostReason?: string }) => void;
  onOpenLost: () => void;
  onCancelLost: () => void;
  onSkip: () => void;
  onPrev: () => void;
  onExit: () => void;
}): ReactElement {
  return (
    <section className="mb-3 rounded-lg border border-brand-blue/30 bg-brand-blue/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-heading text-sm font-bold tracking-[0.1em] text-gray-900">
            {index + 1} / {total}
          </span>
          {lead.nextAction && (
            <span className="text-sm text-gray-600">· {lead.nextAction.reason}</span>
          )}
          {outcome && (
            <span className="rounded border border-green-300 bg-green-50 px-1.5 text-xs font-semibold text-green-700">
              {OUTCOME_LABEL[outcome]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrev} disabled={index === 0} className="btn-ghost min-h-[36px] disabled:opacity-40">
            Back
            <Key k="K" />
          </button>
          <button type="button" onClick={onExit} className="btn-ghost min-h-[36px]">
            Done for now
          </button>
        </div>
      </div>

      {lostOpen ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-gray-700">Why was it lost?</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {LOST_REASONS.map((reason, i) => (
              <button
                key={reason}
                type="button"
                disabled={busy || !ready}
                onClick={() => onAct('lost', { lostReason: reason })}
                className={ACTION_BTN}
              >
                {reason}
                <Key k={String(i + 1)} />
              </button>
            ))}
            <button type="button" onClick={onCancelLost} className="btn-ghost min-h-[36px]">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy || !ready} onClick={() => onAct('called')} className={ACTION_BTN}>
            Log call
            <Key k="C" />
          </button>
          <button type="button" disabled={busy || !ready} onClick={() => onAct('texted')} className={ACTION_BTN}>
            Log text
            <Key k="T" />
          </button>
          <button type="button" disabled={busy || !ready} onClick={() => onAct('snoozed')} className={ACTION_BTN}>
            Snooze 3d
            <Key k="Z" />
          </button>
          <button type="button" disabled={busy || !ready} onClick={onOpenLost} className={ACTION_BTN}>
            Lost
            <Key k="X" />
          </button>
          <button type="button" onClick={onSkip} className="btn-ghost min-h-[36px]">
            Skip
            <Key k="J" />
          </button>
          <span className="ml-auto text-sm text-gray-500">
            Reply below
            <Key k="R" />
          </span>
        </div>
      )}

      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      {busy && !error && <p className="mt-2 text-sm text-gray-500">Saving…</p>}
      {!ready && !busy && !error && (
        <p className="mt-2 text-sm text-gray-500">Loading this lead — actions unlock when it&apos;s on screen.</p>
      )}
    </section>
  );
}
