'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Experiment } from './components/ExperimentResultCard';
import { experimentPathsFor, type LandingPageDef } from '@/lib/analytics/landing-pages';

export interface UseExperiments {
  experiments: Experiment[];
  loading: boolean;
  reload: () => Promise<void>;
}

/**
 * Shared experiment fetch for one analytics tab — consumed by BOTH the
 * top ExperimentSummaryBanner and the bottom PageExperimentsPanel so a
 * Start/Pause/Conclude in either immediately refreshes the other.
 *
 * Scopes by the tab's experimentPaths (a tab can span several physical
 * heroes — weddings = service page + calculator + ads lander).
 */
export function useExperiments(def: LandingPageDef | undefined): UseExperiments {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  // Monotonic request id — a slow response for a previous tab must never
  // overwrite the current tab's data (Start/Pause would then target the
  // wrong page's experiments).
  const requestSeq = useRef(0);

  const pathsKey = def ? experimentPathsFor(def).join(',') : '';

  const reload = useCallback(async (): Promise<void> => {
    const seq = ++requestSeq.current;
    if (!pathsKey) {
      setExperiments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/experiments?pages=${encodeURIComponent(pathsKey)}`,
        { cache: 'no-store' }
      );
      const json = await res.json();
      if (seq !== requestSeq.current) return; // stale response — drop it
      setExperiments(res.ok ? (json.experiments ?? []) : []);
    } catch {
      if (seq !== requestSeq.current) return;
      setExperiments([]);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [pathsKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { experiments, loading, reload };
}
