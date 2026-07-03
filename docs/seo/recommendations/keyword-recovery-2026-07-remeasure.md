# Keyword recovery — 2026-07 re-measurement (4-week check)

**Author:** seo-director (automated scheduled re-measurement).
**Measured:** 2026-07-02.
**Current window:** GSC 2026-06-09 → 2026-07-07 (requested) — **actual final data 2026-06-09 → 2026-06-30, 22 days** (GSC's ~2-day final-data lag truncates it; today is 2026-07-02).
**Baseline window:** GSC 2026-05-06 → 2026-06-04 (30 days) — this was the "current" window in the June diagnosis, now the baseline.
**Raw data:** [keyword-recovery-2026-07-remeasure-raw.json](keyword-recovery-2026-07-remeasure-raw.json). June baseline raw is preserved at [keyword-recovery-2026-06-raw.json](keyword-recovery-2026-06-raw.json).
**Reference:** [keyword-recovery-2026-06.md](keyword-recovery-2026-06.md) (diagnosis + success criteria in its Addendum).

---

## Executive verdict: **PARTIAL recovery**

The two *mechanical* fixes worked; the one *ranking* fix did not.

- ✅ **Zombie catalog cleanup (PR #119) is working well.** Impressions to archived `/products/` URLs fell **−69% per day** (282.6/day → 87.5/day) and the count of distinct archived URLs still pulling impressions dropped **283 → 173**. They are falling out of the index exactly as intended.
- ✅ **Birthday-blog FAQ (PR #117) recovered.** The adult-birthday query family gained clicks **+85% per day** (1.13/day → 2.09/day); the headline query "adult birthday party ideas" went **0 → 3 clicks** with position improving to 16.2. The FAQ rich-result plumbing is capturing clicks again.
- ❌ **Homepage alcohol-delivery cluster did NOT recover — the #1 target failed.** **0 of 9** tracked queries recovered the ≥5-position success bar. 8 of 9 are flat or *worse*; only one ("best alcohol delivery austin") improved at all (+4.8, just short). All 9 remain 0-click. This is the single most load-bearing criterion and it regressed further.

**Bottom line:** The H1↔title fix and the 326 redirects did their jobs — but on-page fixes alone can't move a **DR-12** site up page 2–4 for head terms owned by DR 70–90 competitors (Drizly, Total Wine, Reserve Bar). The remaining recovery is now an **off-page authority + content-depth** problem, not an on-page one. Do not redo the H1 or redirect work.

### Two measurement caveats (read before reacting to the numbers)

1. **Window is 22 days, not 30.** GSC final data only runs through 2026-06-30. All *absolute totals* below are day-normalized (per-day) for fair comparison. *Position* and *per-query* metrics are averages and are unaffected by window length.
2. **Measured ~3 weeks post-fix, not the planned ≥4.** PR #117/#119 merged 2026-06-10/11; last data is 2026-06-30 (~20 days later). The intended re-measure date was 2026-07-08. A core-update recovery needs 4–8 weeks, so the homepage-cluster failure is measured slightly early — but the trend is clearly *negative*, not stalled-but-improving, so waiting is unlikely to flip the verdict on its own.

---

## Per-criterion results

| # | Criterion | Target | Result | Verdict |
|---|---|---|---|---|
| 1 | Homepage cluster recovers ≥5 positions | 9 queries improve ≥5 | 0/9 met bar; 8/9 flat-or-worse; all still 0-click | ❌ **Fail** |
| 2 | Archived `/products/` impressions declining, clicks flat/up | Impr down, URLs de-indexing | Archived impr −69%/day; 283→173 URLs indexed | ✅ **Pass** |
| 3 | Birthday-blog FAQ regains clicks | "adult birthday" family clicks up | Family clicks +85%/day; "adult birthday party ideas" 0→3 | ✅ **Pass** |
| 4 | Overall clicks vs baseline | Clicks flat or up | Clicks −11%/day; impr −36%/day (mostly intended de-indexing) | ⚠️ **Mixed** |

### Criterion 1 detail — homepage cluster (all land on `/`, all 0-click both windows)

| Query | Baseline pos (Jun) | Current pos | Δ (＋ = improved) | ≥5? |
|---|---:|---:|---:|:---:|
| best alcohol delivery austin | 17.2 | 12.3 | **+4.8** | no |
| delivery alcohol austin | 20.8 | 21.1 | −0.2 | no |
| alcohol delivery company austin | 18.2 | 20.9 | −2.7 | no |
| bachelor party alcohol delivery austin | 21.4 | 24.6 | −3.3 | no |
| alcohol delivery austin near me | 21.2 | 25.3 | −4.1 | no |
| best alcohol delivery in austin | 18.3 | 23.3 | −5.0 | no |
| bachelorette party alcohol delivery austin | 24.8 | 32.5 | −7.7 | no |
| alcohol delivery service austin tx | 16.2 | 24.1 | −7.9 | no |
| alcohol delivery in austin tx | 15.8 | 36.1 | −20.4 | no |

Uniform non-recovery on the same page — consistent with an authority ceiling, not a fixable on-page defect. These are also thin-impression queries (20–40 impr each over 22 days), so individual positions are noisy; the *direction* (net worse) is the signal.

### Criterion 2 detail — zombie catalog de-indexing (working)

| Metric | Baseline (30d) | Current (22d) | Per-day change |
|---|---:|---:|---:|
| Archived-URL impressions | 8,478 | 1,925 | **−69%** (282.6 → 87.5/day) |
| Distinct archived URLs still indexed | 283 | 173 | −39% |
| Archived-URL clicks | 13 | 2 | (low-value; expected) |
| All `/products/` impressions | 17,040 | 6,380 | −49%/day |
| All `/products/` clicks | 48 | 10 | −41%/day |

The redirects are consolidating dead URLs out of the index as designed. This is also the main driver of the overall impression drop in Criterion 4 — those impressions were not converting (48 product clicks in 30 days across the *entire* catalog).

### Criterion 3 detail — birthday blog FAQ (recovered)

| Metric | Baseline (30d) | Current (22d) | Per-day change |
|---|---:|---:|---:|
| Adult-birthday family clicks | 34 | 46 | **+85%** (1.13 → 2.09/day) |
| "adult birthday party ideas" clicks | 0 | 3 | recovered (pos → 16.2) |
| "austin birthday ideas" clicks | 1 | 5 | up |
| "things to do in austin for birthday" clicks | 0 | 3 | up |

Not every query recovered ("birthday ideas austin" slipped 6→2), but the family net-gained clicks and the specific query the June doc flagged for SERP-feature theft is capturing clicks again.

### Criterion 4 detail — overall (day-normalized)

| Metric | Baseline (30d) | Current (22d) | Per-day change |
|---|---:|---:|---:|
| Total clicks (date-dim, authoritative) | 438 | 285 | **−11%** (14.60 → 12.95/day) |
| Total impressions (date-dim) | 48,539 | 22,832 | **−36%** (1,618 → 1,038/day) |
| Total clicks (by-query sum, June methodology) | 134 | 94 | — |
| Total impressions (by-query sum) | 29,240 | 14,152 | — |

The −36% impression fall is substantially the *intended* zombie de-indexing (Criterion 2) plus the tail of the May Core Update settling. Clicks per-day are down a softer −11% — not recovery, but not collapse. (Note: date-dimension totals are ~3× the by-query sums because GSC hides low-volume/anonymized queries; the by-query line is shown only to match the June doc's stated baseline of 134/29,240.)

---

## Recommended next actions (only Criteria 1 & 4 need them)

The two on-page fixes are done and validated — **do not redo the H1 or redirect work.** The homepage-cluster miss points at off-page authority and content depth, which is what the June follow-ups already queued:

1. **Backlink outreach — the highest-yield lever now.** DR 12 vs competitors' DR 70–90 is the binding constraint on the head-term cluster. Execute [local-backlink-outreach-2026-06.md](local-backlink-outreach-2026-06.md); the June note flags the **affiliate-partner link audit as the highest-yield first move** (partners who should already be linking to us). Operator/outreach work.
2. **Editorial sprint Tier 1 (4 pages).** Rewrite the 4 already-converting product pages to the Electric-Jellyfish template in [product-page-editorial-sprint-2026-06.md](product-page-editorial-sprint-2026-06.md) (aperol-spritz-party-pitcher, karbach-love-street, la-marca-prosecco, + refresh electric-jellyfish). Compounds existing demand and builds the topic graph core updates reward.
3. **Internal-linking sprint (~4 hr eng).** Link Tier-1/Tier-3 products from `/austin-bachelor-party-delivery`, `/boat-parties`, `/weddings`, and blog posts — builds internal authority toward `/` and the product cluster without needing external links.
4. **Re-measure again 2026-08-05** with the same script (shift windows to current: 2026-07-08→08-04, prior: this window). Two reasons: (a) this pull is ~1 week early vs the intended 4-week mark, and (b) it establishes whether the cluster is still eroding or has bottomed. If the cluster is *still* falling after backlink work begins, escalate to a SERP-composition study (is `/` even the right page to rank, or should a dedicated `/alcohol-delivery-austin` landing page own the head term?).

Criteria 2 and 3 need no further action — keep monitoring that archived-URL impressions continue toward zero.

---

## Provenance

- GSC pull via `scripts/seo/pull-gsc-keyword-loss.mjs` (run 2026-07-02) with `windows.current = {2026-06-09 → 2026-07-07}`, `windows.prior = {2026-05-06 → 2026-06-04}`, output redirected to `keyword-recovery-2026-07-remeasure-raw.json`. The script's committed default windows are left at their June values (each re-measure edits them locally); this run's window/filename overrides are recorded here rather than committed to the script.
- Day-coverage, date-dimension totals, and archived-URL rollups computed against the raw JSON + [archived-product-pages-2026-06.csv](archived-product-pages-2026-06.csv) (325 archived handles).
- PR #119 (326 archived/orphan redirects) confirmed **merged 2026-06-11**. PR #117 (H1↔title + FAQ schema) merged 2026-06-10.
- Baseline cluster positions sourced from the table in [keyword-recovery-2026-06.md](keyword-recovery-2026-06.md) (its "current" June window).
