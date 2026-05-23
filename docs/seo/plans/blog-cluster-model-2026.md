---
title: Blog Cluster Model 2026
status: active
owner: seo-director
created: 2026-05-20
source: src/lib/topic-clusters.ts + WS4 blog audit
---

# Blog Cluster Model — 2026

Refined as part of WS4. Three new wedding sub-clusters added to `src/lib/topic-clusters.ts`.

## Existing pillar clusters (kept)

| Pillar | Cluster posts | Service URL |
|--------|---------------|-------------|
| `ultimate-guide-austin-corporate-events` | 15 | `/corporate` |
| `ultimate-guide-austin-bachelor-parties` | 10 | `/bach-parties` |
| `ultimate-guide-austin-bachelorette-parties` | 6 | `/bach-parties` |
| `ultimate-guide-austin-weddings` | 12 → expanded | `/weddings` |
| `ultimate-guide-lake-travis-boat-parties` | 3 | `/boat-parties` |

## New wedding sub-clusters (WS4)

| Sub-cluster | Pillar / hub | Service URL | Notes |
|-------------|--------------|-------------|-------|
| `wedding-venues` | `ultimate-guide-austin-weddings` | `/austin-wedding-venue-boats` | Pulls in venue-focused posts; new boat-as-venue page is the strongest commercial hub. |
| `wedding-budget` | `ultimate-guide-austin-weddings` | `/wedding-drink-calculator` | Calculator page links from "budget", "cost", "how much", "afford" posts. |
| `wedding-vendors` | `ultimate-guide-austin-weddings` | `/partners/austin-wedding-dj` | DJ partner is the first vendor sub-page; future florist/photographer/cake partners join the same cluster. |

## Posts to consolidate (WS4)

Confirmed near-dupes — one canonical, 301 the rest:

- `best-small-wedding-venues-austin.mdx` (canonical)
- `best-small-wedding-venues-near-austin.mdx` → 301 to canonical

Suspected dupes (review during next audit pass):

- `rustic-modern-wedding-decor-texas` ↔ `how-to-blend-rustic-and-modern-wedding-decor-in-texas`
- rehearsal-dinner posts (multiple)
- wedding-photography posts (multiple)

## Cluster health rules

- Pillar must have ≥3 cluster posts to count as live. Pillars currently below threshold:
  - `ultimate-guide-ut-tailgating-austin` (0 clusters)
  - `ultimate-guide-austin-birthday-parties` (0)
  - `ultimate-guide-austin-engagement-parties` (0)
  - `ultimate-guide-austin-gender-reveals` (0)
  - `ultimate-guide-austin-quinceaneras` (0)
  - These five are skeleton clusters — either populate or remove in the next quarter.
- Every cluster post needs:
  - One internal link to its pillar
  - One internal link to the relevant service page
  - One internal link to a sibling cluster post
- Pillar posts need a `## Cluster index` section listing all cluster posts (auto-generated via `generatePillarLinkSection`).

## What changed in this revision

- Added 3 wedding sub-clusters anchored on the new service pages (WS1/WS2/WS3).
- Documented the canonical-vs-redirect rule for confirmed dupes.
- Flagged 5 skeleton clusters for populate-or-remove.

## Next pass

- Rerun the audit script after the 301s land. Confirm no orphaned cluster references in `src/lib/topic-clusters.ts`.
- Score each cluster by total monthly organic traffic. Prioritize fixing the weakest top-3 clusters in Q3.
