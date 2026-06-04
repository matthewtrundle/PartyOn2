---
title: Wedding Cluster Strategy 2026
status: active
owner: seo-director
created: 2026-05-20
source_triage: data/seo/semrush/2026-05-19/keyword-triage.json (snapshots repo)
horizon: 2026-H1
---

# Wedding Cluster Strategy — 2026

## Why we're shifting focus

The 2026-05-19 SEMrush Position Tracking snapshot exposed a mismatch:

- We are essentially **won** in the alcohol-delivery cluster (38 keywords, ~700 vol total, 11 at pos #1). Each individual keyword is sub-50 monthly volume.
- We are **completely unranked** in the wedding cluster (28 keywords, ~17,680 vol — 96% of the tracked set).

The business already serves weddings — alcohol delivery, Premier Party Cruises as venue, a DJ partner in onboarding. The SEO never reflected it.

## The plan

Five workstreams (executed 2026-05-20):

| # | Page / asset | Target keyword(s) | Vol | KD |
|---|--------------|-------------------|-----|-----|
| 1 | `/wedding-drink-calculator` | wedding drink calculator | 1,900 | 8 |
| 2 | `/austin-wedding-venue-boats` | cheap/small/intimate wedding venues austin (cluster) | 1,500+ | 9-13 |
| 3 | `/partners/austin-wedding-dj` | wedding dj austin | 390 | 8 |
| 4 | Blog audit + cluster refinement | sweeps duplicate posts, adds 3 new sub-clusters | n/a | n/a |
| 5 | SEO Director memory (this doc set) | n/a | n/a | n/a |

## Content angle (avoid the intent-mismatch trap)

We deliberately do NOT target the head term "austin wedding venues" (KD 50, vol 2,900). That intent belongs to wedding-directory sites. Instead we win the **value segment**: cheap, small, intimate, budget, affordable, non-traditional. These have lower KD and Premier's boat genuinely fits where directories don't.

## Why this should compound

- All five pages cross-link. Internal linking compounds over weeks.
- Calculator page is a **calculator-IS-the-page** tool page. Google rewards these once they exist on the open web.
- DJ partner becomes an affiliate — every wedding lead routes alcohol delivery + DJ booking from one funnel.
- Boat-as-venue is the highest-margin add — books the boat through Premier AND the alcohol through direct.

## What we're NOT doing

- Not building a wedding-DJ pillar cluster until the DJ is signed and we have assets. Page first; content cluster later.
- Not targeting "wedding dresses austin" (590 vol) — we don't sell dresses. Removing from Position Tracking.
- Not pursuing "diy wedding venues austin" (vol 0).
- Not replacing the existing `wedding.ts` config or the on-page `WeddingOrderCalculator.tsx`. Both coexist with the new pieces.

## How we'll know it worked

- W22 briefing: any of the 5 new URLs appearing in GSC indexed-set.
- W25 briefing (5 weeks in): impressions on any of the S-tier keywords.
- W30 briefing (10 weeks in): at least one S-tier keyword in the top 30.
- 90-day review: revisit whether `/wedding-drink-calculator` deprecates `WeddingOrderCalculator.tsx` based on conversion data.

## Related artefacts

- `docs/seo/weekly/2026-W21.md` — this week's briefing
- `docs/seo/blog-audit-2026-05.md` — full blog inventory (WS4)
- `docs/seo/decisions/S0002-wedding-keyword-prioritization.md` — decision record
- `docs/seo/plans/blog-cluster-model-2026.md` — refined cluster model
- `docs/seo/plans/partner-landing-strategy.md` — DJ + boats narrative
