'use client';

/**
 * State + mutation handlers for the unified recommendation queue.
 * Extracted from page.tsx to keep the component under 200 lines.
 *
 * Mutation paths:
 *   - transition: legacy /api/admin/analytics/recommendations (open→approved,
 *                 approved→shipped, re-open, etc.) — works for both Marketing
 *                 and Ops thanks to the shared lifecycle.
 *   - execute:    /api/admin/recommendations/[id]/execute
 *   - snooze:     /api/admin/recommendations/[id]/snooze
 *   - dismiss:    /api/admin/recommendations/[id]/dismiss
 */

import { useCallback, useState } from 'react';
import type { RecommendationCardData } from '@/lib/recommendations/card-types';
import type { RecommendationStatus } from '@/lib/recommendations/lifecycle';

export interface QueueMutationHooks {
  savingId: string | null;
  dismissTarget: RecommendationCardData | null;
  setDismissTarget: (rec: RecommendationCardData | null) => void;
  transition: (rec: RecommendationCardData, to: RecommendationStatus) => Promise<void>;
  executeAction: (rec: RecommendationCardData) => Promise<void>;
  snooze: (rec: RecommendationCardData, days: number) => Promise<void>;
  dismiss: (reason: string) => Promise<void>;
  saveNotes: (id: string, status: RecommendationStatus, notes: string) => Promise<void>;
}

export function useQueueMutations(opts: {
  onChanged: () => Promise<void>;
  onNavigate: (href: string) => void;
}): QueueMutationHooks {
  const { onChanged, onNavigate } = opts;
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dismissTarget, setDismissTarget] = useState<RecommendationCardData | null>(null);

  const transition = useCallback(
    async (rec: RecommendationCardData, to: RecommendationStatus) => {
      if (to === 'rejected') {
        setDismissTarget(rec);
        return;
      }
      setSavingId(rec.id);
      try {
        await fetch('/api/admin/analytics/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: rec.id, status: to }),
        });
        await onChanged();
      } finally {
        setSavingId(null);
      }
    },
    [onChanged]
  );

  const executeAction = useCallback(
    async (rec: RecommendationCardData) => {
      setSavingId(rec.id);
      try {
        const res = await fetch(`/api/admin/recommendations/${rec.id}/execute`, { method: 'POST' });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.result === 'navigated' && typeof json.href === 'string') {
          onNavigate(json.href);
          return;
        }
        if (res.status === 501) {
          alert(json.message ?? 'Direct-action buttons coming in a follow-up.');
          await onChanged();
          return;
        }
        if (!res.ok) alert(json.message ?? json.error ?? 'Failed to execute action');
        await onChanged();
      } finally {
        setSavingId(null);
      }
    },
    [onChanged, onNavigate]
  );

  const snooze = useCallback(
    async (rec: RecommendationCardData, days: number) => {
      setSavingId(rec.id);
      try {
        await fetch(`/api/admin/recommendations/${rec.id}/snooze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ days }),
        });
        await onChanged();
      } finally {
        setSavingId(null);
      }
    },
    [onChanged]
  );

  const dismiss = useCallback(
    async (reason: string) => {
      if (!dismissTarget) return;
      setSavingId(dismissTarget.id);
      try {
        const res = await fetch(`/api/admin/recommendations/${dismissTarget.id}/dismiss`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
        if (res.ok) {
          setDismissTarget(null);
          await onChanged();
        } else {
          const json = await res.json().catch(() => ({}));
          alert(json.message ?? 'Failed to dismiss');
        }
      } finally {
        setSavingId(null);
      }
    },
    [dismissTarget, onChanged]
  );

  const saveNotes = useCallback(
    async (id: string, status: RecommendationStatus, notes: string) => {
      setSavingId(id);
      try {
        await fetch('/api/admin/analytics/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status, notes }),
        });
        await onChanged();
      } finally {
        setSavingId(null);
      }
    },
    [onChanged]
  );

  return { savingId, dismissTarget, setDismissTarget, transition, executeAction, snooze, dismiss, saveNotes };
}
