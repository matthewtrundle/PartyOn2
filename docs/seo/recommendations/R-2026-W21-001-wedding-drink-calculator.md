---
id: R-2026-W21-001
title: Ship public Wedding Drink Calculator page
status: proposed
domain: seo
segment: wedding
metric: position:wedding-drink-calculator
impact_dollars_monthly: null
effort_tier: m
risk_tier: recommend
source: seo-director
created: 2026-05-20
related_workstream: WS1
---

# R-2026-W21-001 — Wedding Drink Calculator

## Why now

`wedding drink calculator` — vol 1,900, KD 8, commercial intent. Highest single-keyword opportunity in the 2026-05-19 triage. We don't rank for it.

## Target

- Keyword: `wedding drink calculator`
- URL: `/wedding-drink-calculator`
- Volume / KD: 1,900 / 8

## Change

- New public route at `/wedding-drink-calculator` reusing `src/lib/drinkPlannerLogic.ts`.
- Lead-capture API expanded to accept `partyType=wedding`, guests 5-300, hours 2-12.
- Internal links from `/weddings`, navigation services dropdown, footer, sitemap.
- HowTo + FAQPage schema.
- Content panel ~800-1000 words covering the math, common mistakes, Austin TABC notes (no compliance claims).

## Time horizon

- Indexed: 2-4 weeks
- First impressions: 3-6 weeks
- First position improvement: 6-10 weeks

## Status updates

- 2026-05-20: shipped in WS1 PR.
