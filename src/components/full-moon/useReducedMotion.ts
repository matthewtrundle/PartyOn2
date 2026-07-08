'use client';

import { useEffect, useState } from 'react';

/**
 * True when the visitor prefers reduced motion. SSR-safe (defaults to false,
 * then syncs on mount). Used to freeze the sun/moon/stars arc, carousel
 * autoplay, and confetti.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (): void => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
