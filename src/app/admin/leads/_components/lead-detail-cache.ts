/**
 * Detail cache for /admin/leads.
 *
 * GET /api/v1/admin/leads/[id] fans out to nine parallel queries, so stepping
 * through a work queue would stall on a spinner at every card. The queue warms
 * the next lead while the operator reads the current one, and the drawer paints
 * from cache first, then revalidates.
 *
 * Note this costs TWO requests per prefetched lead (the warm-up plus the
 * drawer's unconditional revalidate), traded for an instant first paint. It is
 * not a request-count saving.
 *
 * Module-level on purpose: the cache must survive the drawer unmounting between
 * leads. Plain board clicking benefits for free.
 */

'use client';

import type { LeadDetail } from './drawer-types';

/**
 * Deliberately modest — a LeadDetail carries up to 50 timeline events and 20
 * inbound email bodies, so this is not a cheap object to hold 500 of.
 */
const MAX_ENTRIES = 50;

const cache = new Map<string, LeadDetail>();
const inFlight = new Set<string>();

/** Cached detail for a lead, or null when cold. */
export function readDetail(id: string): LeadDetail | null {
  return cache.get(id) ?? null;
}

/** Store a lead's detail, evicting the oldest entry once the cap is reached. */
export function writeDetail(id: string, detail: LeadDetail): void {
  if (!cache.has(id) && cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(id, detail);
}

/**
 * Warm the cache for a lead the operator hasn't opened yet. No-op when already
 * cached or in flight. Fire-and-forget: a failed prefetch just means the drawer
 * fetches normally.
 */
export function prefetchDetail(id: string | null | undefined): void {
  if (!id || cache.has(id) || inFlight.has(id)) return;
  inFlight.add(id);
  void fetch(`/api/v1/admin/leads/${id}`)
    .then(async (res) => {
      if (!res.ok) return;
      const body: unknown = await res.json();
      const detail = (body as { data?: LeadDetail } | null)?.data;
      if (detail) writeDetail(id, detail);
    })
    .catch(() => undefined)
    .finally(() => {
      inFlight.delete(id);
    });
}

/** Test seam — drop everything. */
export function clearDetailCache(): void {
  cache.clear();
  inFlight.clear();
}
