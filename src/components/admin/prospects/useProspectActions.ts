'use client';

/**
 * Prospects workbench — all server calls in one hook.
 *
 * Bulk verify runs client-side with concurrency 3 + one retry on 429/5xx
 * (the verify columns make it refresh-safe: re-running skips nothing and
 * re-writes idempotently). Every mutation reports through onNotice and
 * triggers onRefresh so the table re-derives its chips.
 */

import { useCallback, useState } from 'react';
import { drainQueue } from './types';

export interface ProspectActionApi {
  busy: string | null;
  syncToCrm: () => Promise<void>;
  enroll: (websites: string[]) => Promise<void>;
  testSend: (website: string) => Promise<void>;
  verifyOne: (id: string) => Promise<string | null>;
  verifyBulk: (ids: string[]) => Promise<void>;
  patch: (id: string, body: Record<string, unknown>) => Promise<boolean>;
}

async function postJson(
  url: string,
  body?: Record<string, unknown>,
  method: 'POST' | 'PATCH' = 'POST'
): Promise<{ res: Response; json: { success: boolean; error?: string; data?: unknown } }> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { res, json: await res.json() };
}

export function useProspectActions(
  onNotice: (notice: string) => void,
  onRefresh: () => Promise<void>
): ProspectActionApi {
  const [busy, setBusy] = useState<string | null>(null);

  const syncToCrm = useCallback(async () => {
    setBusy('sync');
    try {
      const { json } = await postJson('/api/v1/admin/partner-prospects/sync');
      if (!json.success) throw new Error(json.error);
      const d = json.data as { created: number; updated: number; taggedActive: number };
      onNotice(`CRM sync: ${d.created} created, ${d.updated} updated, ${d.taggedActive} tagged active partner.`);
      await onRefresh();
    } catch (err) {
      onNotice(`Sync failed: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setBusy(null);
    }
  }, [onNotice, onRefresh]);

  const enroll = useCallback(
    async (websites: string[]) => {
      setBusy('enroll');
      try {
        const { json } = await postJson('/api/v1/admin/partner-prospects/enroll', { websites });
        if (!json.success) throw new Error(json.error);
        const d = json.data as {
          enrolled: number;
          results: { website: string; ok: boolean; reason?: string }[];
        };
        const skipped = d.results.filter((r) => !r.ok);
        onNotice(
          `Enrolled ${d.enrolled}/${websites.length}.` +
            (skipped.length
              ? ` Skipped: ${skipped.map((r) => `${r.website} (${r.reason})`).join(', ')}`
              : '')
        );
        await onRefresh();
      } catch (err) {
        onNotice(`Enroll failed: ${err instanceof Error ? err.message : 'error'}`);
      } finally {
        setBusy(null);
      }
    },
    [onNotice, onRefresh]
  );

  const testSend = useCallback(
    async (website: string) => {
      setBusy(`test:${website}`);
      try {
        const { json } = await postJson('/api/v1/admin/partner-prospects/test-send', { website });
        onNotice(
          json.success
            ? `Test sent to ${(json.data as { to: string }).to}.`
            : `Test failed: ${json.error}`
        );
      } catch {
        onNotice('Test failed: network error');
      } finally {
        setBusy(null);
      }
    },
    [onNotice]
  );

  /** One verify call; returns the new status or null. One retry on 429/5xx. */
  const verifyOne = useCallback(
    async (id: string): Promise<string | null> => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const { res, json } = await postJson('/api/v1/admin/partner-prospects/verify', { id });
          if (json.success) return (json.data as { status: string }).status;
          if (res.status === 501) {
            onNotice('Verification unavailable — ZEROBOUNCE_API_KEY is not configured.');
            return null;
          }
          if (res.status !== 429 && res.status < 500) return null;
        } catch {
          /* retry once */
        }
        await new Promise((r) => setTimeout(r, 800));
      }
      return null;
    },
    [onNotice]
  );

  const verifyBulk = useCallback(
    async (ids: string[]) => {
      setBusy('verify-bulk');
      try {
        const done = await drainQueue(ids, async (id) => {
          await verifyOne(id);
        });
        onNotice(`Verified ${done} prospect email(s).`);
        await onRefresh();
      } finally {
        setBusy(null);
      }
    },
    [onNotice, onRefresh, verifyOne]
  );

  const patch = useCallback(
    async (id: string, body: Record<string, unknown>): Promise<boolean> => {
      setBusy(`patch:${id}`);
      try {
        const { json } = await postJson(
          `/api/v1/admin/partner-prospects/${id}`,
          body,
          'PATCH'
        );
        if (!json.success) {
          onNotice(`Update failed: ${json.error ?? 'error'}`);
          return false;
        }
        await onRefresh();
        return true;
      } catch {
        onNotice('Update failed: network error');
        return false;
      } finally {
        setBusy(null);
      }
    },
    [onNotice, onRefresh]
  );

  return { busy, syncToCrm, enroll, testSend, verifyOne, verifyBulk, patch };
}
