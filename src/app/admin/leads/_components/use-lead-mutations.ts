/**
 * Client mutations for the Lead Flow board — stage moves, card metadata
 * patches — mirroring use-strategy-mutations. `mutating` suspends the board's
 * background refresh so an in-flight optimistic drag can't be clobbered.
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
}

export function useLeadMutations(onChanged: () => Promise<void>): LeadMutations {
  const [pending, setPending] = useState(0);

  const run = useCallback(
    async (fn: () => Promise<Response>): Promise<boolean> => {
      setPending((n) => n + 1);
      try {
        const res = await fn();
        if (res.ok) await onChanged();
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
    ) =>
      run(() =>
        fetch(`/api/v1/admin/leads/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }),
      ),
    [run],
  );

  return { mutating: pending > 0, moveStage, patchLead };
}
