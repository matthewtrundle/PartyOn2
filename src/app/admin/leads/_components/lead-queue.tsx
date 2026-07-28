/**
 * Work-queue container — drives the existing LeadDrawer from an ordered,
 * frozen snapshot of board cards instead of a click.
 *
 * Reusing the drawer (rather than building a parallel focus screen) means the
 * operator already gets what they submitted, their last message, the cart, the
 * score breakdown and a working reply composer, with no duplicated components.
 *
 * The caller freezes `queue` via a key-remount and passes a no-refetch
 * mutations instance, so nothing here reloads the 500-card board.
 */

'use client';

import type { ReactElement } from 'react';
import type { BoardLead } from '@/lib/leads/board-types';
import type { LeadMutations } from './use-lead-mutations';
import { useLeadQueue } from './use-lead-queue';
import LeadQueueBar from './lead-queue-bar';
import LeadQueueHelp from './lead-queue-help';
import LeadQueueSummary from './lead-queue-summary';
import LeadDrawer from './lead-drawer';

export default function LeadQueue({
  queue,
  mutations,
  onExit,
}: {
  queue: readonly BoardLead[];
  mutations: LeadMutations;
  onExit: () => void;
}): ReactElement | null {
  const q = useLeadQueue(queue, mutations);

  if (queue.length === 0) return null;

  if (q.done || !q.current) {
    return <LeadQueueSummary handled={q.handled} total={queue.length} onExit={onExit} />;
  }

  return (
    <>
      <LeadDrawer
        leadId={q.current.id}
        onClose={onExit}
        mutations={mutations}
        onReplySent={q.recordReply}
        onConfirmed={q.markConfirmed}
        banner={
          <LeadQueueBar
            lead={q.current}
            index={q.index}
            total={q.total}
            outcome={q.handled.get(q.current.id) ?? null}
            busy={q.busy}
            ready={q.ready}
            error={q.error}
            lostOpen={q.lostOpen}
            onAct={q.act}
            onOpenLost={() => q.setLostOpen(true)}
            onCancelLost={() => q.setLostOpen(false)}
            onSkip={q.skip}
            onPrev={q.prev}
            onExit={onExit}
          />
        }
      />
      {q.helpOpen && <LeadQueueHelp onClose={() => q.setHelpOpen(false)} />}
    </>
  );
}
