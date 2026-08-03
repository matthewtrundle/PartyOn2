# Corporate Video Production Brief — Q&A Listicle (drafted 2026-07-14, produce FALL 2026 for holiday season)

> **Script written 2026-08-03:** the word-for-word shoot script is at
> [corporate-video-script-2026-08.md](./corporate-video-script-2026-08.md). Shoot-ready except for
> **3 claims awaiting Allan's sign-off** — the tax-deductibility wording, the n=11 product claim,
> and remote-employee kit shipping (Q10 is written two ways because the capability doesn't appear
> to exist).

Same format as [bach-video-brief-2026-07.md](./bach-video-brief-2026-07.md). Timing: **shoot September, publish by early October** — corporate holiday-party planning search starts rising in October, venues book by early November.

Evidence: `data/seo/semrush/2026-07-09/keyword-magic-corporate-event-ideas.txt`, `data/seo/semrush/2026-07-14/keyword-magic-QUESTIONS-office-party.txt` + `keyword-magic-QUESTIONS-holiday-party.txt`, `data/seo/serp-paa/2026-07-14-wedding-corporate.md`, `data/seo/internal-data-wedding-corporate-2026-07-14.md`.

## Why this angle (and not the others) — from the data

1. **Question-answering demand barely exists for corporate drinks** — validated twice: "corporate event drinks" is 110/mo total; office-party planning questions run ~20/mo each; the "office party" question cluster is polluted by a movie and The Office episodes. The corporate audience *browses ideas*, it doesn't ask drink questions.
2. **The idea cluster is the prize**: "corporate event ideas" 1,900/mo KD20 (13,450/mo across 1,285 kws, CPC $3–5), with a seasonal spike cluster — corporate christmas/holiday event ideas ~230/mo — and the single best corporate question found anywhere: **"how to plan a corporate holiday party" — 70/mo at KD 0.**
3. **Video incumbents are stale on both engines**: no video pack on either corporate Google SERP; top YouTube result for "office holiday party ideas" is 7 years old (27K views). "corporate event ideas" is the top live YouTube autocomplete.
4. **The differentiator chapter nobody makes**: tax questions ("are office parties tax deductible", QuickBooks expense categorization, ~100/mo combined) — real planner anxiety, zero event-content competition. Pair with the COI/TABC compliance answers already on our lander.
5. **Local color**: Reddit r/Austin's "Corporate team event that isn't lame" ranks #1 for Austin searchers — the video's hook should answer that thread by name.

## The 10 questions (= chapters = shorts) — holiday-forward

| # | Chapter question | Target keyword(s) + volume | Evidence | Blog/page destination |
|---|---|---|---|---|
| 1 | What are corporate event ideas that aren't lame? | "corporate event ideas" 1,900/mo KD20 | top YT autocomplete; Reddit r/Austin #1 locally | corporate pillar |
| 2 | How do you plan a corporate holiday party? (the 6-step timeline) | **70/mo KD 0** + template/budget variants | PAA "How to plan a company holiday party?" | [corporate-holiday-party-ideas post](../../content/blog/posts/corporate-holiday-party-ideas-for-austin-companies.mdx) + `/corporate/holiday-party` |
| 3 | When do you book? (the September rule) | timing advice in every SERP incumbent | SERP consensus 6–12 mo; our lander offers 72h turnaround as the safety net; internal: median order lead 7 days | `/corporate/holiday-party` |
| 4 | What does a company holiday party cost? | budget variants ("…on a budget") | our published FAQ: $500–2,000, 50-person ≈ $800–1,200; packages $1,499–3,999 | `/corporate/holiday-party` FAQ + `/austin-corporate-event-delivery` packages |
| 5 | Is the company party tax-deductible? | tax cluster ~100/mo (office+holiday) | **the unclaimed chapter** — employee-party 100%-deductible rule; add "ask your CPA" line | NEW short post or holiday lander FAQ addition |
| 6 | How much alcohol for an office party? | ~0/mo on Google — but it's the conversion chapter | CalculatorLanding math: guests × hours × 0.8–1.25; wine 5/bottle, spirits 17; NA drinks = guests × 2 | `/corporate/holiday-party` (calculator embedded) |
| 7 | What do you actually serve? (the premium-and-local truth) | — | internal (n=11, directional): corporates buy Lalo Blanco, Daou, Willamette, Austin Beerworks — "your team notices the good bottles" | `/corporate/products` (Executive Selections) |
| 8 | Happy hours & team-building formats that work | "corporate social event ideas" 110 KD4; happy hour post exists | cocktail-kit team builds, office happy hour | [professional happy hour post](../../content/blog/posts/how-to-host-a-professional-happy-hour-for-your-austin-team.mdx) |
| 9 | Do you need TABC, bartenders, or a COI for an office party? | compliance long tail | lander already answers: TABC #P-200084398, $1M insured, COI on request, corporate cards/ACH | `/austin-corporate-event-delivery` FAQ |
| 10 | How do you include remote employees? | 20/mo but CPC $2.69; "virtual holiday party" ~40/mo | growing planner concern; **shipping-kits capability needs Allan confirmation before scripting** | NEW angle |

