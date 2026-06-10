'use client';

/**
 * Client-side experiment variant assignment.
 *
 * Deterministic by visitor cookie (`pod_vsid`) — same browser always sees
 * the same variant for the same experiment. No round-trip required;
 * assignment runs in the React render.
 *
 * Hash strategy: cyrb53 (small fast, well-distributed). We hash the
 * concat of `cookieId + experimentKey`, then map the hash mod variant
 * count to pick a variant.
 *
 * Usage:
 *   const variant = useVariant('bachelor-headline-v1', ['control', 'b']);
 *   if (variant === 'b') { ... }
 *
 * If the cookie isn't set yet (first render before pixel beacons),
 * useVariant falls back to the first variant (treated as control) until
 * the next render — that one-frame flash is acceptable for landing
 * pages and avoids hydration mismatches.
 */
import { useEffect, useMemo, useState } from 'react';

const COOKIE_NAME = 'pod_vsid';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((s) => s.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/** Fast 53-bit hash. Public domain (bryc / cyrb53). */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Returns the variant key + assignment metadata. The first variant in
 * the array is treated as control. Variants are equal-weight.
 */
export function useVariant<T extends string>(
  experimentKey: string,
  variants: readonly T[],
): {
  variant: T;
  cookieId: string | null;
  assigned: boolean;
} {
  const [cookieId, setCookieId] = useState<string | null>(null);
  useEffect(() => {
    setCookieId(readCookie(COOKIE_NAME));
  }, []);

  const variant = useMemo<T>(() => {
    if (!cookieId) return variants[0]; // pre-cookie SSR fallback
    const idx = cyrb53(`${cookieId}::${experimentKey}`) % variants.length;
    return variants[idx];
  }, [cookieId, experimentKey, variants]);

  return { variant, cookieId, assigned: cookieId !== null };
}
