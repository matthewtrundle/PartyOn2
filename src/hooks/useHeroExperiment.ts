/**
 * useHeroExperiment — self-serve hero-copy A/B testing.
 *
 * Reads the active hero experiment for a landing page (created from the
 * /admin/analytics hub, no code), assigns the visitor a variant deterministically,
 * records an exposure, and returns the variant's copy overrides. The page renders
 * `content?.headline ?? <its default>` etc., so with no active experiment it shows
 * its normal copy.
 *
 * Results are read from the variant click/impression counters (incremented via
 * /api/experiments/track) — wire the hero CTA with `trackExperimentClick` from
 * useExperimentVariant so a click counts toward the test.
 */

'use client';

import { useEffect, useState } from 'react';
import { trackHeroVariant } from '@/lib/analytics/ga4-events';

// Mirrors VISITOR_ID_COOKIE / VISITOR_ID_MAX_AGE in experiment-service.ts. Inlined
// (not imported) so this client hook never pulls the server-only experiment-service
// (which imports Prisma) into the browser bundle.
const VISITOR_ID_COOKIE = 'partyonVisitorId';
const VISITOR_ID_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export interface HeroContent {
  eyebrow?: string;
  headline?: string;
  /** Gold second line on the LandingPageTemplate landers; other pages ignore it. */
  headlineAccent?: string;
  subhead?: string;
  ctaText?: string;
}

export interface HeroExperiment {
  /** Variant copy overrides, or null when there's no active experiment. */
  content: HeroContent | null;
  experimentId: string | null;
  /** DB variant id — pass to trackExperimentClick so a click attributes correctly. */
  variantId: string | null;
  goalMetric: string | null;
  /** false until assignment resolves; the page renders its defaults meanwhile. */
  ready: boolean;
}

const EMPTY: HeroExperiment = {
  content: null,
  experimentId: null,
  variantId: null,
  goalMetric: null,
  ready: false,
};

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function getOrCreateVisitorId(): string {
  let id = getCookie(VISITOR_ID_COOKIE);
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (typeof document !== 'undefined') {
      document.cookie = `${VISITOR_ID_COOKIE}=${id}; path=/; max-age=${VISITOR_ID_MAX_AGE}; SameSite=Lax`;
    }
  }
  return id;
}

interface AssignResponse {
  experimentId: string | null;
  variantDbId: string | null;
  content: HeroContent | null;
  goalMetric: string | null;
}

/**
 * @param page - canonical landing-page path (e.g. '/weddings'); experiments are
 *   scoped to (page, elementId='hero').
 * @param opts.skip - when true, no variant is assigned and NO impression is
 *   recorded (the hook fires an exposure internally on assignment, so this is
 *   the only clean opt-out). Used when another system owns the hero (Brian's
 *   registry test running) or the hero isn't shown (/order auto-mode).
 */
export function useHeroExperiment(
  page: string,
  opts?: { skip?: boolean }
): HeroExperiment {
  const skip = opts?.skip === true;
  const [state, setState] = useState<HeroExperiment>(EMPTY);

  useEffect(() => {
    if (skip) {
      setState({ ...EMPTY, ready: true });
      return;
    }
    let cancelled = false;
    const visitorId = getOrCreateVisitorId();

    fetch(
      `/api/experiments/assign?page=${encodeURIComponent(page)}&elementId=hero&visitorId=${encodeURIComponent(visitorId)}`
    )
      .then((r) => (r.ok ? (r.json() as Promise<AssignResponse>) : null))
      .then((data) => {
        if (cancelled) return;
        if (!data || !data.experimentId || !data.variantDbId) {
          setState({ ...EMPTY, ready: true });
          return;
        }
        setState({
          content: data.content ?? null,
          experimentId: data.experimentId,
          variantId: data.variantDbId,
          goalMetric: data.goalMetric ?? null,
          ready: true,
        });
        // Record one exposure for this view: counter (drives hub significance) +
        // first-party AnalyticsEvent mirror.
        trackHeroVariant(data.experimentId, data.variantDbId, 'hero');
        fetch('/api/experiments/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'impression',
            experimentId: data.experimentId,
            variantId: data.variantDbId,
          }),
        }).catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setState({ ...EMPTY, ready: true });
      });

    return () => {
      cancelled = true;
    };
  }, [page, skip]);

  return state;
}
