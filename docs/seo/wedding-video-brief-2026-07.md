# Wedding Video Production Brief — Q&A Listicle (drafted 2026-07-14, produce FALL 2026)

> **Script written 2026-08-03:** the word-for-word shoot script is at
> [wedding-video-script-2026-08.md](./wedding-video-script-2026-08.md). It is shoot-ready
> except for **4 claims awaiting Allan's sign-off**, one of which (the leftover/refund
> policy) is a hard blocker on Q8 — see "Consistency fixes" below.

Same format as [bach-video-brief-2026-07.md](./bach-video-brief-2026-07.md): one 3–5 min long-form, ~10 keyword-targeted questions as chapters, chopped into per-question shorts. Timing: **produce September 2026** — engagement season peaks Nov–Feb and fall wedding-planning search rises from September.

Evidence: `data/seo/semrush/2026-07-09/keyword-magic-how-much-alcohol-for-wedding.txt` + `keyword-magic-wedding-bar.txt`, `data/seo/semrush/2026-07-14/keyword-magic-QUESTIONS-wedding-alcohol.txt`, `data/seo/serp-paa/2026-07-14-wedding-corporate.md`, `data/seo/internal-data-wedding-corporate-2026-07-14.md`.

## Why this video wins (from the data)

1. **Biggest keyword prize of all three segments**: the wedding-alcohol question cluster alone is 6,180/mo at avg KD 11, plus the open-bar-cost sub-cluster (~2,500/mo, KD 3–18) inside the 85,820/mo "wedding bar" umbrella.
2. **YouTube competition is effectively vacant**: the top "how much alcohol for wedding" video is 5 years old with 10K views; topical shorts sit at 232–1.7K views. Live YouTube autocomplete confirms the phrasing ("how much alcohol for wedding… of 150 / of 200", "wedding bar setup" = top suggestion).
3. **The infrastructure already exists**: `/wedding-drink-calculator` (7 FAQs + HowTo schema, our Google Ad already serving on the money query) and `/weddings` (published $13–26/pp tiers, 6 FAQs, embedded calculator), plus a 12-post wedding cluster that already links to both. The video is the missing media layer on a complete funnel.
4. **The money moment**: venue open bars run **$25–45/pp typical ($15–90 range)** per Zola/Curated/EventWorks — our published DELUXE tier is $26/pp. "Our most expensive package costs what a venue's cheapest open bar costs" is a data-backed haymaker. A top-ranked Facebook answer already says "buy your own" — we're agreeing with the consensus, with receipts.
5. Google has **no video pack** on the how-much SERP (AI Overview + The Knot own it) — the win is calculator-page enrichment, Videos-tab presence, and shorts on the cost queries.

## The 10 questions (= chapters = shorts)

| # | Chapter question | Target keyword(s) + volume | Evidence | Blog/page destination |
|---|---|---|---|---|
| 1 | How much alcohol do you need for a wedding? | cluster ~2,500/mo KD 3–12 ("to buy for a wedding" 390, "for wedding" 170) | live YT autocomplete; our ad serves here | `/wedding-drink-calculator` |
| 2 | How much for 100 / 150 / 200 guests? (worked examples) | "of 100" 90 KD5 + guest-count long tail (~400/mo); PAA "150 person" | YT autocomplete "of 150"/"of 200" | calculator + `/weddings` |
| 3 | How much does an open bar cost — and is it worth it? | "how much is an open bar at a wedding" 720 KD18 + cost cluster ~2,500/mo | PAA verbatim ("Is open bar worth it?") | NEW post or bar-service guide post |
| 4 | Open bar vs buying your own: the real math | "price for open bar at wedding" 390 KD3; "wedding open bar math" (YT) | $25–45/pp venue vs our $13–26/pp tiers | `/weddings` packages section |
| 5 | What's the right liquor/wine/beer split? | "wedding bar menu" 1,600 KD15 adjacent; 50/20/30-rule PAA | calculator math: 30/40/30 full bar, 55/45 beer-wine; internal: weddings are wine-first (whites + bubbly lead) | [ultimate-guide-austin-wedding-bar-service](../../content/blog/posts/ultimate-guide-austin-wedding-bar-service.mdx) |
| 6 | Who pays for the alcohol at a wedding? | "who pays for alcohol at wedding" ~170/mo KD 14–15 | questions pull | wedding pillar |
| 7 | How much champagne for the toast? | champagne/toast long tail | calculator: 1 serving/person, 5 servings/bottle | [signature-wedding-cocktails post](../../content/blog/posts/signature-wedding-cocktails-texas-heat.mdx) |
| 8 | Where do you buy wedding alcohol in bulk — and what about leftovers? | "where to buy alcohol in bulk for wedding" ~330/mo KD 16–19 (transactional!) | questions pull; **buyback policy claim needs Allan confirmation** (published only on the corporate calculator today) | `/weddings` + calculator |
| 9 | Do you need a bartender, license, or insurance to serve at your wedding? | license/insurance questions ~100/mo | `/weddings` FAQ already answers (TABC-certified partners, licensed + insured) | `/weddings` FAQ section |
| 10 | When do you order — and how? | timing long tail | internal: median lead 10 days; recommend 2–3 weeks + calculator first | calculator |

