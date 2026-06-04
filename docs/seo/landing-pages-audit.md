# /austin-*-delivery landing pages — conversion + on-page SEO audit

_Generated 2026-05-19. Audit covers the 4 landing pages that just became the destination of every blog CTA (PR #53), the main nav Services dropdown (PR #56), and 4 new sitemap entries (PR #55)._

## TL;DR

**The bucket is partly leaky, but it's not as bad as the first-pass audit suggested.** Top-of-funnel signals are strong (clear value props, real social proof, on-brand copy, occasion-specific differentiation). Two structural gaps will bleed value as traffic ramps:

1. **Zero cross-linking between the 4 pages.** Verified — no `<a href="/austin-*-delivery">` on any of the 4 pages points to any of the other 3. Visitors landing on the wrong occasion have to bounce back to the homepage or nav. Single biggest internal-link-equity miss.
2. **Title tags too long for SERP (3 of 4 truncate).** 82 / 96 / 107 / 96 characters. Google truncates around 60 chars; the truncated portion is unreadable in search results.

Everything else is medium or low priority. The H1 tags exist (Explore agent initially reported them missing; corrected — they're on every page via `LandingPageTemplate.tsx:99-107`), schema markup exists at the site level, and the content depth is solid (2,600–2,850 words per page).

## What we routed traffic to

All 4 pages share the same `LandingPageTemplate` ([src/components/landing/LandingPageTemplate.tsx](src/components/landing/LandingPageTemplate.tsx), 837 lines) driven by a per-occasion config in `src/components/landing/configs/`. Each config is ~235-250 lines of strings + theme colors. Same React tree, different content. Architecturally clean.

| Page | Slug | Hero headline | Primary CTA | Builder targets |
|------|------|---------------|-------------|-----------------|
| Bachelor | `/austin-bachelor-party-delivery` | "Stocked & Ice-Cold / Before The Groom Lands." | BUILD YOUR BACH PACKAGE | $299 / $399 / $499 |
| Bachelorette | `/austin-bachelorette-party-delivery` | "Champagne Popped / Before The Bride Lands." | BUILD MY BACHELORETTE PACKAGE | $199 — $499 |
| Corporate | `/austin-corporate-event-delivery` | "Premium Bar Service. / Delivered To Your Boardroom." | REQUEST A CORPORATE QUOTE | $1,499 / $2,499 / $3,999 |
| Wedding | `/austin-wedding-weekend-delivery` | "Every Toast Of The Weekend. / Coordinated. Delivered. Done." | BUILD MY WEDDING WEEKEND | $899 / $1,999 / $5,499+ |

## Findings, in priority order

### 🔴 High — zero cross-linking between the 4 landing pages

Verified by curl. None of the 4 pages link to any of the other 3. The "VENUES" and "REVIEWS" sections of each page don't reference siblings; the final CTA section doesn't offer "Planning a different event? See our [wedding](/austin-wedding-weekend-delivery) / [corporate](/austin-corporate-event-delivery) packages."

Why it matters:
- A bachelorette planner reading the bachelor page has zero discovery path to the bachelorette page (other than the nav, which is JS-rendered and small).
- Google distributes link equity through internal links. With 4 sibling pages all targeting the same parent ("austin alcohol delivery"), reciprocal links between them strengthen the cluster.
- It's a literal one-block addition to `LandingPageTemplate.tsx` — render a "Other event types we cover" strip with 3 links derived from the current page's slug.

**Effort:** S (~50 lines in `LandingPageTemplate.tsx`, no new content needed).
**Impact:** High — both for crawl/authority and for keeping mis-targeted visitors on site.

### 🔴 High — title tags exceed SERP truncation point

Measured today:

| Page | Title | Chars |
|------|-------|------:|
| Bachelor | `Austin Bachelor Party Alcohol Delivery \| Stocked Cold, On Time \| Party On Delivery` | 82 |
| Bachelorette | `Austin Bachelorette Party Alcohol Delivery \| Champagne, Cocktails & More \| Party On Delivery` | 96 |
| Corporate | `Austin Corporate Event & Offsite Alcohol Delivery \| Premium Spirits & Bar Setup \| Party On Delivery` | 107 |
| Wedding | `Austin Wedding Weekend Alcohol Delivery \| Welcome Bags, Reception & More \| Party On Delivery` | 96 |

Google generally truncates between 50-60 characters on desktop and 70 on mobile. Anything past that is invisible in search results. The brand-suffix "| Party On Delivery" is the part being cut on 3 of the 4.

Suggested rewrites (each under 60 chars, keeps target keyword + brand):

| Page | Suggested title | Chars |
|------|-----------------|------:|
| Bachelor | `Austin Bachelor Party Alcohol Delivery \| Party On Delivery` | 59 |
| Bachelorette | `Austin Bachelorette Alcohol Delivery \| Party On Delivery` | 57 |
| Corporate | `Austin Corporate Event Alcohol Delivery \| Party On Delivery` | 60 |
| Wedding | `Austin Wedding Alcohol Delivery \| Party On Delivery` | 52 |

Strings live in `src/components/landing/configs/<occasion>.ts` — a 4-line change across 4 files.

**Effort:** S (4 lines).
**Impact:** High — SERP CTR. Full-width titles consistently outperform truncated ones.

### 🟡 Medium — H1 text is brand-creative, not keyword-targeted

H1 tags exist on every page (Explore agent's earlier "missing H1" finding was wrong — verified via curl, the `<h1>` is rendered in `LandingPageTemplate.tsx:99-107`). But they're stylish hero headlines, not target keywords:

| Page | H1 |
|------|-----|
| Bachelor | "Stocked & Ice-Cold / Before The Groom Lands." |
| Bachelorette | "Champagne Popped / Before The Bride Lands." |
| Corporate | "Premium Bar Service. / Delivered To Your Boardroom." |
| Wedding | "Every Toast Of The Weekend. / Coordinated. Delivered. Done." |

None contain the target keyword (e.g., "Austin bachelor party alcohol delivery"). This isn't fatal — Google reads the whole page — but it's a missed opportunity. The fix is non-obvious because changing the H1 to a keyword phrase like "Austin Bachelor Party Alcohol Delivery" would gut the brand voice.

**Two viable fixes:**
- **(a) Keep the visual hero brand H1**, but add the keyword in the first body paragraph (already the `heroEyebrow` config has the keyword string — just expose it more semantically).
- **(b) Switch the H1 to the `eventLabel` config field** (which IS the keyword string, e.g., "AUSTIN BACHELOR PARTY ALCOHOL DELIVERY"), and move the "Stocked & Ice-Cold" text to an H2 below it. Bigger visual change.

Recommendation: (a). Lower risk to brand voice; same SEO outcome since Google weights nearby keyword density alongside H1.

**Effort:** S–M.
**Impact:** Medium — incremental keyword-relevance signal. Won't move ranks alone but compounds.

### 🟡 Medium — no FAQ schema despite FAQ sections existing

Each page has 6 FAQ Q&A pairs rendered as `<details>` accordions. None of the 4 pages emits a `FAQPage` JSON-LD block. Adding it makes the page eligible for FAQ rich snippets in SERPs (a noticeable CTR lift).

Site already has a `generateFAQSchema` helper at [src/lib/seo/schemas.ts:93](src/lib/seo/schemas.ts:93) and we've shipped this pattern on 4 other pages ([PR #51](https://github.com/allan-cmyk/PartyOn2/pull/51) — homepage, weddings, bach-parties, boat-parties). Extension to these 4 is mechanical:

- Extract the FAQ Q&A from each config into a known shape (it's already structured in the configs as a `faq: [{q, a}, ...]` array — confirm in `types.ts`).
- Add a JSON-LD `<script type="application/ld+json">` in `LandingPageTemplate.tsx` that emits the FAQ schema using only the visible Q&A.
- Verify match-to-visible-content rule per PR #51's lesson.

**Effort:** S (~30 lines in `LandingPageTemplate.tsx`, no per-page config changes).
**Impact:** Medium — FAQ rich snippets boost CTR ~5-15% when shown.

### 🟢 Low — no Service or Event schema

Pages emit site-wide `Organization`, `LocalBusiness`, `WebSite` schema (via global layout). Don't emit page-specific `Service` schema (price ranges, area served) or `Event` schema (where appropriate — wedding/bach/bachelorette have date-driven characteristics).

This is lower priority because:
- `Service` schema mostly helps for "near me" / local pack rankings — already covered by `LocalBusiness`.
- `Event` schema is technically a stretch — Party On Delivery isn't the event organizer.

Skip for now unless backed by data showing local pack ranking is the bottleneck.

**Effort:** M.
**Impact:** Low.

### 🟢 Low — conversion path is single-modal-only (no browse-without-committing path)

Every primary CTA opens the same `PackageBuilderModal` (5-step builder collecting contact info). There's no "browse all packages without entering your phone number" path.

This is intentional design — high-intent lead capture trumps casual browsing for this business model. The current model is correct for high-AOV occasions (weddings $5,499+, corporate $3,999+). Don't change without conversion data showing leakage at the modal entry.

**Effort:** L.
**Impact:** Unknown (could be positive or negative — needs measurement).

## What's working (don't touch)

- **Differentiation between pages is real, not template-shimming.** Each config has unique headline, color palette, persona, pricing tier, venue list, and trust angle. Bachelor → boat docks + Rainey, Corporate → boardrooms + invoicing, Wedding → multi-event coordination. Not cookie-cutter.
- **Content depth (2,600–2,850 words/page)** is solid for a commercial landing page.
- **Social proof present**: 3 Google 5★ reviews per page, partner trust stats, TABC licensing/$1M insurance callouts.
- **Self-canonical** + `robots: index,follow` (verified) — no orphan signal.
- **Hero image, value prop, and primary CTA all pass the 5-second test.**

## Recommended sequencing

If you decide to act on any of this, the cheapest-and-most-leverage ordering is:

1. **PR A (S effort):** Trim the 4 title tags — 4 config-file edits. Ships in one small PR.
2. **PR B (S effort):** Add `FAQPage` JSON-LD to `LandingPageTemplate.tsx` (reuses `generateFAQSchema` helper).
3. **PR C (S effort):** Add cross-linking block to `LandingPageTemplate.tsx` ("Other event types we cover" with 3 sibling links).
4. **PR D (S–M effort):** Re-position the keyword phrase semantically near the H1 (option a above).

PR A, B, C are ~50 lines each and could ship same-day. PR D involves copy review.

## Out of scope for this audit

- Performance / Lighthouse / Core Web Vitals — not measured here (CLAUDE.md restricts Playwright/screenshots in this repo). Use the Vercel admin endpoint `GET /api/admin/analytics/vercel?metric=web-vitals` to spot-check.
- Conversion rate per page — no analytics instrumentation on the package builder yet; data-gap noted.
- Mobile UX — same template renders responsive; visual check would require manual review.
- Competitive SERP comparison — not pulled here; SEMrush snapshot has it.
- The package-builder modal's UX — separate concern from on-page SEO.
