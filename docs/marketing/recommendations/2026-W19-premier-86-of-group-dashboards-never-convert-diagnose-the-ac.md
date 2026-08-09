---
title: "PREMIER: 86% of group dashboards never convert — diagnose the activation funnel"
period_proposed: 2026-W19
date_proposed: 2026-05-05
date_accepted: 2026-05-05
date_executed: 2026-07-06
date_measured: null
status: executed
risk_tier: recommend
effort: M
impact_dollars_monthly: null
segment: boat
source: director
related_briefing: 2026-W19
db_id: 4fe8e34e-83cb-4ee7-9576-4a60386400dc
tags: [recommendation]
---

# PREMIER: 86% of group dashboards never convert — diagnose the activation funnel

## What

The PREMIER attribution audit (closing the P1 concern in marketing ADR M0001) ruled out missing revenue — every sub-order under a PREMIER group dashboard correctly carries affiliateId. But the audit surfaced a much bigger problem in the data: of 415 PREMIER group dashboards created in the last 90 days, only 59 produced any paid order — a 14% activation rate. At the tab level, 820 tabs → 81 paid orders (9.9%).

This is not an attribution bug; it's a conversion bug. The 86% of dashboards that go cold are the highest-leverage area we have on PREMIER right now — they're already past the hardest step (a confirmed boat booking that triggered the dashboard creation webhook).

Likely culprits to investigate, in order of suspicion:
1. Claim-link delivery (GHL handoff at src/app/api/webhooks/create-dashboard/route.ts:136). Are the boater-facing texts/emails actually being sent and clicked? Pull GHL delivery + click metrics for the 356 cold dashboards.
2. Tab UX in the dashboard. Multi-tab group orders may be confusing if the boater doesn't realize they're supposed to share the link with their party. Check session recordings or analytics for solo-visit-then-bounce.
3. Booking-to-dashboard timing. When does the dashboard get created relative to the boat trip date? If it's days vs. minutes before, the urgency profile is very different.

Action: Allan to pull GHL message-delivery and link-click metrics for the 356 non-converting PREMIER dashboards (90-day window). If delivery is the bottleneck, fix the GHL flow. If delivery is fine but clicks are low, A/B the message copy. If clicks are fine but checkout isn't, instrument the dashboard funnel.

Why now: PREMIER drove $15K of attributed revenue at 14% activation. Even moving to 25% activation would add roughly $11K/month. This is the highest-impact narrative finding from the W19 audit cycle and isn't covered by any open rec or heuristic.

## Notes

[2026-07-04 diagnosis — Claude Code backend-triage session]
Reproduced on fresh 90d window: 300 webhook dashboards -> 142 viewed (47%) -> 119 joined -> 37 paid (12.3%). Confirmed conversion problem, not attribution.
FINDINGS:
1. Claim-link delivery is NOT the failure: 293/300 have host phone; sampled 3 never-viewed hosts in GHL — all got the automated intro SMS with dashboard link. (Per-message carrier delivery status unverifiable: MCP token lacks conversations/message scope.)
2. The intro SMS defers action: "about a month before your cruise, hop on a call" — sent at booking, no follow-up containing the dashboard link. 62% of bookings are 21+ days out; they convert WORST (9%).
3. The T-7 recap SMS omits the dashboard link entirely — the highest-intent moment has no link.
4. Deadline copy mismatch: SMS says "Deadline: Sunday before your cruise" but the system accepts orders until 4h pre-delivery (computeOrderDeadline). Trip-week joiners convert at 48% — the copy tells the best cohort they are too late.
5. Join timing: never-joined 181 (0 paid), day-0 joiners 52 (23% pay), trip-week joiners 27 (48% pay).
IMPACT RESIZE: rec claimed +$11K/mo at 25% activation — actuals do not support it. 90d revenue from these dashboards = $8,845 (69 orders, AOV $128). Realistic prize at 25% activation is +$1.3-1.6K/mo.
RECOMMENDED FIXES (GHL workflow, no site code): add dashboard link to T-7 recap; fix deadline copy (order until day before / 4h); add T-10 nudge with link for 21d+ bookings; change intro CTA from "in a month" to immediate.

