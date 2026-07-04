# Google Ads Campaign Tending — 2026-07-02

Prepared as part of the full-site QA triage. Data sources: production Postgres
(leads / orders / group dashboards), GA4 Data API (campaign-scoped sessions +
events), GSC. Spend figures require the Ads UI — placeholders marked ⬜ for the
operator.

## TL;DR

Both live Search campaigns are **failing on delivery, not on conversion
economics**. Over their full lifetimes GA4 attributes just **17 sessions to
bachelor** (live since 6/11) and **3 sessions to wedding** (live since 5/29),
with **zero** attributed `generate_lead` / `purchase` events. The $25 CPL kill
gate can't produce a meaningful verdict at this traffic level — the actionable
problem is that "Eligible (Limited)" throttling plus narrow keyword coverage is
strangling impression volume. Separately, the wedding-drink-calculator lead
spike this week (~42 new contacts) is **not** paid traffic — it's organic/shared
traffic wearing a copy-pasted gclid.

## 1. Delivery + conversion data (2026-05-29 → 2026-07-02)

| Metric | Wedding (`wedding-search-atx-2026-06`) | Bachelor (`bachelor-search-atx-2026-06`) |
|---|---|---|
| GA4 sessions, lifetime | **3** | **17** |
| GA4 `generate_lead` attributed | 0 | 0 |
| GA4 `lead_bachelor` attributed | — | 0 |
| GA4 `purchase` attributed | 0 | 0 |
| DB leads w/ campaign utm | 0 | 0 |
| DB orders / dashboards w/ campaign utm | 0 | 0 |
| Unique ad clicks (gclid) seen in DB leads | ~6 (calculator) | 1 (lander) |
| Spend (Ads UI) | ⬜ $____ | ⬜ $____ |

Notes:
- GA4 `advertiserAdCost` returns $0 via the API — cost import isn't exposed to
  the Data API for this property; read spend from the Ads UI.
- Order/dashboard UTM stamping is wired and verified in code (PR #172); zero
  rows is consistent with near-zero campaign traffic, not a tracking break.

## 2. Kill-gate verdicts

**Bachelor (day-14 gate was ~6/25, now overdue):** at ⬜ actual spend with 0-1
attributable leads, CPL is far above $25 unless spend is trivially small.
**Recommendation: pause OR restructure — do not continue as-is.** The page
itself is healthy (quick_buy tracking live, age-gate exempt, attribution
wired); the campaign simply isn't being served. If spend < ~$150 total, the
cheaper move is restructure (below) before pausing.

**Wedding:** 3 sessions in 5 weeks means the campaign is effectively OFF.
Verify in the Ads UI whether it's actually serving (status, budget pacing,
keyword status after the 6/2 recovery). If spend ≈ $0, there's nothing to
kill — fix serving or fold its keywords into a combined campaign.

**Restructure options (pick in the Ads UI):**
1. Submit the pending policy review for the 7 blocked high-intent
   alcohol-delivery keywords (Tools → Policy manager) — the throttled AG2 is
   where buyer intent lives.
2. Raise bids/budget on the few serving keywords, or switch both campaigns to
   a single combined "occasions" Search campaign to pool learning volume.
3. Day-7/14 search-term hygiene has never been done — export search terms,
   promote high-intent to exact, junk to negatives.
4. If Search stays throttled after the policy review, test Performance Max
   with the same assets (known workaround for alcohol-category Limited status).

## 3. Anomaly: calculator lead spike is NOT paid

Week of 6/29: 50 leads, 44 rows carrying a gclid — but only **2 unique gclids**
across **42 distinct contacts**, and GA4 shows 3 wedding-campaign sessions.
Dozens of different people arrived carrying the *same* click ID → the
calculator URL was shared (group chat / planner list / forwarded email) with a
gclid baked in. Action: find the referrer (ask recent leads how they heard of
us; check GA4 referrer for /wedding-drink-calculator this week) — something is
organically distributing the calculator and it's converting. That channel is
outperforming both paid campaigns combined.

Lead quality caveat: 58 of 60 gclid lead rows are status PARTIAL (calculator
step-captures); only 2 SUBMITTED.

## 4. Attribution gaps found during this analysis (code-side)

- `Lead.metadata.attribution` persists only click IDs (gclid/gbraid) — the UTM
  set captured client-side is not persisted on leads, so campaign-level lead
  attribution depends on gclid → Ads UI lookup. Worth a small follow-up PR to
  persist the full attribution object on lead capture.
- Fixed in this branch: segment classifier missed all `/austin-*` lander paths
  (organic lander traffic classified as `general`); group-order funnel events
  (create/join/lock) now fire; kit-card CTAs now tracked.

## 5. Operator checklist (Ads UI / GA4 Admin — needs Allan or Brian)

- [ ] Pull actual lifetime spend for both campaigns → fill ⬜ above; then apply
      the §2 verdicts.
- [ ] Submit policy review for the 7 rejected AG2 keywords (Tools → Policy
      manager; 1–3 business days).
- [ ] Search-terms report on both campaigns → exact-match promotions +
      negatives (first cleanup since launch).
- [ ] Check wedding campaign serving status — 3 sessions/5 weeks suggests it is
      not spending at all.
- [ ] GA4 Admin → Custom definitions: register `blog_topic`, `blog_slug`,
      `destination_url`, `experiment_id`, `variant_id`.
- [ ] Investigate the calculator's organic spike channel (§3).

## 6. Analytics snapshot health

The nightly cron IS writing (rows exist through 2026-07-02, sessions
populated). The committed `docs/WEBSITE-ANALYTICS.md` placeholder is just a
stale file — prod regenerates it at runtime. One flag: the `orders`/`revenue`/
`paidSessions` scalar columns are 0 on every recent row — verify the hub reads
the JSON rollup fields instead, or the cron's order rollup is broken.
