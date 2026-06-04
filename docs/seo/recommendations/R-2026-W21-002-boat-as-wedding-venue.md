---
id: R-2026-W21-002
title: Ship Boat-as-Wedding-Venue landing page
status: proposed
domain: seo
segment: wedding
metric: position-cluster:wedding-venues-value-segment
impact_dollars_monthly: null
effort_tier: m
risk_tier: recommend
source: seo-director
created: 2026-05-20
related_workstream: WS2
---

# R-2026-W21-002 — Boat-as-Wedding-Venue

## Why now

Value-segment wedding-venue cluster carries combined ~1,500 monthly volume at KD 9-13. Cluster is 100% unranked. Premier Party Cruises boats are a real fit for the value segment (cheap, small, intimate, non-traditional) where wedding directories don't list us.

## Target

- Primary: `cheap wedding venues austin` (260 / 12), `small wedding venues austin` (260 / 9), `cheap wedding venues in austin tx` (260 / 13), `austin tx wedding venues on a budget` (110 / 11)
- URL: `/austin-wedding-venue-boats`

## Why not the head term

`austin wedding venues` (vol 2,900, KD 50) intent belongs to venue directories. Premier loses that fight; wins the value-segment fight.

## Change

- New landing config `src/components/landing/configs/wedding-venue-boats.ts` modeled on `wedding.ts`.
- New route `src/app/austin-wedding-venue-boats/page.tsx`.
- Cross-links from `/weddings`, `/partners/premier-party-cruises`, `/boat-parties`.
- `EventVenue` + `LocalBusiness` + `FAQPage` schemas.
- Photo TODOs marked for Premier wedding-specific shots.

## Time horizon

- Indexed: 2-4 weeks
- Impressions on value-segment terms: 4-8 weeks
- Top 30 on any S-tier term: 6-12 weeks

## Status updates

- 2026-05-20: shipped in WS2 PR. Premier wedding-photo TODOs in place.
