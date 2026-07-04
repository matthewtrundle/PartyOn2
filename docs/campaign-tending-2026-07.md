# Google Ads Campaign Tending — 2026-07-03 (rev 2)

Prepared as part of the full-site QA triage; **rev 2 fully supersedes the
2026-07-02 version**, which understated campaign traffic ~50× due to a filter
artifact (GA4 `sessionCampaignName` holds the Ads display name, e.g.
`Wedding · Search · ATX · 2026-06`, NOT the utm slug — autotagging overrides
manual UTMs on GA4↔Ads-linked properties. Filtering on the slug missed nearly
everything).

Data: GA4 Data API (sessions/events/cost via the Ads link), production
Postgres (leads/orders/dashboards), 2026-05-29 → 2026-07-02.

## TL;DR

**Wedding is spending real money and failing the kill gate: $877 for zero
orders.** It serves fine (1,195 impressions, 150 clicks) and lands traffic on
`/wedding-drink-calculator`, which captures partial emails but converts nobody.
**Bachelor is delivery-starved**: $55 spent, 256 impressions — throttled into
irrelevance, too little data to judge. Neither should keep running as-is.

## 1. Lifetime performance (5/29 → 7/2)

| Metric | Wedding | Bachelor |
|---|---|---|
| Spend (GA4 Ads link) | **$877.11** | **$55.08** |
| Ad clicks / impressions | 150 / 1,195 | 16 / 256 |
| GA4 sessions | ~168 (158 on the calculator) | ~15 |
| GA4 `generate_lead` | 10 | 0 |
| First-party lead contacts (distinct email/phone) | 59 — 57 PARTIAL, **2 SUBMITTED** | ~1 |
| Orders / group dashboards attributed | **0 / 0** | 0 / 0 |
| CPL vs the $25 gate | **$88** per GA4 lead; **$439** per submitted lead | n/a (no volume) |

Reconciliation notes:
- First-party contacts (59) > GA4 leads (10) because the calculator captures
  emails progressively (PARTIAL rows) that never fire `generate_lead`.
- The duplicate click IDs seen in lead metadata (42 contacts on ~2 IDs) are
  consistent with iOS aggregated `gbraid` tokens, which are shared across
  users by design — NOT evidence of link-sharing (rev 1's theory, retracted).
  Traffic is genuine: referrer google.com, Ads clicks ≈ GA4 sessions.
- Cities skew: Dallas ≈ Austin for calculator cpc traffic — check campaign geo
  targeting; Dallas clicks can't order (delivery is Austin-only) and may be
  half the wasted spend.

## 2. Kill-gate verdicts (day-14 gates overdue since ~6/25)

**Wedding — FAILS the gate. Act now.** $877 → 2 submitted leads, 0 orders.
Options, cheapest lever first:
1. **Fix geo waste**: exclude Dallas/non-deliverable metros (memory says the
   confirmed footprint is Austin/Cedar Park/Westlake/Lake Travis + Gonzales).
   If ~half the clicks are undeliverable cities, true Austin CPL ≈ $44/lead —
   still failing, but less absurd.
2. **Fix the landing experience**: ads land on the calculator, which is a
   lead-capture tool, not an order path. Either point ads at `/weddings`
   (order-focused) or add a strong order CTA + follow-up flow to calculator
   results. 57 PARTIAL emails with no nurture = money left on the table.
3. **Follow up the 59 captured emails** — they're real wedding planners in the
   funnel RIGHT NOW. A single "want us to quote your date?" email may salvage
   the spend.
4. If neither materially moves CPL within ~2 weeks / ~$300 more spend: pause.

**Bachelor — starved, not failing.** $55 total spend can't clear any gate.
Either unthrottle it (policy review below, budget/bid raise) or pause to stop
the dribble. Don't judge the lander on this data.

## 3. Operator checklist (Ads UI / GA4 Admin)

- [ ] **Wedding geo audit**: campaign location targeting + "presence vs
      interest" setting; add negative locations for non-deliverable metros
      (Dallas!). Delivery-footprint exclusions also apply (Round Rock,
      Pflugerville, Leander, Dripping Springs, Buda, Kyle).
- [ ] **Wedding landing URL decision**: calculator vs /weddings (see §2.2).
- [ ] Submit policy review for the 7 blocked high-intent alcohol-delivery
      keywords (Tools → Policy manager; 1–3 business days) — main unthrottle
      lever for bachelor.
- [ ] Search-terms report on both campaigns → exact-match promotions +
      negatives (never done since launch).
- [ ] GA4 Admin → Custom definitions: register `blog_topic`, `blog_slug`,
      `destination_url`, `experiment_id`, `variant_id`.
- [ ] Consider one combined "occasions" campaign to pool learning volume if
      both stay live.

## 4. Analysis gotchas (for future sessions)

- GA4 `sessionCampaignName` = **Ads display name** (`Wedding · Search · ATX ·
  2026-06`) on linked properties; the utm slug appears only for a handful of
  sessions where manual tagging won. Query `sessionMedium = cpc` grouped by
  campaign, never filter by the slug.
- `advertiserAdCost` IS available via `runReport` with plain metrics (no
  Ads-specific dimension needed) — rev 1 claimed it wasn't; wrong query shape.
- Lead UTM columns (`leads.utm_source/…`) populate correctly; click IDs live
  in `metadata.attribution`. iOS `gbraid` tokens are shared across users —
  count DISTINCT contacts, not distinct click IDs.
- A handful of cpc-tagged sessions land on `/ops`, `/admin/finance`,
  `/dashboard/*` with 1 user — that's internal browsing with stale utm params,
  ignore.

## 5. Attribution status (code-side, all landed)

- Group-order attribution: capture confirmed (57/105 dashboards since 6/27).
- Funnel events (create/join/lock), kit-card CTA tracking, segment-classifier
  lander prefixes: shipped in PR #179.
- Nightly snapshot cron writes daily; `orders/revenue` scalar columns read 0 —
  under investigation (may be cosmetic if the hub reads JSON rollups).
