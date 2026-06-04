---
period: 2026-W21
captured_at: 2026-05-20
flavour: director-narrative
companion: 2026-W21.md
---

# SEO Director Briefing — 2026-W21 (narrative)

## What changed this week

We re-pointed organic strategy at the **wedding cluster** after a full SEMrush triage exposed the structural mismatch between what we rank for and what has real demand:

- 38 keywords in the alcohol-delivery cluster carry ~700 total monthly volume. 11 of those are at position #1 — they're vanity rankings on near-zero-demand long-tails.
- 28 keywords in the wedding cluster carry ~17,680 total monthly volume — and we rank for **none** of them.

The team's been building wedding capacity in the business for months. The SEO didn't reflect it. This week's five PRs close that gap.

## What I'd watch over the next 30 days

1. **`wedding drink calculator`** (vol 1,900, KD 8) is the highest single-keyword ROI in the dataset. The new `/wedding-drink-calculator` page is a calculator-IS-the-page Google rewards heavily. Expect to see impressions inside 2-3 weeks, position improvements 4-8 weeks.
2. **Venue value-segment cluster** (cheap/small/intimate/budget wedding venues austin) — combined ~1,500 vol at KD 9-13. The new `/austin-wedding-venue-boats` page targets these directly; it deliberately avoids the head term ("austin wedding venues" KD 50) because intent there belongs to venue directories.
3. **`wedding dj austin`** (vol 390, KD 8) — captured by `/partners/austin-wedding-dj`. Asset placeholders are intentional; user fills in `[DJ_NAME]` etc. when the partner is signed.

## What I'd flag for next session

- **Re-check indexation** of the five new URLs in GSC at W22. The 2026-03-30 audit reported 0/1,289 — verify whether new pages are getting picked up or stuck on `discovered – currently not indexed`.
- **Blog audit dupes** (WS4) — confirm 301 redirects fire correctly in production after merge. Some are wedding-venue posts that should now point at `/austin-wedding-venue-boats` rather than each other.
- **Decide on wedding-calculator deprecation** at 90 days. Two calculators (`/wedding-drink-calculator` public + `WeddingOrderCalculator.tsx` on `/weddings`) coexist for now — measure which converts before consolidating.

## Hard stops (still active)

- TABC compliance copy on any new page — none touched.
- Pricing claims on calculator results — none added (counts only).
- Anything in `src/lib/legal/` — untouched.

## Data freshness

- SEMrush snapshot: 2026-05-19 (1 day old). All keyword recs in this briefing pass the 14-day gate.
- GSC: not consulted; freshness gate would have required a recent snapshot. Re-run next week.
