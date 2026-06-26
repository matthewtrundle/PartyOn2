'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ItemCheckEntry, ItemChecks } from './types';

// --- In Stock / Packed / Short By state ---
// Persisted server-side via /api/ops/orders/[id]/picks so checkbox state
// syncs across devices/browsers/users. localStorage is kept as a
// write-through cache so the row paints instantly with last-known state
// while the network fetch resolves.

/** Read the last-known pick state for an order from the localStorage cache. */
export function loadCachedChecks(orderId: string): ItemChecks {
  try {
    const raw = localStorage.getItem(`ops_order_checks_${orderId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// --- Cross-component change signal ---
// Pick state lives in localStorage + the server. This lets lightweight readers
// (the day tiles' pack-progress badges, Pack mode's day total) re-render
// whenever ANY order's pick state is written, without each owning a fetch.
let pickVersion = 0;
const pickListeners = new Set<() => void>();

function notifyPickChange(): void {
  pickVersion += 1;
  pickListeners.forEach((fn) => fn());
}

function subscribePick(listener: () => void): () => void {
  pickListeners.add(listener);
  return () => {
    pickListeners.delete(listener);
  };
}

/** Re-render the caller whenever any order's pick state changes. */
export function usePickTick(): number {
  return useSyncExternalStore(
    subscribePick,
    () => pickVersion,
    () => pickVersion,
  );
}

/**
 * Top-level line-item pack progress for one order, read from the cache.
 * Counts how many of the order's line items are marked Packed (bundle
 * components are tracked in the checklist but not counted here).
 */
export function orderPackProgress(
  orderId: string,
  items: { title: string }[],
): { packed: number; total: number } {
  const checks = loadCachedChecks(orderId);
  let packed = 0;
  for (const it of items) if (checks[it.title]?.packed) packed += 1;
  return { packed, total: items.length };
}

/** Write-through cache an order's pick state to localStorage. */
export function cacheChecks(orderId: string, data: ItemChecks): void {
  try {
    localStorage.setItem(`ops_order_checks_${orderId}`, JSON.stringify(data));
  } catch {
    // ignore quota / private-mode errors
  }
  notifyPickChange();
}

/** Fetch authoritative pick state from the server. Returns null on failure. */
export async function fetchChecks(orderId: string): Promise<ItemChecks | null> {
  try {
    const res = await fetch(`/api/ops/orders/${orderId}/picks`, {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { checks?: ItemChecks };
    return data.checks ?? {};
  } catch {
    return null;
  }
}

/** Persist a single item-key patch to the server (fire-and-forget). */
export async function putCheck(
  orderId: string,
  itemKey: string,
  patch: { inStock?: boolean; packed?: boolean; shortBy?: number },
): Promise<void> {
  try {
    await fetch(`/api/ops/orders/${orderId}/picks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ itemKey, ...patch }),
    });
  } catch {
    // swallow; UI is already optimistic + cached in localStorage
  }
}

/**
 * Pick/pack checkbox state for one order: paints instantly from the
 * localStorage cache, syncs from the server (re-syncing whenever
 * `refreshKey` changes, e.g. on row expand), and writes changes through
 * optimistically with a 400ms debounce on shortBy edits.
 */
export function usePickChecks(
  orderId: string,
  refreshKey?: unknown,
): {
  checks: ItemChecks;
  toggleCheck: (itemKey: string, field: 'inStock' | 'packed') => void;
  setShortBy: (itemKey: string, value: number) => void;
} {
  const [checks, setChecks] = useState<ItemChecks>(() => loadCachedChecks(orderId));
  const shortByTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Pull authoritative state from server. Refetches when refreshKey changes
  // so an open accordion reflects what other devices have updated.
  useEffect(() => {
    let cancelled = false;
    fetchChecks(orderId).then((server) => {
      if (cancelled || !server) return;
      setChecks(server);
      cacheChecks(orderId, server);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId, refreshKey]);

  const toggleCheck = (itemKey: string, field: 'inStock' | 'packed'): void => {
    setChecks((prev) => {
      const nextEntry = { ...prev[itemKey], [field]: !prev[itemKey]?.[field] } as ItemCheckEntry;
      const updated = { ...prev, [itemKey]: nextEntry };
      cacheChecks(orderId, updated);
      void putCheck(orderId, itemKey, { [field]: nextEntry[field] });
      return updated;
    });
  };

  const setShortBy = (itemKey: string, value: number): void => {
    const clamped = Math.max(0, Math.floor(value) || 0);
    setChecks((prev) => {
      const updated = { ...prev, [itemKey]: { ...prev[itemKey], shortBy: clamped } };
      cacheChecks(orderId, updated);
      return updated;
    });
    if (shortByTimers.current[itemKey]) clearTimeout(shortByTimers.current[itemKey]);
    shortByTimers.current[itemKey] = setTimeout(() => {
      void putCheck(orderId, itemKey, { shortBy: clamped });
    }, 400);
  };

  return { checks, toggleCheck, setShortBy };
}
