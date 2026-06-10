'use client';

/**
 * Funnel + experiment event tracker (browser-side).
 *
 * Thin wrapper around the existing sendLeadEvent that:
 *   - Stamps a canonical `step` into metadata (from FUNNEL_ORDER)
 *   - Stamps the active `experimentKey` + `variant` so the funnel report
 *     can group + compute drop-off per variant
 *   - Maps the funnel step to the closest matching LeadEventType so the
 *     existing leads dashboard still surfaces the event meaningfully
 *
 * De-duped per (sessionId × experiment × step) for one tab session so a
 * page that re-renders doesn't double-count.
 */
import { useCallback, useMemo } from 'react';
import { sendLeadEvent, type LeadWidget } from '@/lib/leads/client';
import type { FunnelStep } from './funnelSteps';

// Single tab-scoped de-dupe set. Survives re-renders, dies on tab close.
const firedThisSession = new Set<string>();

function leadEventTypeForStep(step: FunnelStep): Parameters<typeof sendLeadEvent>[0]['type'] {
  switch (step) {
    case 'landing_view':
    case 'package_card_view':
      return 'PAGE_VIEW';
    case 'hero_cta_click':
    case 'package_card_click':
    case 'quickbuy_open':
    case 'builder_open':
    case 'upsell_shown':
    case 'upsell_accepted':
      return 'CUSTOM';
    case 'builder_step_basics':
    case 'builder_step_beer':
    case 'builder_step_liquor':
    case 'builder_step_mixers':
    case 'builder_step_review':
      return 'STEP_COMPLETE';
    case 'contact_filled':
      return 'FIELD_BLUR';
    case 'checkout_start':
      return 'CHECKOUT_START';
    case 'conversion':
      return 'CONVERSION';
  }
}

export type TrackFunnelInput = {
  step: FunnelStep;
  /** Experiment scope — usually the slug/key of an Experiment row. */
  experimentKey?: string;
  /** Variant the visitor is on for this experiment. */
  variant?: string;
  /** Widget context for the leads dashboard. */
  widget?: LeadWidget;
  /** Free-form additional context. */
  metadata?: Record<string, unknown>;
  /** Override de-dupe (fire every time). */
  once?: boolean;
};

/**
 * Fire a funnel step. Returns void — failures are silent.
 *
 * The (step × experiment × variant) tuple is de-duped per tab session
 * unless `once: false` is passed.
 */
export function trackFunnelStep(input: TrackFunnelInput): void {
  if (typeof window === 'undefined') return;
  const dedupeKey = `${input.step}::${input.experimentKey ?? ''}::${input.variant ?? ''}`;
  if (input.once !== false && firedThisSession.has(dedupeKey)) return;
  firedThisSession.add(dedupeKey);

  void sendLeadEvent({
    type: leadEventTypeForStep(input.step),
    widget: input.widget ?? 'OTHER',
    page: window.location.pathname,
    fieldName: input.step,
    metadata: {
      ...input.metadata,
      funnelStep: input.step,
      experimentKey: input.experimentKey,
      variant: input.variant,
    },
  });
}

/**
 * Hook that returns a memoized track function bound to a default
 * experiment + variant + widget. Pass per-call overrides via the input.
 */
export function useFunnelTracker(opts: {
  experimentKey?: string;
  variant?: string;
  widget?: LeadWidget;
}) {
  const track = useCallback(
    (
      step: FunnelStep,
      extra?: Omit<TrackFunnelInput, 'step' | 'experimentKey' | 'variant' | 'widget'> & {
        experimentKey?: string;
        variant?: string;
        widget?: LeadWidget;
      },
    ) => {
      trackFunnelStep({
        step,
        experimentKey: extra?.experimentKey ?? opts.experimentKey,
        variant: extra?.variant ?? opts.variant,
        widget: extra?.widget ?? opts.widget,
        metadata: extra?.metadata,
        once: extra?.once,
      });
    },
    [opts.experimentKey, opts.variant, opts.widget],
  );

  return useMemo(() => ({ track }), [track]);
}
