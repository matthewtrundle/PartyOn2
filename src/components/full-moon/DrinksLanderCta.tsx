'use client';

import type { ReactElement } from 'react';
import { trackCTAClick } from '@/lib/analytics/ga4-events';
import type { CtaSection } from '@/lib/analytics/ga4-events';
import { DRINKS_ORDER_PATH } from './event';

const HREF = `${DRINKS_ORDER_PATH}&utm_source=full-moon&utm_medium=lander&utm_campaign=full-moon-aug28-drinks`;

/**
 * CTA on /full-moon-drinks — tracked, then into /order in event-preset mode,
 * which creates the visitor's OWN dashboard pre-filled with the marina
 * address, Aug 28, and the dock-handoff window (no shared dashboard, no
 * affiliate ref).
 */
export default function DrinksLanderCta({
  label,
  section,
  variant = 'primary',
}: {
  label: string;
  section: CtaSection;
  variant?: 'primary' | 'outline';
}): ReactElement {
  const cls =
    variant === 'primary'
      ? 'inline-block rounded-lg bg-brand-yellow px-8 py-4 text-base font-semibold tracking-[0.08em] uppercase text-gray-900 no-underline hover:opacity-90'
      : 'inline-block rounded-lg border-2 border-cyan-400 px-8 py-4 text-base font-semibold tracking-[0.08em] uppercase text-cyan-300 no-underline hover:bg-cyan-400/10';
  return (
    <a href={HREF} onClick={() => trackCTAClick(label, DRINKS_ORDER_PATH, section)} className={cls}>
      {label}
    </a>
  );
}
