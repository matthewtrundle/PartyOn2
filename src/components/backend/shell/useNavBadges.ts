'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export interface NavBadges {
  ordersToday: number;
  recsOpen: number;
}

const EMPTY: NavBadges = { ordersToday: 0, recsOpen: 0 };

/**
 * Lightweight tab-badge counts. Refetches on route change (an operator who
 * just fulfilled an order expects the badge to drop) and on a slow interval.
 * Failures degrade to zeros — badges are never worth an error state.
 */
export function useNavBadges(enabled: boolean): NavBadges {
  const [badges, setBadges] = useState<NavBadges>(EMPTY);
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = (): void => {
      fetch('/api/ops/nav-badges')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data) {
            setBadges({
              ordersToday: data.ordersToday ?? 0,
              recsOpen: data.recsOpen ?? 0,
            });
          }
        })
        .catch(() => {
          /* keep last known counts */
        });
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, pathname]);

  return badges;
}