[2026-07-06 SHIPPED - Claude Code browser session, operator-authorized]
Edited the live GHL workflow Xola Booking SMS Drip (published, 92 active enrollments) directly in the workflow builder. Reviewed all 15 SMS nodes across the 3 lead-time branches; edited 11, left 4 already-good ones (cocktail-kit MMS + share-pitch messages that had the dashboard link).
Correction to the diagnosis: a multi-touch drip DID already exist (up to 5 follow-ups on long-lead bookings). The failure was narrower: all 3 recap-style messages had NO dashboard link plus the false Deadline-Sunday-before-your-cruise claim, two more claimed free delivery ends this Sunday, intros deferred action (about a month before), and the T-5 message had a your-vs-you-are typo.
Fixes applied: dashboard link merge tag added to every recap; all false deadlines replaced with truthful order-up-to-the-day-before copy; intro CTAs made immediate (sub-15d branch got an urgency variant); typos fixed. No new T-10 step needed - the existing 9-days-out touch now carries the link.
Measure: premier-activation-rate on a fresh 90d window ~2026-08-05+ (target 25%, baseline 12.3% on 300 dashboards Apr-Jul).


## Measurement

### Before (snapshot at time of shipping)
_(not captured)_

### After

```json
{
  "orders": 57,
  "revenue": 17086.65,
  "segments": [
    {
      "margin": null,
      "orders": 50,
      "revenue": 14842.49,
      "segment": "general",
      "averageMarginPct": null,
      "averageOrderValue": 296.85,
      "marginCoveragePct": 0
    },
    {
      "margin": 152.74,
      "orders": 7,
      "revenue": 2244.16,
      "segment": "unknown",
      "averageMarginPct": 6.8,
      "averageOrderValue": 320.59,
      "marginCoveragePct": 26
    }
  ],
  "capturedAt": "2026-08-09T08:00:32.636Z",
  "affiliateRoi": [
    {
      "code": "POUR24",
      "margin": 132.24,
      "orders": 2,
      "roiPct": -73,
      "revenue": 5292.63,
      "netMargin": -356.69,
      "affiliateId": "7bf14a40-b04f-4622-ba09-0662be41e37f",
      "businessName": "Pour Twenty Four",
      "commissionPaid": 488.93,
      "marginCoveragePct": 10
    },
    {
      "code": "LTYACHTRENTALS",
      "margin": null,
      "orders": 8,
      "roiPct": null,
      "revenue": 2451.36,
      "netMargin": null,
      "affiliateId": "e09b3a40-26cb-4c70-9b2a-6ea311c7a62e",
      "businessName": "Lake Travis Yacht Rentals",
      "commissionPaid": 96.3,
      "marginCoveragePct": 0
    },
    {
      "code": "SIPNSOCIAL",
      "margin": null,
      "orders": 2,
      "roiPct": null,
      "revenue": 616.29,
      "netMargin": null,
      "affiliateId": "3d00911f-3b75-40ad-bc3c-c87f20cdaeaf",
      "businessName": "Sip & Social On Wheels",
      "commissionPaid": 26.65,
      "marginCoveragePct": 0
    },
    {
      "code": "PREMIER",
      "margin": null,
      "orders": 30,
      "roiPct": null,
      "revenue": 4712.95,
      "netMargin": null,
      "affiliateId": "d21bac1a-3f99-489c-89fd-e1980c264a8d",
      "businessName": "Premier Party Cruises",
      "commissionPaid": 195.23,
      "marginCoveragePct": 0
    },
    {
      "code": "BACHBABES",
      "margin": null,
      "orders": 1,
      "roiPct": null,
      "revenue": 168.7,
      "netMargin": null,
      "affiliateId": "bd7084cd-db70-4759-ade1-128bab62f8b2",
      "businessName": "Bach Babes",
      "commissionPaid": 7.45,
      "marginCoveragePct": 0
    },
    {
      "code": "DTRbartending",
      "margin": null,
      "orders": 1,
      "roiPct": null,
      "revenue": 1342.66,
      "netMargin": null,
      "affiliateId": "f029d561-1c6f-45ba-9cac-7135eac17ce2",
      "businessName": "DTR Bartending",
      "commissionPaid": 94.85,
      "marginCoveragePct": 0
    }
  ],
  "snapshotDate": "2026-08-09",
  "averageOrderValue": 299.7657894736842,
  "marginCoveragePct": null
}
```
## Updates

- 2026-05-05 — Created with status `executed` from source `director`.
- 2026-08-09 — Status shipped → shipped (cron:measure-recommendations). Notes: Auto-captured 14-day measurement

---
_Mirror file. Edited automatically by the triage queue when status changes. Source of truth is the database (id: `4fe8e34e-83cb-4ee7-9576-4a60386400dc`). Slug: `premier-86-of-group-dashboards-never-convert-diagnose-the-ac`._
