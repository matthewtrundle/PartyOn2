# Marketing Director — narrative briefing — 2026-W28

_Generated 2026-07-06T13:00:04.317Z. Layered on top of the deterministic briefing at `2026-W28.md`._

## Weekly Analysis: W28 2026

**The single most important thing:** You have a **segment attribution crisis** masking a possible demand collapse. Revenue cratered 49% WoW ($11.8K drop), but 78 of 89 total orders—88%—are tagged "unknown." You cannot diagnose what's broken (seasonality? channel? competitor?) when nine out of ten orders are invisible to your segmentation logic. This is an instrumentation emergency, not just a revenue dip.

**Non-obvious pattern the briefing missed:** Your affiliate program is producing *volume* but you're flying blind on *profitability*. Premier drove 69 orders in 30 days—77% of all affiliate orders—yet you have zero margin visibility on them or four other affiliates. The briefing flags this as five separate "margin coverage too low" items, but the real insight is systemic: you've scaled distribution without the financial instrumentation to know if affiliates are cannibalizing higher-margin direct bookings or delivering profitable incremental demand. Given "direct orders are higher margin than affiliate" per your brief, this could be hemorrhaging margin at scale during peak boat season.

**Prioritized actions:**

**1. Emergency segment tagging audit (why now: you're making decisions blind)**  
78 "unknown" orders in the past week means your UTM tagging, CRM ingestion, or booking flow attribution is broken. Week 28 of boat season—you have ~22 weekends left and cannot allocate budget, creative, or sales effort without knowing whether the revenue drop hit bach parties, corporate, or weddings. Expected impact: restores visibility into ~$50K/mo in currently unattributed demand. Effort: **M** (requires dev/ops to trace order source through checkout). Risk: **autonomous**—pure instrumentation, no customer-facing or compliance surface.

**2. Implement affiliate margin tracking with cost-of-goods flags (why now: Premier volume is high, margin is unknown)**  
You approved diagnosing the Premier dashboard conversion funnel but lack the financial data to know if *converting more Premier customers* is even profitable. Before investing further in affiliate activation, instrument COGS and affiliate payout per order so ROI becomes calculable. Expected impact: could reveal $3–8K/mo margin leakage if Premier payouts exceed the direct-vs-affiliate margin delta. Effort: **M** (requires finance + ops to pass product costs and affiliate fees into reporting). Risk: **autonomous**.

**3. Validate the WoW drop against prior-year W28 and trailing boat season trend (why now: disambiguation before panic)**  
A 49% WoW drop is alarming, but without MoM, YoY, or trailing-average context, you don't know if this is noise (one big corporate event last week), seasonality (July 4 weekend shift), or real demand erosion. Pull 2025-W28 and the past 8 weeks' revenue to establish a baseline before reallocating budget. Expected impact: prevents premature cuts to working channels; could reveal this is weather/holiday timing. Effort: **S** (historical data pull). Risk: **autonomous**.

---

**Missing but needed:** Customer acquisition cost by segment, average order value trend, and whether the 20.5% repeat rate for "unknown" is up or down. Without CAC, you can't prioritize acquisition vs. retention even once attribution is fixed.
