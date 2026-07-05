---
name: landing-page-launch
description: Full checklist for launching a new marketing landing page — page build per design system, age-gate exemption, nav decision, registry entry in src/lib/analytics/landing-pages.ts, CTA instrumentation (GA4 + first-party AnalyticsEvent), optional A/B experiment, analytics-hub tab, and post-launch measurement task. Use whenever creating a new landing page, porting a design into a lander, or wiring an existing page into analytics. Not for editing existing pages' copy (that needs no checklist) or auditing screenshots (use landing-page-audit).
---

# Landing page launch — the sequenced checklist

Every lander launched here (bachelor, bachelorette, wedding, July 4th, Buckaroo Rodeo) hit the same traps: pages that looked right but had no working add-to-cart (age gate), no nav (missing `<Navigation/>`), or zero analytics (instrumentation shipped late — and data only accrues from deploy forward, there is no backfill). Work the steps **in order**; each has a canonical source — read it, don't work from memory.

## The checklist

| # | Step | Canonical source |
|---|---|---|
| 1 | **Build the page** per design system + hero/nav rules | CLAUDE.md (Design System, Hero Sections), `memory/design-system.md`, `/design-example` |
| 2 | **Nav decision** — root layout gives custom landers NO nav: either render `<Navigation/>` yourself, or intentionally go nav-less like the sanctioned `LandingPageTemplate` paid landers (do NOT "fix" those) | CLAUDE.md → Hero "SANCTIONED EXCEPTION"; memory: `landing_page_nav_and_age_gate_gotcha.md` |
| 3 | **Age gate** — add the route to `AGE_GATE_EXEMPT_PATHS` if the global 21+ overlay would block the page's add-to-cart flow; otherwise confirm the overlay renders correctly over it | `src/components/AgeVerification.tsx` |
| 4 | **Registry entry** — add/extend a `LandingPageDef` (key, canonicalPath, aliases, ctaSections). The registry is the single source of truth for the hub tab bar, per-page metrics, and A/B scoping — a lander missing here is invisible to all reporting | `src/lib/analytics/landing-pages.ts` |
| 5 | **CTA instrumentation** — every CTA fires `trackCTAClick(...)` with a `CtaSection` that matches the registry's `ctaSections`, plus the first-party mirror `trackPodEvent('cta_click', ...)` (GA4 gets ad-blocked; the first-party `AnalyticsEvent` row does not) | `src/lib/analytics/ga4-events.ts`, `src/lib/analytics/client-tracker.ts` |
| 6 | **A/B experiment (optional)** — use the DB-backed `Experiment`/`ExperimentVariant` system; do NOT touch Brian's code-driven variant registry (two systems coexist by design). Winners are picked with `computeSignificance()` — never eyeball | memory: `analytics_hub_state.md`; `src/lib/analytics/experiment-significance.ts` |
| 7 | **Hub verification** — after deploy, the page's tab appears at `/admin/analytics` and CTA clicks register | `/admin/analytics` |
| 8 | **Ship + schedule the re-measure** — merge via the `ship` skill, then create a scheduled task ≥7 days out that pulls the page's traffic/CTA/conversion numbers and reports a verdict | `ship` skill; verdict-task pattern |

## Traps (each one shipped broken at least once)

- **Tailwind arbitrary values with commas** (`text-[clamp(...)]`) silently generate NO CSS — the diff is clean, the page is broken. Use standard responsive classes; after deploy, fetch the served stylesheet and grep for the class if any `[...]` values were used.
- **Verify add-to-cart in a real browser context, not SSR HTML** — the age-gate overlay only exists client-side (memory: `landing_page_nav_and_age_gate_gotcha.md`).
- **Instrumentation accrues post-deploy only.** A lander that goes live before step 5 has a permanent data gap — that's why instrumentation precedes launch in the order above.
- **If a paid campaign accompanies the lander**: geo exclusions and GA4 attribution gotchas are in memory — `delivery_footprint_exclusions.md` (never target Round Rock, Pflugerville, Leander, Dripping Springs, Buda, Kyle) and `google_ads_wedding_fails_gate_ga4_gotcha.md` (GA4 `sessionCampaignName` = the Ads DISPLAY name, never the utm slug; set a CPL kill gate up front).
- **Canonical routes**: check the registry and CLAUDE.md's "Canonical marketing routes" before inventing a new path — several routes 301 (e.g. `/corporate`), and aliases belong in the registry entry, not as duplicate pages.

## Done means

Page live with nav + working add-to-cart, registry entry merged, at least one `cta_click` visible in the hub from a real click, experiment (if any) assigning variants, and the re-measure task scheduled. Report anything on this list you could not verify.
