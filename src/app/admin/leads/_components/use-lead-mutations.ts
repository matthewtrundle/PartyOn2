/**
 * Client mutations for the Lead Flow board — stage moves, card metadata
 * patches — mirroring use-strategy-mutations. `mutating` disables the
 * drawer's action buttons while a call is in flight (the board has no
 * background poll; data reloads after each mutation, EXCEPT notes-only
 * patches — the notes autosave must not refetch the whole board per save).
 */

'use client';

import { useCallback, useState } from 'react';
import type { PipelineStage } from '@/lib/leads/pipeline-types';

export interface LeadMutations {
  mutating: boolean;
  moveStage: (
    id: string,
    stage: PipelineStage,
    opts?: { lostReason?: string | null },
  ) => Promise<boolean>;
  patchLead: (
    id: string,
    input: { notes?: string | null; owner?: string | null; snoozedUntil?: string | null },
  ) => Promise<boolean>;
  logTouch: (id: string, channel: 'call' | 'text' | 'email') => Promise<boolean>;
}

export function useLeadMutations(onChanged: () => Promise<void>): LeadMutations {
  const [pending, setPending] = useState(0);

  const run = useCallback(
    async (fn: () => Promise<Response>, opts?: { refetch?: boolean }): Promise<boolean> => {
      setPending((n) => n + 1);
      try {
        const res = await fn();
        if (res.ok && opts?.refetch !== false) await onChanged();
        return res.ok;
      } catch {
        return false;
      } finally {
        setPending((n) => n - 1);
      }
    },
    [onChanged],
  );

  const moveStage = useCallback(
    (id: string, stage: PipelineStage, opts?: { lostReason?: string | null }) =>
      run(() =>
        fetch(`/api/v1/admin/leads/${id}/stage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage, lostReason: opts?.lostReason ?? undefined }),
        }),
      ),
    [run],
  );

  const patchLead = useCallback(
    (
      id: string,
      input: { notes?: string | null; owner?: string | null; snoozedUntil?: string | null },
    ) => {
      // Notes never render on the board, so the autosave (one PATCH per typing
      // pause) must not trigger a full board refetch — owner/snooze changes do.
      const keys = Object.keys(input);
      const notesOnly = keys.length > 0 && keys.every((k) => k === 'notes');
      return run(
        () =>
          fetch(`/api/v1/admin/leads/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          }),
        { refetch: !notesOnly },
      );
    },
    [run],
  );

  const logTouch = useCallback(
    (id: string, channel: 'call' | 'text' | 'email') =>
      // Refetches: logging a touch clears the reply flag + may move NEW→CONTACTED.
      run(() =>
        fetch(`/api/v1/admin/leads/${id}/touch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel }),
        }),
      ),
    [run],
  );

  return { mutating: pending > 0, moveStage, patchLead, logTouch };
}
