# Ad Campaign UTM Convention

_Last updated: 2026-05-24 (Phase B prep for first wedding campaign)_

## Why this exists

Every paid ad that drives a click to partyondelivery.com **must** carry the standard UTM parameters listed below. Two things break when they don't:

1. **Segment misattribution.** `src/lib/analytics/segment-classifier.ts` falls back to `utmCampaign` when the visitor lands on a non-segment-prefixed page (e.g. `/order`). Without the right `utm_campaign` value, those orders silently bucket as `'general'`.
2. **Campaign-level ROAS reporting impossible.** `Order.utmCampaign` is the only column that distinguishes one ad campaign's revenue from another within the same segment. Without it, we can't tell whether bachelor or bachelorette ad spend is driving more revenue — they both classify as the `'bach'` segment.

## The parameters

| Parameter | Required | Standard values |
|---|---|---|
| `utm_source` | Yes | `google` \| `facebook` \| `instagram` \| `pinterest` \| `tiktok` \| `youtube` \| `email` |
| `utm_medium` | Yes | `cpc` (paid search) \| `display` (paid display) \| `social` (paid social) \| `email` (newsletter, transactional) \| `affiliate` (partner referral) |
| `utm_campaign` | Yes | Use the canonical campaign slugs from the table below — no abbreviations, no spaces, dash-separated |
| `utm_content` | Yes | Ad variant id or descriptor. Used to split A/B test variants of the same campaign |
| `utm_term` | Optional | Auto-filled by Google Ads with `{keyword}` macro — leave that as-is |

## Canonical `utm_campaign` slugs

Each campaign maps to one slug. Don't invent new ones — extend this table first.

| Campaign | Canonical slug | Lands on | Segment (auto-classified) |
|---|---|---|---|
| Wedding (calculator-targeted) | `wedding-bar-delivery` | `/wedding-drink-calculator` | `wedding` |
| Wedding (weekend Wes page) | `wedding-bar-delivery` | `/austin-wedding-weekend-delivery` | `wedding` |
| Bachelor party | `bachelor-party-delivery` | `/austin-bachelor-party-delivery` | `bach` |
| Bachelorette party | `bachelorette-party-delivery` | `/austin-bachelorette-party-delivery` | `bach` |
| Corporate event | `corporate-event-delivery` | `/austin-corporate-event-delivery` | `corporate` |
| Lake Travis / Boat party | `lake-travis-delivery` | `/boat-parties` (until Wes page exists) | `boat` |
| Keg delivery | `keg-delivery-austin` | `/kegs` | `kegs` |

**Reuse note:** wedding-calculator and wedding-weekend ads share `utm_campaign=wedding-bar-delivery` because they target the same business segment. They're separated by `utm_content` (e.g. `utm_content=calculator-hero` vs `utm_content=wedding-weekend-hero`).

**Bachelor vs bachelorette gotcha:** `'bachelorette-party-delivery'.includes('bach')` returns true, so the segment classifier maps both campaigns to the `'bach'` segment. This is intentional — both are the bach-party business category. To split bachelor vs bachelorette in reporting, query `Order.utmCampaign`, NOT `Order.segment`.

## Example URLs

**Wedding campaign #1 (first launch, calculator-targeted):**
```
https://partyondelivery.com/wedding-drink-calculator?utm_source=google&utm_medium=cpc&utm_campaign=wedding-bar-delivery&utm_content=calculator-hero&utm_term={keyword}
```

**Bachelorette campaign (Phase 2):**
```
https://partyondelivery.com/austin-bachelorette-party-delivery?utm_source=google&utm_medium=cpc&utm_campaign=bachelorette-party-delivery&utm_content=lake-day-night-variant-a&utm_term={keyword}
```

**Email re-engagement to past wedding leads:**
```
https://partyondelivery.com/wedding-drink-calculator?utm_source=email&utm_medium=email&utm_campaign=wedding-bar-delivery&utm_content=2026-summer-reactivation
```

## How to verify a new campaign is tagged correctly

1. Build the ad URL with all required parameters.
2. Paste into a browser. Confirm the landing page loads correctly.
3. Open browser DevTools → Network tab. Find the first `/api/...` request after page load (typically a lead-capture or attribution ping).
4. Confirm the request body or query params include the UTM values.
5. Submit a test quote (if you can complete the flow without paying).
6. Query `Order.utmCampaign` and `Order.segment` for the test order. Both must match expectations.

Sample verification query:
```sql
SELECT id, "createdAt", "landingPage", "utmSource", "utmCampaign", "utmContent", segment, total
FROM orders
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC LIMIT 5;
```

## When the classifier needs updating

Add a new path prefix to `src/lib/analytics/segment-classifier.ts` whenever you publish a new segment landing page. Add the matching campaign to the canonical slugs table above. Both must be deployed before the ad goes live.

If you ever want to split bachelor and bachelorette as separate `Segment` values (instead of both being `'bach'`):

1. Add the new value to the `Segment` type at `src/lib/analytics/segment-classifier.ts:8` and the `SEGMENTS` array at line 16
2. Update all downstream rollups that loop over `SEGMENTS` (see `src/lib/analytics/internal-rollups.ts` and `cohort-rollups.ts`)
3. Update dashboard charts that iterate segments
4. Run a backfill on historical orders: `npx tsx scripts/backfill-order-segments.ts`

This is a medium-effort change. Don't take it on unless campaign-level reporting actually needs it.

## Cross-references

- Strategy doc Campaign 4 (Wedding): `/Users/allan/Projects/Obsidian/Obsidian/PartyOn2/Memory/Marketing/Plans/2026-05-14-ad-creatives-and-pinterest.md`
- Audit deliverable (2026-05-24): see Section 8 of agent `a8064e71a595bdae7` transcript
- Classifier source: `src/lib/analytics/segment-classifier.ts`
- Order attribution columns: `Order.landingPage`, `Order.utmSource`, `Order.utmMedium`, `Order.utmCampaign`, `Order.utmContent`, `Order.utmTerm`
