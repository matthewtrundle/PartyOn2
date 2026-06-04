---
adr: S0002
title: Wedding cluster prioritization over alcohol-delivery cluster expansion
status: accepted
date: 2026-05-20
deciders: operator (allan), seo-director agent
supersedes: none
related: S0001-recommendation-storage-model.md
---

# S0002 — Wedding cluster prioritization

## Context

The 2026-05-19 SEMrush Position Tracking snapshot covered 66 keywords (Austin, Desktop). After triage:

- Alcohol-delivery cluster: 38 keywords, ~700 total monthly volume, 11 keywords at position #1.
- Wedding cluster: 28 keywords, ~17,680 total monthly volume, 0 keywords ranked.

The two clusters represent 96% / 4% of tracked volume, inverted from where engineering effort had been going.

## Decision

Engineering effort for 2026-H1 moves to the wedding cluster. Five workstreams shipped 2026-05-20:

1. `/wedding-drink-calculator` — target "wedding drink calculator" (vol 1,900, KD 8).
2. `/austin-wedding-venue-boats` — target value-segment venue cluster.
3. `/partners/austin-wedding-dj` — target "wedding dj austin" (vol 390, KD 8).
4. Blog audit + cluster refinement.
5. SEO Director memory integration.

## Consequences

- We accept that the existing #1 alcohol-delivery rankings will remain "won" (we don't actively expand them) until the wedding cluster is in motion. Those rankings are low-volume so the opportunity cost is small.
- We accept that "austin wedding venues" head term (KD 50, vol 2,900) is NOT targeted — the page targets the value-segment cluster instead. Revisit if the value-segment cluster is captured and we have authority to push upmarket.
- We accept that "wedding dresses austin" (vol 590) is removed from Position Tracking — POD doesn't sell dresses.
- We accept that the existing `WeddingOrderCalculator.tsx` on `/weddings` coexists with the new `/wedding-drink-calculator` page. Decide at 90 days based on conversion data.

## How we'll measure this

- W22-W30 briefings track impressions + position for the S-tier wedding keywords.
- 90-day review: revisit whether the value-segment strategy is paying off, or whether we need to invest in the head term separately.

## Rejected alternatives

- **Expand the alcohol-delivery cluster** by adding long-tail variations. Rejected because each new keyword would carry sub-50 monthly volume. Compounding effort on low-vol terms is dominated by chasing wedding cluster wins.
- **Buy ads on wedding terms instead of SEO**. Considered. SEO compounds; ads don't. Both can run, but SEO is the foundation we don't have yet.
- **Build a wedding-DJ pillar blog cluster first**. Rejected because we don't have DJ assets yet AND because commercial intent on "wedding dj austin" is better served by a partner page than a blog post.