Bonus short-only: **"Do wedding venues water down alcohol?"** (20/mo, maximally spicy, shorts-native).

## Long-form spec

- **Title:** How Much Alcohol Do You Need for a Wedding? (100–200 Guests)
- **Alt:** Wedding Alcohol Math: Open Bar vs Buying Your Own (Real Numbers)
- **Runtime:** 3:30–4:30; same VO-over-b-roll format as bach (Allan <10%: hook, the open-bar-math moment, CTA).
- **Spine:** the calculator's documented rule — `guests × (hours + 1)` drinks (≈600 drinks for 100 guests × 5 hrs), 30/40/30 split, champagne 1/person at 5/bottle. Say the formula on camera; show worked examples for 100/150/200 on screen.
- **CTA:** the free calculator → quote → we deliver cold to the venue. Note the Lake Travis / Hill Country venue delivery answer from the `/weddings` FAQ.
- **Internal-data claims for the fall script (Allan pre-approval, small sample n=15):** avg wedding order ~$1,000; weddings are wine-and-bubbly-first (prosecco + sauv blanc top the list); median order lead 10 days.

## Consistency fixes BEFORE shooting (surfaced by this research)

- ✅ **RESOLVED 2026-08-03 — servings canon is now consistent site-wide.** Allan chose the
  engines' numbers: **wine = 5 glasses / 750ml, spirits = 17 drinks / 750ml, champagne = 5**.
  The audit found *four* components, not three, and two were drifted:
  `CorporateEventCalculator.tsx` used 4 and 12 in both its math and its on-screen copy, and
  `api/v1/ai-party-planner/route.ts` used 25 for spirits behind a comment claiming it mirrored
  the engine. Both fixed. `drinkPlannerLogic.ts`, `wedding-packages/tier-config.ts` and
  `CorporateEventCalculatorLanding.tsx` were already correct. Videos can now quote per-bottle
  numbers that match every calculator on the site.
- ✅ **RESOLVED 2026-08-03 — the real policy is: return up to 25% of the total order unopened, and
  that portion is refunded 100%.** The cap is on *how much* comes back, not on the refund rate.
  Q8 of the wedding script is written and shootable. **But the site still describes this wrongly in
  four places** — the homepage overstates it twice ("100% refund policy" / "Weddings: 100% refund on
  unopened", no cap mentioned), `/wedding-drink-calculator` understates it ("partial refund
  depending on volume" — it isn't partial), and the corporate lander says "free returns on unopened"
  with no cap. Standardize on: **"Return up to 25% of your order unopened for a full refund."**
  Open sub-question: does the 25% cap apply to corporate/bach too, or is it wedding-specific?
- ⚠ **Unrelated drift spotted during the same audit (not fixed, out of scope):** ice quantities
  disagree — `drinkPlannerLogic.ts` recommends 1 bag per 10 guests (≈0.7 lb/guest), the partner
  `DrinkCalculator.tsx` recommends 1 bag per 4 guests, and `CorporateEventCalculatorLanding.tsx`
  computes 1.5–2.0 lb/guest. The bach script already says "one bag per ten," which matches the
  main engine. Worth a decision before any video says a number for ice.

## Embed & follow-ups

- Embed on `/wedding-drink-calculator` (primary; VideoObject schema next to the existing HowTo/FAQ schema) + `/weddings`.
- Shorts: Q3/Q4 (open-bar cost/math) are the flagship clips — the cost SERPs are where shorts surface. Bonus "watered down" short for socials.
- Link graph is already healthy (~10 posts → calculator); no orphan fixes needed on the wedding side.
