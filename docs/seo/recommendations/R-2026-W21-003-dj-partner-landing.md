---
id: R-2026-W21-003
title: Ship Austin Wedding DJ partner landing page
status: proposed
domain: seo
segment: wedding
metric: position:wedding-dj-austin
impact_dollars_monthly: null
effort_tier: m
risk_tier: recommend
source: seo-director
created: 2026-05-20
related_workstream: WS3
---

# R-2026-W21-003 — Austin Wedding DJ partner landing

## Why now

`wedding dj austin` — vol 390, KD 8, commercial intent. We have a DJ partner ready to onboard.

## Target

- Keyword: `wedding dj austin` (vol 390, KD 8) + `austin wedding djs` (170 / 28)
- URL: `/partners/austin-wedding-dj`

## Change

- New partner entry in `src/lib/partners/landing-pages.ts`.
- Custom landing route `src/app/partners/austin-wedding-dj/page.tsx` modeled on Premier page.
- Booking form posts to `/api/partners/dj-inquiry` (Zod-validated).
- `?ref=` referral propagation wired.
- `Person` + `LocalBusiness` + `Service` + `FAQPage` schemas.
- Asset placeholders: `[DJ_NAME]`, `[DJ_PHOTO]`, `[DJ_BIO]`, `[DJ_SAMPLE_VIDEO]`.

## Asset gate

Cannot drive traffic until DJ assets are filled. Page is live with placeholders so the engineering work is done; operator fills assets when the DJ is signed.

## Time horizon

- Indexed: 2-4 weeks
- Driving traffic: blocked until assets are filled
- Position improvement: 4-10 weeks AFTER assets are filled

## Status updates

- 2026-05-20: shipped in WS3 PR. Placeholders need operator fill before promoting.
