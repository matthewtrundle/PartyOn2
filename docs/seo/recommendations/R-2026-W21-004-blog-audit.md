---
id: R-2026-W21-004
title: Run full blog corpus audit + cluster refinement
status: proposed
domain: seo
segment: cross-cluster
metric: corpus-health:134-posts
impact_dollars_monthly: null
effort_tier: l
risk_tier: recommend
source: seo-director
created: 2026-05-20
related_workstream: WS4
---

# R-2026-W21-004 — Full blog audit

## Why now

134 MDX posts + ~74 legacy JSON posts. We've never categorized them by cluster + status. Suspected duplicates and orphans are dragging cluster authority.

## Change

- `scripts/seo/audit-blog-corpus.mjs` walks the corpus, emits TSV + Markdown summary.
- `docs/seo/blog-audit-2026-05.{md,tsv}` is the human-readable output.
- `src/lib/topic-clusters.ts` extended with three new wedding sub-clusters: `wedding-venues`, `wedding-budget`, `wedding-vendors`.
- 301 redirects added to `next.config.ts` for confirmed dupes (e.g., `best-small-wedding-venues-near-austin` → `best-small-wedding-venues-austin`).

## Classifications produced

- KEEP: default
- OPTIMIZE: wedding-cluster posts missing schema enrichment indicators
- REDIRECT: near-dupe filenames (slug-distance match)
- DELETE: legacy thin posts not linked from any pillar

## Time horizon

- Redirects live immediately on merge
- Cluster authority impact: 4-12 weeks (Google needs to recrawl)

## Status updates

- 2026-05-20: shipped in WS4 PR. Audit run committed; classifications heuristic-based.