Bonus short-only: **"What are the 5 C's of event planning?"** (PAA verbatim — pure snippet-bait).

## Long-form spec

- **Title:** Corporate Event Ideas That Aren't Lame (Holiday Party Edition)
- **Alt:** How to Plan a Company Holiday Party People Actually Enjoy
- **Runtime:** 3:30–4:30, VO-over-b-roll, Allan <10% (hook answering the Reddit thread, the tax-deduction moment, CTA).
- **Hook concept:** "There's a Reddit thread called 'corporate team event that isn't lame' with 460 comments. This is the answer, in four minutes."
- **CTA:** one invoice, delivered cold, 20–500 guests, COI available → `/austin-corporate-event-delivery` + holiday lander's quote form.
- **Seasonality:** front-load holiday framing but keep chapters evergreen (ideas/cost/compliance chapters work year-round; re-cut a spring version by swapping the hook).

## Fixes BEFORE shooting (surfaced by this research)

- ✅ **RESOLVED 2026-08-03** — canon is **wine 5 / spirits 17 per 750ml**. `CorporateEventCalculator.tsx`
  (the MDX one) was the outlier at 4 and 12, in both its math and its on-screen copy, and is fixed;
  `CorporateEventCalculatorLanding.tsx` was already correct. `api/v1/ai-party-planner` was also
  drifted (spirits 25) and is fixed. Every calculator on the site now agrees, so the video can quote
  per-bottle numbers safely. Note the two corporate calculators still model *drink volume* differently
  (`guests × (hours + 0.5)` vs a 0.8/1.0/1.25 multiplier) — that's a modelling choice, not a
  servings conflict, and the script's Q6 example is computed against the live holiday-party calculator.
- **Corporate link-graph gap**: no cluster post links to `/austin-corporate-event-delivery` or `/corporate/holiday-party` (only the pillar → old `/corporate`). Fix alongside the embed PR — the video's blog destinations need the lander links anyway.
- Confirm remote-employee kit shipping (Q10) and whether the "100% buyback on unopened bottles" claim (corporate MDX calculator) is current policy.

## Embed & follow-ups

- Embed on `/austin-corporate-event-delivery` (LandingPageTemplate change — sanctioned no-nav page, own PR) + `/corporate/holiday-party` + the corporate pillar post (VideoObject schema).
- Shorts: Q5 (tax) and Q2 (6-step plan) are the flagship clips; Q1 feeds the evergreen ideas query.
- Measurement baseline: `/corporate` old URL had 820 impressions at pos 24.9 vs canonical lander's 77 — check the 301 consolidation is finishing before attributing video effects (GSC baseline in `data/seo/gsc/2026-07-09-segments.json`).
