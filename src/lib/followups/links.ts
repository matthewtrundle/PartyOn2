/**
 * Follow-up email link safety.
 *
 * Every link in a follow-up email is built from a payload path that may echo
 * public, unauthenticated route input (e.g. abandoned-quote's `resumePath` =
 * the landing page's `page` field, POSTed to /api/v1/landing/lead-event with
 * no auth). If an attacker can steer that path to a foreign host, they get a
 * legitimate, info@partyondelivery.com-signed email whose CTA points at their
 * domain — phishing on our sending reputation (CWE-601, Open Redirect).
 *
 * A string-prefix check is NOT sufficient. WHATWG URL parsing (what `new URL`
 * uses) treats `\` as `/` for http(s) and strips embedded tab/newline, so
 * `"/\evil.com"` and `"/\t/evil.com"` both normalize to `https://evil.com`.
 * The only robust guard is to resolve the path and compare the *resulting*
 * origin to ours.
 */

/**
 * Resolve `path` against `baseUrl` and return the resulting URL only if it
 * stays on the same origin; otherwise return the site root. Never throws.
 *
 * Kept as a pure, exported function (no side effects, no env reads) so the
 * open-redirect guard is unit-testable in isolation — see
 * `__tests__/link-safety.test.ts`.
 */
export function resolveSameOriginUrl(path: string, baseUrl: string): URL {
  const base = new URL(baseUrl);
  let resolved: URL;
  try {
    resolved = new URL(path, base);
  } catch {
    return new URL('/', base);
  }
  return resolved.origin === base.origin ? resolved : new URL('/', base);
}
