/**
 * Client mutation hook for Game Plan initiatives — create / patch / archive /
 * add-note, each calling the /api/admin/strategy endpoints and refreshing the
 * list on success. Mirrors the recommendations queue's use-queue-mutations.
 */

'use client';

import { useCallback, useState } from 'react';
import type { CreateInitiativeInput, UpdateInitiativeInput } from '@/lib/strategy/types';

export interface StrategyMutations {
  /** id of the initiative currently saving (for disabling its controls). */
  savingId: string | null;
  creating: boolean;
  create: (input: CreateInitiativeInput) => Promise<boolean>;
  patch: (id: string, input: UpdateInitiativeInput) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  addNote: (id: string, author: string, body: string) => Promise<boolean>;
}

export function useStrategyMutations(onChanged: () => Promise<void>): StrategyMutations {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const create = useCallback(
    async (input: CreateInitiativeInput): Promise<boolean> => {
      setCreating(true);
      try {
        const res = await fetch('/api/admin/strategy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (res.ok) await onChanged();
        return res.ok;
      } finally {
        setCreating(false);
      }
    },
    [onChanged]
  );

  const patch = useCallback(
    async (id: string, input: UpdateInitiativeInput): Promise<boolean> => {
      setSavingId(id);
      try {
        const res = await fetch(`/api/admin/strategy/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (res.ok) await onChanged();
        return res.ok;
      } finally {
        setSavingId(null);
      }
    },
    [onChanged]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setSavingId(id);
      try {
        const res = await fetch(`/api/admin/strategy/${id}`, { method: 'DELETE' });
        if (res.ok) await onChanged();
        return res.ok;
      } finally {
        setSavingId(null);
      }
    },
    [onChanged]
  );

  const addNote = useCallback(
    async (id: string, author: string, body: string): Promise<boolean> => {
      setSavingId(id);
      try {
        const res = await fetch(`/api/admin/strategy/${id}/updates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author, body }),
        });
        if (res.ok) await onChanged();
        return res.ok;
      } finally {
        setSavingId(null);
      }
    },
    [onChanged]
  );

  return { savingId, creating, create, patch, remove, addNote };
}
