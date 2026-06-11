# Product page editorial sprint — June 2026

**Window:** GSC 2026-04-06 → 2026-06-04 (60-day combined).
**Author:** seo-director.
**Source data:** [keyword-recovery-2026-06-raw.json](keyword-recovery-2026-06-raw.json) (GSC) + Neon Postgres (Product, ProductVariant, OrderItem).
**Generator:** `scripts/seo/_sprint-analysis.mts` (output: `/tmp/sprint-out.json`).

---

## TL;DR — the "thin product page" problem is two problems

The brief framed this as "174 thin product pages need rewrites." Cross-referencing GSC traffic with the actual product DB reveals it's actually **two distinct problems with different fixes**, and only the second one is editorial:

| Bucket | Pages in top-30 by impression | Total impressions/60d | Fix |
|---|---:|---:|---|
| **A. ARCHIVED but still indexed** (zombie pages) | **17 of 30** | **11,389** | URL-level: 301 to category or replacement product. No copywriting. |
| **B. ACTIVE but thin copy** | 13 of 30 | 13,111 | Editorial sprint — copy rewrites. |

**Bucket A is bigger than I thought** — 17 of the top-30 highest-impression product pages on the site are ARCHIVED in the database. They're still indexed by Google, still pulling in impressions, but the pages are probably either 404, "discontinued," or a phantom that doesn't convert. That's not an editorial problem — that's a URL hygiene problem worth a half-day of work. **Do Bucket A first.**

Two of them are literal `-copy` Shopify-migration artifacts (e.g. `drinking-buddy-...-single-pack-copy`, `pumpkin-spice-old-fashioned-cocktail-kit-copy`). Those should not even exist.

Bucket B (the editorial sprint) is more interesting than it looked too. Across the 13 ACTIVE pages in the top 30, 8 already produce sales (~$1,829 in the last 90 days). Editorial work compounds existing demand, not creates it from zero.

---

## Bucket A — 17 zombie pages, 11,389 impressions / 60d

Sorted by impressions (most-leaked first). Action column is per-page recommended redirect target.

| # | Slug | Impr/60d | Clicks | Avg pos | Recommended action |
|---:|---|---:|---:|---:|---|
| 1 | `borrasca-brut-cava` | 2,024 | 2 | 18.3 | 301 → `la-marca-prosecco-extra-dry-750ml-6-pack` (closest active sparkling) |
| 2 | `modelo-ranch-water-6-pack` | 1,931 | 4 | 15.7 | 301 → active variant if exists in Shopify; else → `/products?search=ranch+water` |
| 3 | `twisted-x-mcconauhaze-hazy-ipa-12oz-can` | 1,174 | 1 | 15.0 | 301 → `pinthouse-electric-jellyfish-16oz-4-pack-can` (closest active hazy IPA) |
| 4 | `polish-horseshoes-game-set` | 953 | 1 | 44.5 | 301 → `/order` (no active equivalent) |
| 5 | `drinking-buddy-...-single-pack-copy` | 943 | 0 | 57.7 | **Delete** — `-copy` Shopify migration duplicate |
| 6 | `triple-sec-50ml` | 676 | 2 | 43.0 | 301 → active triple sec listing |
| 7 | `waterboy-hydration-weekend-recovery-lemon-ginger-12-pk` | 478 | 6 | 14.9 | **Restore as ACTIVE** — 6 clicks on an archived page means there's demand; this is the strongest signal in the entire list to bring back |
| 8 | `twisted-x-mcconauhaze-hazy-ipa-12oz-6-pack-can` | 418 | 1 | 6.9 | 301 → same as #3 |
| 9 | `real-ale-firemans-4-blonde-ale` (ARCHIVED but listed ACTIVE above — verify) | 418 | 0 | 26.6 | Re-verify status; if archived, 301 → active blonde |
| 10 | `four-loko-lemonade` | 366 | 0 | 25.1 | 301 → active four loko variant |
| 11 | `karbach-ranch-water-variety-12oz-12-pack-can` | 349 | 0 | 41.1 | 301 → `karbach-love-street-blonde-18-pack-12oz-can` (closest active karbach) |
| 12 | `motorized-pool-lounger` | 339 | 0 | 17.9 | 301 → `/boat-parties` (non-alcohol but on-brand) |
| 13 | `team-bride-sunglasses` | 312 | 1 | 10.2 | 301 → `/austin-bachelorette-party-delivery` |
| 14 | `pumpkin-spice-old-fashioned-cocktail-kit-copy` | 305 | 0 | 32.2 | **Delete** — `-copy` Shopify migration duplicate |
| 15 | `glass-beverage-dispenser` | 297 | 0 | 44.0 | 301 → `/order` |
| 16 | `inflatable-led-photo-booth-tent` | 276 | 0 | 27.6 | 301 → `/boat-parties` or `/weddings` |
| 17 | `miller-lite-keg-1-4-barrel-5-5-gal` | 275 | 2 | 37.8 | 301 → active miller keg variant |
| 18 | `filthy-olive-brine-for-cocktails-8-oz-pouch` | 273 | 0 | 82.2 | 301 → category page |

