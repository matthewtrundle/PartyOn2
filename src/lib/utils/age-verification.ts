/**
 * Age verification (client-side gate)
 *
 * Single source of truth for the localStorage-based "are you 21+?" gate.
 * Use these helpers instead of touching localStorage directly so the
 * storage key and backward-compat behavior stay in one place.
 */

/** Canonical storage key. */
export const AGE_VERIFIED_KEY = 'age_verified';

/** Legacy key kept only for reading older sessions. Do not write to it. */
const LEGACY_AGE_VERIFIED_KEY = 'ageVerified';

/** Whether the visitor has confirmed they are 21 or older. SSR-safe. */
export function isAgeVerified(): boolean {
  if (typeof window === 'undefined') return false;
  const value =
    localStorage.getItem(AGE_VERIFIED_KEY) ||
    localStorage.getItem(LEGACY_AGE_VERIFIED_KEY);
  return value === 'true';
}

/** Record that the visitor confirmed they are 21 or older. SSR-safe. */
export function setAgeVerified(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AGE_VERIFIED_KEY, 'true');
}

/** Clear age verification (both current and legacy keys). SSR-safe. */
export function clearAgeVerified(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AGE_VERIFIED_KEY);
  localStorage.removeItem(LEGACY_AGE_VERIFIED_KEY);
}
