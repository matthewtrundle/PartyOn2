# Keyword recovery — June 2026

**Window analyzed:** GSC 2026-04-06 → 2026-05-05 (prior) vs 2026-05-06 → 2026-06-04 (current).
**Author:** seo-director (semi-cold pickup of PR #112 / #114 ranking-recovery thread).
**Raw data:** [keyword-recovery-2026-06-raw.json](keyword-recovery-2026-06-raw.json) (regenerate with `node scripts/seo/pull-gsc-keyword-loss.mjs`).
**Snapshot context:** SEMrush 2026-06-04 (`data/seo/semrush/2026-06-04/` on `seo-snapshots` branch).

> **Addendum 2026-06-10 (post-investigation session):** Several findings below were revised by the operator-side follow-up. See "Addendum — what we learned and shipped after this doc" at the bottom. Most important: the **May 2026 Core Update (May 21 – ~June 1)** sits inside the analysis window and is the likely proximate trigger; the brand-SERP "erosion" (#2) turned out to be a measurement artifact, not competitor poaching; and the re-measurement date moves from 2026-06-24 to **2026-07-08**.

---

## TL;DR — what's actually broken

The SEMrush headline (visibility 25.7% → 8.8%) overstates the damage. Per GSC, total organic **clicks fell 13.5% (155 → 134)** and **impressions fell 10.3%** in the matching 30-day window. The loss is real but concentrated:

1. **The homepage slid ~10 positions across the `[modifier] alcohol delivery [modifier] austin` cluster** (e.g. "best alcohol delivery in austin" 7.3 → 18.3, "bachelorette party alcohol delivery austin" 9.6 → 24.8, "alcohol delivery austin near me" 5.1 → 21.2). Same pattern, same landing page, different queries. This is the single largest fixable bucket.
2. **Brand SERP erosion on "party on delivery"** — position 2.2 → 4.5, 30 → 24 clicks. Biggest *individual* click loss in the window. Someone is outranking us on our own name.
3. **Blog `/blog/15-unique-birthday-party-ideas-in-austin-for-adults` is losing clicks despite improving positions** (e.g. "adult birthday party ideas" 28 → 16 but clicks 3 → 0). Classic SERP feature theft — AI overview / featured snippet captures the click.
4. **PR #112 (merged 2026-06-10) is not yet reflected in this window.** The product/blog metadata fix landed *after* the current GSC window closed. ~25 product pages currently in the loss list (Modelo Ranch Water, Borrasca Cava, Aperol Spritz Pitcher, Live Oak Hefeweizen, etc.) had the duplicate-title regression. Expect partial self-healing in the next 14 days. **Don't compound corrective work on top of an in-flight fix.**

**Root cause of #1 and #2** is the same: every keyword-rich page on the site has a keyword-aligned `<title>` but a lifestyle-poetry `<h1>` ("Cocktails Beer delivered cold..." on `/`, "Stocked & Ice-Cold Before The Groom Lands" on `/austin-bachelor-party-delivery`). Title↔H1 semantic mismatch is one of the cheapest relevance signals Google reads. The CRO-optimized headline copy is fighting the SEO ranking signal.

---

## Audit of the brief's flagged queries

The three queries called out in the brief (`best alcohol delivery in austin`, `alcohol delivery company austin`, `bachelor party alcohol delivery austin`) **do appear in GSC** but they are 0-click both windows. The actual GSC pattern:

| Query | Prior position | Current position | Slide | Impressions |
|---|---:|---:|---:|---:|
| best alcohol delivery in austin | 7.3 | 18.3 | **−11.0** | 23 → 21 |
| alcohol delivery company austin | 7.5 | 18.2 | **−10.8** | 35 → 25 |
| best alcohol delivery austin | 6.4 | 17.2 | **−10.8** | 19 → 19 |
| bachelor party alcohol delivery austin | 14.3 | 21.4 | **−7.1** | 43 → 37 |
| alcohol delivery austin near me | 5.1 | 21.2 | **−16.1** | — |
| bachelorette party alcohol delivery austin | 9.6 | 24.8 | **−15.2** | — |
| delivery alcohol austin | 7.5 | 20.8 | **−13.4** | — |
| alcohol delivery service austin tx | 6.9 | 16.2 | **−9.3** | — |
| alcohol delivery in austin tx | 7.1 | 15.8 | **−8.7** | — |

Uniform ~10-position drop across a 9+ keyword cluster, all landing on `/`. This is one structural cause, not nine independent failures. **Audit before acting confirmed:** the SEMrush "visibility" number was an over-amplified signal of this real pattern.

---

## Top-25 lost-click queries with classification

(See `keyword-recovery-2026-06-raw.json` for the full top-50 + per-page rollups.)

Category key: **A** = on-page fix • **B** = backlinks • **C** = structural (lost cause / SERP composition) • **D** = junk traffic • **F** = already fixed by PR #112, monitor only.

| # | Query | Prior pos | Cur pos | Δ clicks | Landing | Cat | Why |
|---:|---|---:|---:|---:|---|:---:|---|
| 1 | party on delivery | 2.2 | 4.5 | **−6** | `/` | **A** | Brand SERP poached. Add Organization schema + brand-anchored content. |
| 2 | live oak hefeweizen | 7.1 | — | −5 | product (deindexed) | **F** | Variant URL `?variant=...&com_cvv=...` was indexed; canonical fix in PR #112 should resolve. |
| 3 | party on delivery austin | 1.0 | 1.0 | −3 | `/` | C | Position fine; impressions just fell (18 → 8). Brand demand softening. |
| 4 | adult birthday party ideas | 28 | 16 | −3 | `/blog/15-unique-birthday-party-ideas...` | **A** | SERP feature theft — position *improved* but clicks went to 0. Capture FAQ schema. |
| 5 | modelo ranch water | 2.5 | 3.7 | −3 | `/products/modelo-ranch-water-6-pack` | **F** | Product title regression pre-PR #112. Monitor. |
| 6 | live oak hefeweizen beer | 2.9 | — | −3 | product | **F** | Same as #2. |
| 7 | austin alcohol delivery | 17.0 | 21.4 | −2 | `/` | **A** | Homepage H1 mismatch — see "Root cause #1". |
| 8 | austin birthday ideas | 7.8 | 6.9 | −2 | `/blog/15-unique...` | **A** | Same SERP feature pattern as #4. |
| 9 | alcohol delivery austin tx | 9.4 | 12.8 | −2 | `/` | **A** | Homepage cluster slide. |
| 10 | beer delivery near me | 5.5 | 6.5 | −2 | `/` | **A** | Homepage cluster slide. |
| 11 | electric jellyfish ipa where to buy | 7.3 | 7.6 | −2 | `/products/pinthouse-electric-jellyfish...` | **F** | Position stable; pre-PR product title regression. |
| 12 | liquor store near me | 25.9 | 14.7 | −2 | `www.partyondelivery.com/` | **C** | Position *improved*; SERP dominated by Google Maps pack + Total Wine. Lost cause. |
| 13 | mini triple sec | 4.5 | 5.8 | −2 | product | **F** | Pre-PR title. Monitor. |
| 14 | where to buy electric jellyfish beer | 6.7 | 8.2 | −2 | (no consistent page) | **F** | Pre-PR. |
| 15 | liquor delivery austin | 6.0 | 7.9 | −1 | `/` | **A** | Homepage cluster slide (smaller). |
| 16 | birthday ideas for adults | 27.7 | 16.4 | −1 | `/blog/15-unique...` | **A** | SERP feature theft. |
| 17 | birthday places in austin for adults | 15.4 | 6.5 | −1 | `/blog/15-unique...` | **A** | SERP feature theft. |
| 18 | fat e's bloody mary mix | 3.7 | 3.8 | −1 | product | C | Position stable, search demand softening. |
| 19 | fun birthday ideas in austin | 10.8 | 7.2 | −1 | `/blog/15-unique...` | **A** | SERP feature theft. |
| 20 | hugo spritz cocktail kit | 2.9 | 6.0 | −1 | product | **F** | Pre-PR title regression. |
| 21 | 1/4 keg miller lite | 5.3 | 1.0 | −1 | product | C | Position 1 already; click loss is search-demand softening. |
| 22 | adult birthday activities | 20 | 57 | −1 | `/blog/15-unique...` | **C** | Big position drop but on a low-impression long-tail query. |
| 23 | adult birthday activity ideas | 7 | 7 | −1 | `/blog/15-unique...` | C | Stable. |
| 24 | adult birthday entertainment ideas | 26 | 20 | −1 | `/blog/15-unique...` | C | Improving. |
| 25 | adult birthday ideas | 43 | 24 | −1 | `/blog/15-unique...` | C | Improving but still page 3. |

**Bucket totals across top-50:** A = 14, B = 0, C = 18, D = 0, F = 18.

No backlinks-driven losses in the top 50 — competitor reference-domain gaps are not the proximate cause of this drop. (Phase 2: re-run with `site-explorer-backlinks-stats` once that MCP is back.)

---

## Top 5 actions, prioritized

### Action 1 — Add keyword-aligned static `<h1>` to the homepage (CODE — Action A1)

**Why this is #1:** Nine queries with the same shape, same page, same uniform 8–16 position slide. The page's `<title>` is "Alcohol Delivery Austin | Party On Delivery" but its `<h1>` is the animated "Cocktails / Beer / Wine / ..." kicker followed by lifestyle copy. Google reads "Cocktails" + lifestyle text and demotes the page for `alcohol delivery [X] austin` head terms.

**What to do:** Keep the animated kicker, but demote it from `<h1>` to `<p class="kicker">` (or `<h2>`) and add a static `<h1>` immediately after that mirrors the `<title>` head term. Example:

```tsx
<p className="hero-kicker font-heading text-3xl">{animatedKicker}</p>
<h1 className="font-heading text-4xl md:text-6xl">Alcohol Delivery in Austin</h1>
<p className="hero-sub">Beer, wine, liquor & kegs — same-day, on time, ice-cold.</p>
```

**Concrete files:** [src/app/page.tsx](src/app/page.tsx) (h1 currently lives in HeroCollage / AnimatedHeroText nested component — needs tracing back to the source). The CRO win (animated headline) is preserved; only the semantic role swaps.

**Effort:** ~2 hours including design review. **Expected impact:** ±5 positions on 9 tracked head terms over 14–28 days. (Spawn-task target.)

### Action 2 — Same fix on `/austin-bachelor-party-delivery` (CODE — Action A2)

Identical pattern. Current `<h1>`: "Stocked & Ice-Cold Before The Groom Lands." Current `<title>`: "Austin Bachelor Party Alcohol Delivery | Party On Delivery". `bachelor party alcohol delivery austin` slid 14.3 → 21.4 (page 1 → 2). The page has 42 indexed queries and only 184 impressions — well below capacity.

**What to do:** Same demote-the-kicker pattern. Add a static `<h1>Austin Bachelor Party Alcohol Delivery</h1>` and move the lifestyle line to an `<h2>` or hero-sub. Then audit every page in `NAV_TRANSPARENT_ROUTES` for the same anti-pattern (weddings, boat-parties, corporate). (Spawn-task target.)

### Action 3 — Wait 14 days for PR #112 propagation before launching corrective work on product pages (MONITOR)

Of the 25 product/blog pages currently in the loss table, ~18 are explained by the duplicate-title regression PR #112 just fixed. The current GSC window ends 2026-06-04 — six days before the fix shipped. Re-run `node scripts/seo/pull-gsc-keyword-loss.mjs` on **2026-06-24** with windows shifted to capture post-PR data and re-classify. If the F-bucket queries don't recover, escalate.

**Concrete check:** modelo ranch water (2.5 → 3.7), live oak hefeweizen (7.1 → null), aperol spritz pitcher (8.2 → 14.7) should all recover ≥3 positions if the fix is doing its job.

### Action 4 — Brand SERP defense for "party on delivery" (OPERATOR — not a code chip)

Position 2.2 → 4.5 on our brand name is the biggest single click loss in the window (−6). Operator action: manually search "party on delivery" in incognito from Austin and the top US metros and screenshot the SERP. Identify who's at positions 1–4 (likely Drizly, ReserveBar, Yelp, or a directory). If a competitor is bidding on the brand term, that's a Google Ads brand-defense decision. If organic content is outranking, we need:
- Verify Organization + WebSite JSON-LD on the homepage
- Verify GMB / Google Business Profile is claimed and active
- Audit social profiles (Instagram, Facebook) for brand-name consistency

This is investigative, not code. Don't spawn a chip.

### Action 5 — FAQ + HowTo schema on `/blog/15-unique-birthday-party-ideas-in-austin-for-adults` (CODE — Action A3)

7 queries on this page improved position but lost all clicks. Classic AI-overview / featured-snippet capture. Mitigations:
- Add `FAQPage` JSON-LD with the 5–8 questions Google is currently answering inline
- Restructure the top of the post into a 40-50 word answer paragraph for snippet capture
- Add a clear "what's in this guide" list near the top

This is editorial + on-page. Code chip-worthy if it's done via a shared blog-post FAQ component pattern; operator-action if done by editing the post body. (Spawn-task target — JSON-LD pattern is reusable.)

---

## Open questions for the operator

1. **Was there a Google update on or around 2026-05-15 to 2026-05-25?** The slide pattern is uniform across the homepage cluster. Worth checking Google's update history page to rule out an algorithmic confound.
2. **Brand SERP screenshot** — please incognito-search "party on delivery" from Austin and send the SERP. Without seeing the top 4 it's guesswork.
3. **Did anyone touch the homepage `<h1>` / `AnimatedHeroText` in the May–June window?** No commit on `main` for `src/app/page.tsx` since April per `git log`, but the H1 may live in a deeper component. Worth a `git blame` on `AnimatedHeroText`.
4. **www subdomain leak** — 23 → 19 clicks/window are still on `www.partyondelivery.com`. Middleware does 301 but Google still has both indexed. Submit a non-www sitemap and confirm in GSC's "Domain property" view.
5. **Old Shopify `/blogs/news/...` URLs** — 34 impressions to `/blogs/news/austin-party-houses-bachelor-party-...`. Should this be 301'd to the `/blog/...` equivalent? Worth a sweep.

---

## What I deliberately did NOT do

- **Write product content** — 174 thin product pages are an editorial sprint, separate from this investigation.
- **Backlink outreach plan** — top-50 lost queries show no backlink-driven loss; B-bucket is empty.
- **Disavow** — no signal of a backlink penalty in this snapshot.
- **Re-fix CWV or duplicate titles** — PR #112 handled those.
- **Touch the wedding cluster** — wedding queries actually gained ground (+523 impressions, 81 → 187 indexed queries). Don't disturb.

## Addendum — what we learned and shipped after this doc (2026-06-10)

The same-day follow-up session (code + operator-side investigation) revised and extended the findings above:

### Findings revised

1. **May 2026 Core Update is the likely proximate trigger.** Google ran a core update May 21 – ~June 1 — entirely inside the "current" GSC window. The uniform homepage-cluster slide is consistent with a core-update re-rank amplified by our pre-existing weaknesses (H1 mismatch, 61% zombie catalog — see below). The H1 fix remains correct but is necessary-not-sufficient; core-update recoveries take 4–8 weeks.
2. **Brand SERP (#2 in TL;DR) is NOT eroding.** Live SERP inspection showed partyondelivery.com holds positions 1–7 for "party on delivery" with a maximal 13-sitelink block and no competitor in the top 5. The GSC 2.2 → 4.5 average is an artifact of averaging across brand-adjacent queries (reviews/promo-code/comparison variants) plus sitelink CTR redistribution. **Action 4 (brand defense) is closed — no action needed.**
3. **The "174 thin product pages" framing was wrong.** Full-catalog sweep found **325 of 535 indexed product URLs (61%) are ARCHIVED or orphaned**, leaking ~19,000 impressions/60d — a sitewide "unhelpful content" signal that core updates punish. The thin-content editorial problem is real but much smaller (13 active pages in the top-30).
4. **H1 anti-pattern was not a regression** — `git blame` dates it to 2026-02-13 (~4 months old). It predates the drop; the Core Update is what made it start costing us.

### Shipped

- **PR #117** (merged 2026-06-10): H1↔title alignment on `/`, landing pages, boat/corporate; blog FAQPage schema plumbing + birthday post; `/blogs/news/*` → `/blog/*` consolidation; DJ partner H1.
- **PR #119** (open): 326 redirects for archived/orphan product URLs → category pages.
- **GBP** (operator, same day): added secondary categories (Beer store +, more saved and propagating) and service areas (Westlake, Bee Cave, Lakeway, Lake Travis). Primary category left as "Liquor store" to avoid re-verification.
- **New docs:** [product-page-editorial-sprint-2026-06.md](product-page-editorial-sprint-2026-06.md), [archived-product-pages-2026-06.csv](archived-product-pages-2026-06.csv), [local-backlink-outreach-2026-06.md](local-backlink-outreach-2026-06.md), [press kit](../../marketing/press-kit.md).
- **DR baseline captured:** partyondelivery.com **DR 12** vs do512 70 / drizly 76 / totalwine 78 / Eater Austin 90.

### Revised monitoring plan

- **Re-measure 2026-07-08** (not 2026-06-24 as stated above) — needs ≥4 weeks for Core Update + PR #117/#119 propagation. Run `node scripts/seo/pull-gsc-keyword-loss.mjs` with windows shifted forward.
- Success criteria at re-measure: homepage cluster recovers ≥5 positions on the `[modifier] alcohol delivery austin` queries; archived-URL impressions decline (falling out of index) while total clicks hold or grow; FAQ rich result appears for the birthday post (check Rich Results Test ~1 week post-merge).
- Next SEMrush weekly capture: duplicate-H1/title count should drop from 123 → ~0 (PR #112 + #117 combined).

## Provenance

- GSC raw data pulled 2026-06-10 via [scripts/seo/pull-gsc-keyword-loss.mjs](scripts/seo/pull-gsc-keyword-loss.mjs), saved to [keyword-recovery-2026-06-raw.json](keyword-recovery-2026-06-raw.json).
- SEMrush snapshot reference: `data/seo/semrush/2026-06-04/` on `seo-snapshots` orphan branch (5 dashboards, all `ok:true`).
- PR #112: [partyondelivery/PartyOn2#112](https://github.com/partyondelivery/PartyOn2/pull/112) merged 2026-06-10T16:01Z. PR #114 (dev → main) merged 2026-06-10T16:53Z. PR #117 merged 2026-06-10T18:02Z. PR #119 opened 2026-06-10.
- Reference brief: SEMrush position-tracking 2026-05-06 vs 2026-06-04 (visibility 25.7% → 8.8% — distorted by tracked-basket sensitivity).
- Core update: [Google Search Status Dashboard](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history) — May 2026 core update, started 2026-05-21, completed ~12 days.