**Why this matters:** zombie product pages serving 404 or "discontinued" UI are a [Google Core Update](https://developers.google.com/search/blog/2024/03/core-update-spam-policies) anti-signal — they explicitly call out "unhelpful or unsatisfying content." Cleaning these up is partly recovering the algo penalty, partly recovering lost link equity.

**How to implement Bucket A:**

1. **Identify replacement products** (operator decision) — for each archived slug, pick the closest active product. This is 30 min of operator judgment on the table above.
2. **Bulk-add redirects** to `next.config.ts` (`/products/<old-slug>` → `/products/<new-slug>` or category page). I can code this in 15 min once you give me the mapping.
3. **Delete the two `-copy` duplicates outright** — they shouldn't redirect to anywhere because their non-`-copy` counterparts may already exist.
4. **Re-evaluate `waterboy-hydration-weekend-recovery-lemon-ginger-12-pk`** — 6 clicks on an archived page in 60 days means real demand. If you can restock this, set it back to ACTIVE and watch it recover.

**Expected impact:** consolidates ~11,000 wasted impressions into pages that can actually convert, and removes a sitewide "unhelpful content" signal that's contributing to the Core Update slide.

---

## Bucket B — Editorial sprint, 13 active pages, 13,111 impressions / 60d

Sorted by **value-at-risk** (combining impressions × current position × known sales):

### Tier 1 — Already-converting pages that just need polish (4 pages)

These have ACTIVE status, real sales velocity, and substantial impressions. Editorial work here compounds existing demand. **Do these first.**

| # | Slug | Impr | Clicks | Pos | Desc chars | 90d sales | 90d rev | Notes |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | `pinthouse-electric-jellyfish-16oz-4-pack-can` | 3,767 | 22 | 12.7 | **409** | 8 | $160 | **Gold-standard template.** Highest impressions, longest description, real CTR. Replicate this format on all Tier-1 rewrites. |
| 2 | `aperol-spritz-party-pitcher-kit-16-drinks` | 916 | 3 | 19.7 | 374 | 7 | **$476** | Best revenue-per-sale ($68). Page 2. Get to page 1. |
| 3 | `karbach-love-street-blonde-18-pack-12oz-can` | 1,313 | 3 | 13.9 | 198 (thin) | 6 | $162 | Page 2 borderline, description is half the length of Electric Jellyfish. Expand. |
| 4 | `la-marca-prosecco-extra-dry-750ml-6-pack` | 301 | 2 | 12.3 | 258 | 8 | **$800** | **Highest revenue product in the top 30** ($100/sale) but only 301 impressions. Under-indexed. Editorial + internal linking from wedding pages. |

### Tier 2 — Active pages with impressions but no clicks/sales (5 pages)

Lots of GSC visibility, zero conversion. These need editorial AND a check: is the search intent matching?

| # | Slug | Impr | Pos | Desc chars | Diagnosis |
|---:|---|---:|---:|---:|---|
| 5 | `bud-light-24-can-suitcase-12oz` | 2,882 | 26.9 | 342 | Page 3. Either content is too thin or "bud light 24 pack" is dominated by HEB/Target. Compare SERP. |
| 6 | `high-noon-tall-boy-vodka-pineapple-700ml` | 724 | 20.0 | 174 (very thin) | Page 2. Description is half a paragraph. Expand. |
| 7 | `100-orange-juice-48oz-bottle` | 621 | 1.9 | **105 (awful)** | **Position 1.9 with no clicks** — title/snippet must be unappealing, not a content problem. Check meta description. |
| 8 | `dos-equis-keg-slim-keg-20l` | 611 | 24.2 | 137 (thin) | Page 3. Kegs need delivery logistics content. |
| 9 | `tequila-512-blanco` | 466 | 28.8 | 235 | Page 3. Likely beaten by Total Wine. Local-tequila angle? |

### Tier 3 — Active pages with low impressions, real sales (4 pages)

Already converting, just need to make them visible. Editorial helps, but internal linking probably matters more.

| # | Slug | Impr | Pos | 90d sales | 90d rev | Action |
|---:|---|---:|---:|---:|---:|---|
| 10 | `fireball-malt-cinnamon-whiskey-10-packs-50ml` | 460 | 45.1 | 1 | $9 | Promote to /products gift section if it's a gift item |
| 11 | `pineapple-cup-with-straw` | 376 | 22.9 | 0 | $0 | Internal link from bach/boat pages |
| 12 | `big-hat-margarita-mocktail-4-pack-12oz` | 256 | 9.8 | 2 | $24 | Already page 1 — keep content fresh |
| 13 | `real-ale-firemans-4-blonde-ale` | 418 | 26.6 | 0 | $0 | Status check (see Bucket A #9) |

---

## What "rewrite" actually means — a template based on Electric Jellyfish

Electric Jellyfish is the only product page in the top-30 that meaningfully converts (22 clicks, 8 sales, $160 in 90 days). Use it as the model:

**Required sections (in order, aim for 600–900 words total):**

1. **Lede paragraph** (50–80 words). Answer "what is this and why would I want it for an Austin event?" Mention the head term naturally — e.g. "Pinthouse Brewing's Electric Jellyfish is a juicy double IPA delivered cold to your Austin event in under 90 minutes." Get the keyword in the first 100 words.
2. **Spec block** (5–8 bullets) — ABV, size, pack count, brewery origin, style notes, IBU, food pairings, ice/temp recommendation.
3. **Use-case section** (100–150 words) — "Best for: bachelor parties, boat days, gameday." Connect to landing pages with internal links to `/austin-bachelor-party-delivery`, `/boat-parties`, etc. **This is the most important SEO move** because it builds the topic graph Google rewards in Core Updates.
4. **How delivery works for this product** (80–100 words) — TABC, same-day, cooler bag, recommended quantity per guest. Reinforces the "delivery service" framing the GBP fix complements.
5. **FAQ section** (3–5 Q&A) — apply the same `FAQPage` JSON-LD pattern just shipped for blog posts. Generalize the helper.
6. **Internal links out** — 3 to category pages, 2 to relevant landing pages, 1 to a relevant blog post.

**Metadata requirements** (already enforced by PR #112):
- `<title>`: `<Product Name> | $<price> | Austin Same-Day Delivery` (60 chars max)
- `<meta description>`: 145–155 chars, must mention "Austin" and one of "same-day delivery", "delivered cold", or "TABC licensed."

---

## Suggested order of work

| Phase | Work | Who | Time | Expected impact |
|---|---|---|---:|---|
| **0** | Decide Bucket A redirect targets | Operator | 30 min | — |
| **1** | Code Bucket A redirects + delete `-copy` dupes | Engineering | 1 hr | Recovers ~11k impressions, removes Core Update anti-signal |
| **2** | Rewrite Tier-1 products (4 pages) | Editorial | 2-3 hr each | Move pages 2 → 1, capture existing demand |
| **3** | Generalize blog `FAQPage` schema helper to product pages | Engineering | 2 hr | Reusable across all 174 product pages |
| **4** | Rewrite Tier-2 products (5 pages) | Editorial + SERP study | 3-4 hr each | Investigate intent; may discover some need to be archived |
| **5** | Internal linking sprint — link Tier-1/Tier-3 products from `/boat-parties`, `/austin-bachelor-party-delivery`, `/weddings`, blog posts | Engineering | 4 hr | Builds topic graph Core Updates reward |

**Total operator + editorial time for Phases 0+1+2:** ~12–15 hours over a week.
**Total engineering time for Phases 1+3+5:** ~7 hours.

## Update — full-catalog archived sweep (2026-06-10)

Ran the sweep across the entire GSC dataset. **The zombie-page problem is much worse than the top-30 suggested:**

| Status | Pages | Impr/60d | Clicks/60d |
|---|---:|---:|---:|
| **ACTIVE** | 208 | (the working catalog) | — |
| **ARCHIVED** | **306** | **18,809** | **27** |
| **NOT_IN_DB** (orphaned URLs) | **19** | **718** | 1 |
| **DRAFT** | 2 | — | — |
| **Total indexed product URLs** | **535** | | |

**61% of Google's indexed product URLs are archived or orphaned.** That's an enormous "unhelpful content" signal across the catalog — and exactly the kind of pattern the May 2026 Core Update was designed to demote.

**Highest-priority NOT_IN_DB pages (literal 404s, no DB record at all):**

| Slug | Impr/60d | Note |
|---|---:|---|
| `miller-lite-keg-1-2-barrel-11-gal-copy` | 164 | `-copy` migration artifact |
| `titos-lemonade-gallon-dispenser-kit-22-drinks-per-dispenser` | 141 | Was probably a real cocktail kit; restore or redirect |
| `cooler-rental-120qt` | 130 | Rental — may belong on a /rentals page |
| `hugo-spritz-cocktail-kit` | 82, 1 click | Real demand. Restore or redirect to active variant |
| `the-classic-texas-cosmopolitan` | 74 | Cocktail kit |
| `32-pack-bottled-water-16-9oz` | 31 | Restore as ACTIVE — water is a real party need |

**Archived pages with REAL clicks (Google says there's demand — bring these back or redirect carefully):**

| Slug | Impr | Clicks |
|---|---:|---:|
| `waterboy-hydration-weekend-recovery-lemon-ginger-12-pk` | 478 | **6** |
| `modelo-ranch-water-6-pack` | 1,931 | 4 |
| `borrasca-brut-cava` | 2,024 | 2 |
| `triple-sec-50ml` | 676 | 2 |
| `miller-lite-keg-1-4-barrel-5-5-gal` | 275 | 2 |
| `glitter-mirror-disco-ball-cowboy-hat` | 132 | 2 |

**Full archived list exported to** [`archived-product-pages-2026-06.csv`](archived-product-pages-2026-06.csv) (326 rows, sortable by impressions).

### Revised recommendation

Bucket A is no longer "17 pages of zombie cleanup" — it's **325 URLs needing a redirect strategy**. This is roughly a half-day's work but should be Priority Zero before any editorial sprint, because the editorial work will be partially wasted while Google continues to see two-thirds of the catalog as low-quality.

Three sub-actions:
1. **Bulk-redirect** the 325 URLs to category pages by tag (beer→`/order?category=beer`, wine→`/order?category=wine`, kegs→`/order?category=kegs`, party-supplies→`/products`, etc.). This is a deterministic pass that doesn't require operator judgment per URL — I can build it from the existing Product.tags column. ~2 hr engineering.
2. **Restore** the ~6 pages with real click demand back to ACTIVE if you can re-stock (waterboy, hugo spritz kit, etc.). Operator decision per item.
3. **Delete** the 4–5 `-copy` Shopify migration artifacts outright (they should never have shipped).

## Provenance

- GSC raw: `docs/seo/recommendations/keyword-recovery-2026-06-raw.json`
- DB query: `scripts/seo/_sprint-analysis.mts` (joined Product, ProductVariant, OrderItem via Prisma; sales window 90d).
- Reference doc: `docs/seo/recommendations/keyword-recovery-2026-06.md`
