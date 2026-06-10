'use client';

import { useEffect, useState, type ReactElement } from 'react';
import type { PartyType } from '@/lib/group-orders-v2/types';

/**
 * MoodWash -- a 4-6% opacity slow-shifting color wash on the dashboard's
 * cream background. The page itself "feels like a mood" (sunrise on the
 * lake, soft cream wedding morning, etc.) without ever interrupting content
 * or competing with the products grid.
 *
 * Implementation rules:
 *  - Lives at z-index -1, behind everything else.
 *  - Animation cycle: ~12s, single keyframe change every 4s so CPU stays
 *    near-idle (no continuous interpolation).
 *  - Honors prefers-reduced-motion: a static single-color wash, no shift.
 *  - CORPORATE and OTHER (or null) party types get NO wash -- the brief
 *    says corp users don't want vibes, and OTHER is an unset placeholder.
 *
 * Mount once at the top of the dashboard page root wrapper. Pass partyType
 * from the GroupOrderV2 model. The wash re-renders whenever party type
 * changes (rare, but supported).
 */

interface MoodWashProps {
  partyType: PartyType | null;
}

type WashPalette = [string, string, string];

const PALETTES: Partial<Record<PartyType, WashPalette>> = {
  BOAT:         ['rgba(255, 205, 158, 0.05)', 'rgba(242, 211, 79, 0.05)', 'rgba(212, 175, 55, 0.05)'],
  WEDDING:      ['rgba(255, 248, 230, 0.05)', 'rgba(255, 220, 200, 0.05)', 'rgba(241, 220, 178, 0.05)'],
  BACH:         ['rgba(242, 211, 79, 0.05)', 'rgba(255, 127, 80, 0.05)', 'rgba(11, 116, 184, 0.04)'],
  BACHELOR:     ['rgba(242, 211, 79, 0.05)', 'rgba(255, 127, 80, 0.05)', 'rgba(11, 116, 184, 0.04)'],
  BACHELORETTE: ['rgba(242, 211, 79, 0.05)', 'rgba(255, 127, 80, 0.05)', 'rgba(11, 116, 184, 0.04)'],
  HOUSE_PARTY:  ['rgba(255, 255, 255, 0.05)', 'rgba(242, 211, 79, 0.05)', 'rgba(250, 246, 238, 0.05)'],
  // CORPORATE and OTHER intentionally omitted -- no wash for those types.
};

export default function MoodWash({ partyType }: MoodWashProps): ReactElement | null {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    // older Safari uses addListener
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  if (!partyType) return null;
  const palette = PALETTES[partyType];
  if (!palette) return null;

  // Reduced-motion: single static hue (the middle color of the palette).
  if (reducedMotion) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none -z-10"
        style={{ background: palette[1] }}
      />
    );
  }

  // Animated: 12s cycle, three discrete steps -- the browser interpolates
  // background-color between them. animation-timing-function: steps() would
  // be jarring; the default ease keeps it smooth without burning CPU.
  const animationName = `mood-wash-${partyType.toLowerCase()}`;
  return (
    <>
      <style>{`
        @keyframes ${animationName} {
          0%   { background: ${palette[0]}; }
          33%  { background: ${palette[1]}; }
          66%  { background: ${palette[2]}; }
          100% { background: ${palette[0]}; }
        }
      `}</style>
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          animation: `${animationName} 12s ease-in-out infinite`,
          willChange: 'background',
        }}
      />
    </>
  );
}
