/**
 * Client mutations for the Lead Flow board — stage moves, card metadata
 * patches — mirroring use-strategy-mutations. `mutating` disables the
 * drawer's action buttons while a call is in flight (the board has no
 * background poll; data reloads after each mutation, EXCEPT notes-only
 * patches — the notes autosave must not refetch the whole board per save).
 *
 * Pass a no-op `onChanged` to get an instance whose mutations never refetch —
 * that is how the work queue avoids a 500-lead board reload (plus its enroll
 * sweep, a write) after every keystroke. `mutating` is per-instance, so the
 * queue's busy state stays isolated from the board's.
 */

'use client';

import { useCallback, useState } from 'react';
import type { PipelineStage } from '@/lib/leads/pipeline-types';

/** Human-initiated stage-change origins the API accepts (see stage/route.ts). */
export type StageMoveVia = 'drag' | 'queue';

export interface LeadMutations {
  mutating: boolean;
  moveStage: (
    id: string,
    stage: PipelineStage,
    opts?: { lostReason?: string | null; via?: StageMoveVia },
  ) => Promise<boolean>;
  patchLead: (
    id: string,
    input: {
      notes?: string | null;
      owner?: string | null;
      snoozedUntil?: string | null;
      source?: 'drawer' | 'queue';
    },
  ) => Promise<boolean>;
  logTouch: (id: string, channel: 'call' | 'text' | 'email') => Promise<boolean>;
}

/**
 * A 200 from the stage endpoint does not prove the card moved: transitionStage
 * returns { ok: true, moved: false } when it loses a race (or the card is
 * already in the target stage), and the route still answers 200. Treating that
 * as success would report work that never landed, so it counts as a failure —
 * callers then roll back / resync against server truth.
 *
 * Exported for its unit test; not part of the hook's usable surface.
 */
export function stageMoved(body: unknown): boolean {
  return (body as { data?: { moved?: boolean } } | null)?.data?.moved !== false;
}

export function useLeadMutations(onChanged: () => Promise<void>): LeadMutations {
  const [pending, setPending] = useState(0);

  const run = useCallback(
    async (
      fn: () => Promise<Response>,
      opts?: { refetch?: boolean; okIf?: (body: unknown) => boolean },
    ): Promise<boolean> => {
      setPending((n) => n + 1);
      try {
        const res = await fn();
        // The body is only read when a caller needs to inspect it, so the
        // common paths stay a single status check.
        const ok = res.ok && (!opts?.okIf || opts.okIf(await res.json().catch(() => null)));
        if (ok && opts?.refetch !== false) await onChanged();
        return ok;
      } catch {
        return false;
      } finally {
        setPending((n) => n - 1);
      }
    },
    [onChanged],
  );

  const moveStage = useCallback(
    (id: string, stage: PipelineStage, opts?: { lostReason?: string | null; via?: StageMoveVia }) =>
      run(
        () =>
          fetch(`/api/v1/admin/leads/${id}/stage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stage,
              lostReason: opts?.lostReason ?? undefined,
              via: opts?.via ?? undefined,
            }),
          }),
        { okIf: stageMoved },
      ),
    [run],
  );

  const patchLead = useCallback(
    (
      id: string,
      input: {
        notes?: string | null;
        owner?: string | null;
        snoozedUntil?: string | null;
        source?: 'drawer' | 'queue';
      },
    ) => {
      // Notes never render on the board, so the autosave (one PATCH per typing
      // pause) must not trigger a full board refetch — owner/snooze changes do.
      // `source` is audit metadata, not a field, so it never decides this.
      const keys = Object.keys(input).filter((k) => k !== 'source');
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
