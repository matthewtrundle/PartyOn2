'use client';

/**
 * Delivery-window choice — site-wide pre-order gate.
 *
 * Right after the 21+ age gate, the visitor picks one of two windows:
 *
 *   • 'last-minute' → "Today or Tomorrow"   (drives the deep-stock
 *                                            menu, today-default
 *                                            date pickers, etc.)
 *   • 'future'      → "Future date"          (full catalog, date
 *                                            picker starts ~7 days out)
 *
 * The choice is stored in localStorage under `pod_delivery_window` and
 * lasts ~24h (matches the chat/cart persistence we already do for
 * events). Any consumer can read it via `useDeliveryWindow()`.
 *
 * Why localStorage instead of a cookie? It's a client-only hint — the
 * server endpoints (`/api/v1/quote/start`, `/api/v1/chat/submit`) still
 * derive the authoritative `isLastMinute` flag from the explicit
 * delivery date on the request. This is just for fast UI defaults.
 */

import { useCallback, useEffect, useState } from 'react';

export type DeliveryWindow = 'last-minute' | 'future';

const STORAGE_KEY = 'pod_delivery_window';
const TTL_MS = 24 * 60 * 60 * 1000;

type StoredWindow = {
  v: 1;
  window: DeliveryWindow;
  ts: number;
};

/** Read the persisted choice. Returns null if missing or expired. */
export function loadDeliveryWindow(): DeliveryWindow | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredWindow>;
    if (parsed.v !== 1) return null;
    if (typeof parsed.ts !== 'number' || Date.now() - parsed.ts > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (parsed.window !== 'last-minute' && parsed.window !== 'future') return null;
    return parsed.window;
  } catch {
    return null;
  }
}

export function saveDeliveryWindow(value: DeliveryWindow): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredWindow = { v: 1, window: value, ts: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    // Notify in-page listeners (`storage` only fires across tabs).
    window.dispatchEvent(new CustomEvent('pod:delivery-window-change'));
  } catch {
    /* localStorage disabled — that's fine, the gate just re-asks next time */
  }
}

export function clearDeliveryWindow(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('pod:delivery-window-change'));
  } catch {
    /* swallow */
  }
}

/**
 * React hook — returns the live choice + setters. Re-reads when another
 * component on the same page updates it (custom event) AND when another
 * tab updates it (storage event).
 */
export function useDeliveryWindow(): {
  window: DeliveryWindow | null;
  isLastMinute: boolean;
  set: (value: DeliveryWindow) => void;
  clear: () => void;
} {
  const [value, setValue] = useState<DeliveryWindow | null>(null);

  useEffect(() => {
    setValue(loadDeliveryWindow());
    const onChange = () => setValue(loadDeliveryWindow());
    window.addEventListener('pod:delivery-window-change', onChange);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) onChange();
    });
    return () => {
      window.removeEventListener('pod:delivery-window-change', onChange);
      // Anonymous storage listener was non-tracked; safe to leave —
      // browsers GC it on unload. Removing requires a named handler;
      // we accept the tiny cost.
    };
  }, []);

  const set = useCallback((next: DeliveryWindow) => {
    saveDeliveryWindow(next);
    setValue(next);
  }, []);

  const clear = useCallback(() => {
    clearDeliveryWindow();
    setValue(null);
  }, []);

  return {
    window: value,
    isLastMinute: value === 'last-minute',
    set,
    clear,
  };
}
