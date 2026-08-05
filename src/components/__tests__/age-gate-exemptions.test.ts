import { describe, it, expect } from 'vitest';
import { AGE_GATE_EXEMPT_PATHS } from '../AgeVerification';

/**
 * The entrance gate is a full-screen date-of-birth form. On any page whose
 * traffic arrives from a shared/texted link, it renders BEFORE the visitor
 * reads a word — and `page_view` fires while it is up, so the analytics still
 * count a "visit". That combination hides the failure: the page looks like it
 * is getting traffic that never actually sees it.
 *
 * This has now cost two launches. It is documented in the project memory
 * (`landing_page_nav_and_age_gate_gotcha`) and is step 3 of the
 * landing-page-launch checklist, and it was still missed on the Full Moon
 * funnel — 34 visitors, 0 CTA clicks, 0 checkout starts (measured 2026-08-03).
 *
 * These assertions are the tripwire. Adding a public, link-shared marketing
 * page means adding it here too.
 */
describe('age-gate exemptions', () => {
  const FULL_MOON_FUNNEL = [
    '/full-moon-aug28', // event + ticket purchase (modal carries its own 25+ attestation)
    '/full-moon-drinks', // drinks lander -> /order (checkout carries the 21+ TABC confirmation)
    '/full-moon-thanks', // post-purchase landing (Stripe success_url)
    '/full-moon-terms', // legal text linked from the modal + confirmation email
  ];

  it.each(FULL_MOON_FUNNEL)('%s is exempt from the entrance gate', (route) => {
    expect(AGE_GATE_EXEMPT_PATHS).toContain(route);
  });

  it('/cocktail-recipes is exempt from the entrance gate', () => {
    // Recipe lookup for people who already have a kit — shared by link and
    // found by organic search. Nothing is sold on the page; its only CTA
    // links to the product page, which keeps the gate.
    expect(AGE_GATE_EXEMPT_PATHS).toContain('/cocktail-recipes');
  });

  it('keeps the gate on ordinary site routes', () => {
    // The exemption is per-page and deliberate — it must never become
    // site-wide. These carry the gate because they are not link-shared
    // landers, and A2P/10DLC approval rests on the gate existing.
    for (const route of ['/', '/order', '/products', '/boat-parties']) {
      expect(AGE_GATE_EXEMPT_PATHS).not.toContain(route);
    }
  });

  it('lists no duplicate routes', () => {
    expect(new Set(AGE_GATE_EXEMPT_PATHS).size).toBe(AGE_GATE_EXEMPT_PATHS.length);
  });
});
