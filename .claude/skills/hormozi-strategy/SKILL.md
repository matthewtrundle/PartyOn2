---
name: hormozi-strategy
description: High-level business strategy for Party On Delivery using Alex Hormozi's frameworks ($100M Offers, $100M Leads, $100M Money Models, plus his business-diagnosis method). Use when the user asks where to put resources, what the highest-ROI move is, what to double down on, what to cut, whether to raise prices, how to structure an offer or money model, or wants a whole-business strategic audit. For page-level copy review use `conversion-optimization` instead.
argument-hint: "[audit | offer | money-model | channels | cut-list | <question>]"
---

# Hormozi Strategy — Party On Delivery

Applies Alex Hormozi's frameworks to POD's **real numbers** to produce resource-allocation decisions: where the next dollar and next owner-hour go, what to scale, what to stop.

The point is not to recite Hormozi. It is to **find the one binding constraint and refuse to give advice about the other three.**

---

## Two ways to run this

| You want | Do this |
|---|---|
| A full strategic audit, or you want it done in the background | Delegate to the **`hormozi-strategist` agent** (`.claude/agents/hormozi-strategist.md`) — self-contained, loads its own data |
| To think through one question inline, with the session's existing context | Use this skill directly — read the reference file the question needs, then follow the protocol below |

**Business reality, decided-and-closed items, and the hard legal/margin/footprint constraints live in `.claude/agents/hormozi-strategist.md`.** That file is the single source of truth for the PartyOn layer — read its "Standing business reality", "Decided — do not re-open", and "Hard constraints" sections before advising. Do not duplicate those facts here; they change.

---

## The framework layer

Four distilled reference files in `references/`. Read the one the question needs — not all four.

| File | Source | Read it when the question is about |
|---|---|---|
| `references/diagnosis.md` | His workshops, podcast, portfolio talks | **Start here always.** Finding the binding constraint, order of operations, LTGP:CAC thresholds, cut-vs-double-down criteria, focus rules |
| `references/money-models.md` | $100M Money Models (2025) | Cash, payback period, offer sequencing (attraction → upsell → downsell → continuity), "can we afford to advertise" |
| `references/offers.md` | $100M Offers (2021) | Offer construction, the value equation, pricing power, guarantees, bonuses, value stacking, naming |
| `references/leads.md` | $100M Leads (2023) | Channels (the Core Four), lead magnets, referrals, affiliates/partners, content, scaling what works |

**Every file ends with a "Coverage limits" section** (sometimes numbered, e.g. `## 15. Coverage limits`) listing what could not be reliably sourced, plus inline confidence flags on shaky numbers. `money-models.md` also carries a **"Confidence register — read before citing."** Read these before quoting any threshold.

**If a framework isn't in the files, say so — never approximate a Hormozi threshold from memory.** These were distilled from his freely-published teaching and public breakdowns, not from the book text, and a verification pass corrected many widely-circulated numbers that turned out to be wrong.

---

## The audit protocol

Work in this order and show your work at each step. Skipping to step 4 is the most common failure.

**1. Name the constraint.** Which single one binds right now — **leads, sales/conversion, delivery/fulfillment, or cash/profit**? Use `diagnosis.md`'s method, state the evidence, then say explicitly what you're *not* going to discuss because it isn't the constraint. An audit that spreads recommendations across all four constraints has failed.

**2. Run the money-model math first.** Gross profit from a new customer in the first 30 days vs. cost to acquire + fulfill. State the ratio and payback period. If the business can't currently finance its own acquisition, **that is the answer** — everything else queues behind it.

**3. Check the offer before the traffic.** A pricing or offer fix is cheaper and faster than a traffic fix. Is there unused pricing power? (The 27% margin rule is a *floor, not a target*.)

**4. Only then, channels.** Apply `leads.md`, filtered through the legal constraints and the allowable-CAC ceiling from step 2. Prefer **more/better before new**.

**5. Name at least one cut.** Every audit includes a stop-doing, justified by the actual criteria in `diagnosis.md`. Owner attention is the scarcest resource here.

---

## Getting the real numbers

- `docs/WEBSITE-ANALYTICS.md` — nightly traffic/conversion/margin snapshot
- **`db-query` skill** — live orders, AOV, repeat rate, segment mix (read-only; tables are snake_case)
- **`finance-director` agent** — P&L, cash position, debt detail
- **`marketing-director` agent** — channel and landing-page detail
- Saved memory (`~/.claude/projects/-Users-allan-Projects-Party-On-Delivery-Website-PartyOn2/memory/`) — `six_month_plan_2026_08.md` and `business_viability_analysis_2026_07.md` carry decisions you must not re-open

**Never quote a business number you didn't verify this session.** Memory files are point-in-time — either verify or label it "as of [date], unverified".

---

## Output format

```
## The constraint
[Which of the four binds, the evidence, and what you're deliberately ignoring.]

## The math
[Money-model / LTGP:CAC / payback, with the arithmetic shown and unverified figures flagged.]

## Double down (ranked)
### 1. [Action] — impact, and when cash actually arrives
- Hormozi framework · Evidence · Cash timing vs. the 30-day test · Owner-hours and what they displace · Constraint check (legal / margin / footprint)

## Cut / stop doing
[At least one, with its criterion.]

## Not now (and the trigger that unblocks it)
```

Close with **one sentence: the first thing to do, and why it beats the runner-up.**

Plain language per Allan's CLAUDE.md — lead with what and why before how.

---

## Guardrails

Hormozi's playbook assumes a normal business; alcohol retail isn't one. **The legal constraints veto the framework, never the reverse.** Full list in the agent file — the ones that most often kill a standard Hormozi play:

- **No %-of-alcohol-sales pay to unlicensed parties** (flat banded bounties only) — kills most standard affiliate/referral structures
- **No auto-gratuity**; **no leave-at-door** (21+ ID check required) — caps how far "reduce effort/time delay" can go
- **No supplier/brand money** (tied-house) — no brand-funded promotions
- **27% gross margin floor**, rounded up to next `.99` — bounds any discount-based attraction offer
- **Footprint**: never target Round Rock, Pflugerville, Leander, Dripping Springs, Buda, Kyle
- **Volume claims**: ~1,460 parties, never "3,000+"

When you veto a Hormozi play on one of these, **say which play and why** — that's useful information, not a dead end.
