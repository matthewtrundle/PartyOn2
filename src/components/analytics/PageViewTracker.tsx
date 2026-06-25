'use client';

import { useEffect, type ReactElement } from 'react';
import { usePathname } from 'next/navigation';
import { trackPodEvent } from '@/lib/analytics/client-tracker';

/**
 * Fires a first-party `page_view` event on every client route change so the
 * AnalyticsEvent stream has a complete per-page session record (the homepage
 * and most pages previously fired none). `trackPodEvent` reads the pathname
 * from `window.location` at call time; the query string is attached separately
 * so UTM-carrying ad landings stay distinguishable.
 *
 * Uses `usePathname` only (not `useSearchParams`) so it doesn't force the whole
 * tree into client-side rendering — no Suspense boundary needed.
 */
export default function PageViewTracker(): ReactElement | null {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.location.search ? window.location.search.slice(1) : undefined;
    trackPodEvent('page_view', query ? { query } : undefined);
  }, [pathname]);

  return null;
}
