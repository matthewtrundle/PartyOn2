# Finance Director Agent — Buildout Brief

**Drop this file into a fresh Claude Code session as `docs/FINANCE-DIRECTOR-AGENT-BUILDOUT.md`.** It is self-contained — the new session has no memory of this conversation.

**Goal of the new session:** Stand up Phase 0 of the Finance Director — external connections (QuickBooks Online + Plaid) and the internal scaffolding the later phases will build on. Open Phase 0 as its own PR before scoping Phase 1.

---

## 1. Context — why this agent exists

Party On Delivery (premium alcohol + party coordination delivery, Austin TX) is being reorganized around an "agentic org structure" — director-level Claude agents that own a functional area, surface decisions to the operator (Allan), and execute routine work autonomously. Three directors are now live:

- **Marketing Director** — shipped Apr 2026, weekly analytics + recommendation triage. See `.claude/agents/marketing-director.md`, `Programs/Marketing-Director.md` in the Obsidian vault.
- **Operations Director** — shipped May 2026, 10-signal inventory drift detection + reconciliation. See `.claude/agents/operations-director.md`, `docs/OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md`.
- **SEO Director** — Phase 0 shipped May 2026, weekly SEMrush snapshots via a Cowork browser-automation skill. See `docs/SEO-DIRECTOR-AGENT-BUILDOUT.md`.

The Finance Director is **director #4** and the most ambitious by scope. Where Marketing and Ops watch metrics inside the PartyOn database, Finance acts as a **CFO** — it owns external connections (QuickBooks Online, Plaid bank feed, Stripe API beyond what webhooks capture), produces P&L statements, reconciles books monthly, prepares tax documents, and tracks operating expenses + sales tax + contractor 1099s.

The original 6-director plan (Apr 18, 2026) described Finance as: *"owns unit economics and cash flow. Sub-agents: margin analysis agent, pricing agent, forecasting agent, bookkeeping agent."* Phase 1 collapses these into a single Finance Director that grows sub-agents only if the prompt gets unwieldy.

---

## 1.5 Loop protocol (how this session operates)

You are running in **dynamic-loop mode** (`/loop` with no interval). The first message of this session invoked `/loop` — you self-pace via `ScheduleWakeup` and continue across phases until you've completed all 11 phases or hit a stop condition. The operator is not clicking through ten chips; you keep going on your own.

### Iteration ritual (start of every wakeup)

1. **Pull main + check state.** `git pull --ff-only`. Run `gh pr list --state all --limit 15 --json number,title,state,mergedAt --search "finance"`. Identify the most recent Finance Director PR and its status.
2. **Run health checks on the last shipped phase's deliverables.** After Phase 0: hit `/api/admin/finance/qb/health` and `/api/admin/finance/plaid/health` in prod, verify green. After 1A: fire `/api/cron/finance-stripe-sync` and verify a row written + no errors. Similar pattern for every phase — touch what the last PR shipped and confirm it works against real data.
3. **Verify tests still pass.** `npm run test:run`, `npx tsc --noEmit`, `npx next lint`. If any new regressions appear (vs the pre-existing `group-v2-payments.test.ts` failures from main, which are unrelated), STOP and surface them to the operator before building the next phase.
4. **Decide next action** based on state:
   - Last PR not merged yet → schedule wakeup in 3600s (1h, the max delay)
   - Last PR merged + health checks green → pick the next phase from §7 and build it
   - Last PR merged but post-merge verification failed → open a follow-up PR fixing the regression, then resume the planned sequence
   - Blocked on an unanswered operator question → do NOT schedule a wakeup; the operator's answer resumes you
   - All 11 phases done → post a final summary message, do NOT schedule a wakeup, stop

### Question-asking protocol

- **Batch decisions via `AskUserQuestion` (up to 4 questions per call).** Your first iteration asks all the §12 credentials questions in ONE batch — Intuit app, Plaid app, QB tier, bank institution, Stripe payout schedule — not one at a time.
- **Never ask "should I proceed?"** If you've completed a phase + verified it works, just open the PR and schedule the next wakeup. Operator's PR review is the human gate, not a chat prompt.
- **If a phase needs a decision mid-build** (e.g., QB chart-of-accounts mapping in Phase 2A), batch all decisions for that phase into one AskUserQuestion call before writing code.

### Sleep intervals

| Situation | Delay |
|---|---|
| Mid-phase, just shipped code, want to verify | 60–270s (keeps cache warm) |
| Phase complete, PR opened, awaiting operator review | 3600s (1h — the max) |
| Blocked on unanswered question | Do not schedule; wait |
| All phases done | Do not schedule; stop |

### Stop conditions (post a final summary, then end)

1. **All 11 phases done** (counting 1A, 1B, 1C, 2A, 2B, 2C as separate phases: 0 + 1A + 1B + 1C + 2A + 2B + 2C + 3 + 4 + 5 + 6 = 11)
2. **Same phase fails post-merge verification 3 times in a row** → escalate to operator, stop
3. **Operator explicitly tells you to stop**
4. **Schema drift detected** that requires operator decision (e.g., production data conflicts with new migration) → surface and stop

### What you may NOT do autonomously (these need operator action in the actual app, not just PR review)

- Run any raw SQL migration against production — operator runs each phase's `prisma/migrations/manual/*.sql` file manually after the PR merges
- Toggle the autonomy ceiling broader than "auto-categorize only" (the decision from §3)
- Move money via any API — Stripe Transfers, ACH, distributor payment, tax remittance
- Promote QB or Plaid from sandbox → production tier (operator swaps env vars after each phase merges)
- Force-push, `--no-verify`, skip signing, or commit secrets

### Each phase opens its own PR

Do not bundle multiple phases into one PR. Phase 0 → its own PR. Phase 1A → its own PR. Etc. PR title pattern: `feat(finance): <short phase description> (Phase <N> for Finance Director)`. Operator reviews each independently. The loop continues across PRs whether or not the operator has merged yet — but the next phase doesn't start until the prior phase is merged.

---

## 2. The execution model

**The whole build is genuinely big — 11 phases, 1 PR each.** You build them sequentially in a single long-running session that self-paces via the loop protocol above. Each phase ships a focused PR; the operator reviews on their normal cadence; you sleep between iterations.

Phase 0 is the smallest and lays the foundation (QB + Plaid OAuth + 4 empty models). Phase 5 is where the Director becomes invokable as a Claude agent. Phase 6 is post-trust graduation (config flag only, not new code). The other phases (1A through 4) ship the data plumbing the Director consumes.

Anything beyond "the next phase in sequence" is out of scope at any given moment. Don't skip ahead. Don't bundle.

---

## 3. Operator's decisions (locked in 2026-05-19)

| Decision | Choice | Implication |
|---|---|---|
| Accounting software | **QuickBooks Online** | Use Intuit Developer API. OAuth2 connection, sandbox first, then production. Can read AND write to QB. |
| Bank feed | **Plaid (real-time API)** | Plaid Link in admin UI; subscribe to transaction webhooks; auto-match deposits → Stripe payouts and outflows → distributor invoice payments. |
| Payroll | **Only contractor 1099s** | No W-2 payroll integration needed. Track contractor payouts (via Stripe Connect / ACH / outflow categorization) for year-end 1099-NEC prep. Threshold: $600/year per contractor per IRS rules. |
| Autonomy ceiling | **Auto-categorize + auto-post sales journals; recommend everything else** | Director can (a) apply expense categories to Plaid transactions in QuickBooks and (b) post daily sales journals to QuickBooks without asking. Every autonomous write has a reverse-button safety net + a global kill switch. **Updated 2026-05-21** — original decision required operator-click on journals; operator rejected the daily-click friction and authorised the auto-post. Send-payments / file-taxes / mark-distributor-paid still require operator click. See saved memory `finance_autonomous_qb_sales_journals.md`. |

---

## 4. What's already in the PartyOn database (audited 2026-05-19)

This list is exhaustive — these are the financial data sources Finance can pull from on day one. Do not re-audit; trust this and verify only when something seems off.

### Revenue side (complete)

| Model | Coverage | Sample stats |
|---|---|---|
| `Order` | All paid orders. Fields: subtotal, taxAmount, discountAmount, deliveryFee, tipAmount, total, marginAmount, marginCoveragePct, stripePaymentIntentId, stripeChargeId, utmSource, landingPage | 232 orders, $87,460.57 revenue, $6,226.28 tax collected |
| `OrderItem` | Per line item: price, quantity, unitCost, totalCost | 1,308 items; cost data populated for orders post-margin-pipeline only |
| `Refund` | stripeRefundId, amount, reason, status | 57 refunds |
| `Discount` + `DiscountUsage` | Promo code tracking | 60 codes, 7 usage logs (gap — discount-applied-but-not-logged is common) |
| `DraftOrder` | Outstanding invoices (AR), states: PENDING / SENT / VIEWED / PAID / CANCELLED | 62 drafts, $62,901.92 outstanding |
| `GroupOrderV2` / `SubOrder` / `ParticipantPayment` | Group order revenue | 2,014 groups, 2,539 sub-orders |

### Cost side (improving — Ops Director is pushing coverage up)

| Model | Coverage | Notes |
|---|---|---|
| `ProductVariant.costPerUnit` | **20.6% of variants today** (57 / 1,203). Was 4% in April. | Ops Director's `cost-coverage-gap` detector surfaces top-velocity uncosted SKUs for operator to enter |
| `OrderItem.unitCost`, `totalCost` | 51% of orders have full cost data | Snapshot taken at order creation via `snapshotItemCost()` |
| `Order.marginAmount`, `marginCoveragePct` | 119 / 232 orders | Populated via `finalizeOrderMargin()` at order completion |
| `ReceivingInvoice` + `ReceivingInvoiceLine` | 18 invoices, 87 lines, 10 APPLIED, 8 PENDING_REVIEW | AI-parsed from operator photo uploads, status: PENDING_REVIEW → APPLIED → cost-per-unit written to variant |
| `InventoryMovement` | 1,896 audit-trail rows | RECEIVING / SALE / ADJUSTMENT type. Read-only history. |

**Key constraint (saved memory):** Marketing's ADR M0001 says **affiliate ROI / margin-leak decisions are blocked until cost coverage hits ≥70%**. Finance must respect this — do not generate "pause this affiliate" or "reprice this SKU" recommendations that conflict. Marketing owns those once coverage is fixed; Finance complements with P&L and tax-side decisions.

### Sales tax (complete liability tracking, no remittance log)

- 8.25% TX rate hardcoded in `src/lib/tax/rates.ts`
- Per-order tax in `Order.taxAmount`
- Cumulative tax collected = `SELECT SUM(taxAmount) FROM orders WHERE created_at BETWEEN ...`
- **Gap:** no model for tax remittance (when filed, what period, amount paid)

### Affiliate commissions (complete)

- `Affiliate` (24 active), `AffiliateCommission` (122, with $1,722.84 in HELD+APPROVED), `AffiliatePayout` (9 batches)
- Monthly batch generation via `/api/admin/affiliates/payouts/generate?year=Y&month=M`
- **Gap:** no Stripe Transfers integration — payouts are DB records, paid manually via ACH

### What's MISSING from PartyOn DB (Phase 0–2 will add)

| Gap | Why it matters | Phase to address |
|---|---|---|
| Stripe fees per charge | Can't compute true net revenue | Phase 1A |
| Stripe payouts → bank | Can't reconcile bank deposits | Phase 1A |
| Stripe disputes / chargebacks | Subscribed to webhook but no handler | Phase 1A |
| ~~AP on `ReceivingInvoice`~~ | **REMOVED** — distributor invoices live in QuickBooks; AP visibility comes from Phase 2A (QB read), not PartyOn-side modelling. | ~~Phase 1B~~ (cancelled) |
| Operating expenses (rent, software, fuel, contractor pay) | Lives 100% in QB / Allan's head today | Phase 2 (QB sync) |
| Tax remittance log | Can compute liability, can't prove what's been paid | Phase 4 |
| Contractor 1099-NEC tracking | Need annual rollup ≥$600/contractor for IRS | Phase 3 |
| Bank account state | No reconciliation possible | Phase 2 (Plaid) |

---

## 5. Existing infrastructure to reuse — DO NOT rebuild

### Reuse from prior directors

| Asset | Path | What to reuse |
|---|---|---|
| Shared recommendation lib | `src/lib/recommendations/{lifecycle,measurement,card-types}.ts` | Status state machine, ActionPayload shape, RecommendationCardData — Finance recs plug into the unified `/admin/recommendations` queue |
| Shared card component | `src/components/admin/RecommendationCard.tsx` | Already accepts `domain` and `actionPayload`. Add `finance` to the domain enum. |
| Unified queue page | `src/app/admin/recommendations/page.tsx` | Add a `Finance` filter chip; cards rendered with the same component. |
| Action execution endpoint | `src/app/api/admin/recommendations/[id]/execute/route.ts` | Dispatcher already handles `navigate` and `apiCall` kinds. Add `qb-categorize` kind for auto-categorize actions (only kind allowed without operator click per autonomy decision). |
| Snooze + dismiss-with-reason | Same `[id]` route group | Identical behavior. Finance recs persist `dismissReason` for the feedback loop. |
| Marketing/Ops director patterns | `.claude/agents/{marketing,operations}-director.md` | Use as templates. Same Sonnet model, same Read/Grep/Glob/Bash tools, same bootstrap-ritual pattern. |
| Obsidian memory layout | `Memory/{Marketing,Operations}/{Briefings,Recommendations,Decisions,Channel-Performance,Open-Questions.md,README.md}` | Mirror exactly. Use `F` prefix for Finance ADRs (`F0001-...`). |
| GitHub-mirror + Obsidian-sync pattern | `src/lib/operations/recommendation-mirror.ts`, `scripts/operations/sync-obsidian.mjs`, `.claude/settings.json` PreToolUse hook | Same idempotent-SHA pattern. Mirror `docs/finance/{weekly,monthly-close,recommendations,decisions}/` → vault. |
| Cost / margin computation | `src/lib/inventory/services/margin-service.ts`, `scripts/backfill-order-margins.ts` | Finance computes P&L on top of this; do not duplicate margin math. |
| Affiliate payout pipeline | `src/lib/affiliates/`, `/api/admin/affiliates/payouts/*` | Pull AffiliatePayout totals into P&L expense; Finance does not own payout generation. |
| Cron + admin-API patterns | `src/app/api/cron/operations-*` and `src/app/api/admin/operations/*` | Copy structure for `finance-*` equivalents. |

### Existing reports (extend, don't replace)

| Path | What it does |
|---|---|
| `/admin/reports` | Top-level reports nav |
| `/admin/reports/sales` | Revenue over time (7/30/90d), category breakdown |
| `/admin/reports/customers` | Customer-side metrics |
| `/admin/reports/inventory` | Stock analysis |

Finance adds `/admin/reports/finance` (or `/admin/finance`) as a peer — the P&L surface.

---

## 6. Architectural decisions

### Recommendation model: parallel, mirror Ops

Add `FinanceRecommendation` model with same shape as `OperationsRecommendation` (status enum, severity, evidence JSON, actionPayload, actionLog, dismissReason, snoozeUntil). Reasons match those in `docs/OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md` §5a — own table per director, shared library.

### Auto-categorize is the ONLY autonomous action in Phase 5+

Per operator decision #4, the Director can write a category to a QuickBooks transaction without asking. Every other write — journal entries, expense edits, payout marking, tax filing — requires operator click via the inline-action button. The action dispatcher's `qb-categorize` kind is the only `apiCall` path that bypasses the "requires click" gate.

Auto-categorize actions still write `actionLog` entries on the rec so every auto-decision is reconstructible. Operator can revert any auto-categorization via a one-click undo button on the rec card.

### Chart of accounts mapping lives in TypeScript, not DB

Map PartyOn revenue/cost concepts to QB chart-of-accounts IDs in `src/lib/finance/qb-account-map.ts`. Operator-edited via a settings page. Persisting in TS rather than DB matches the "rates as TypeScript, not DB" decision from ADR 0002 (per saved memory).

### Phase 0–2 schema additions go through raw SQL ALTER

Per saved memory `prisma_schema_drift.md`: avoid `prisma db push` on production. Use raw SQL `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for additive migrations. Bundle migrations into each PR's deploy notes.

### External secrets in env vars only

`INTUIT_CLIENT_ID`, `INTUIT_CLIENT_SECRET`, `INTUIT_OAUTH_REFRESH_TOKEN`, `INTUIT_REALM_ID`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` (sandbox / development / production). Add to `.env.example` + Vercel env config. **Never commit any credential.**

---

## 7. Phased build sequence

This is genuinely multi-quarter work. Each phase is one or more PRs.

### Phase 0 — Foundation (THIS PR) (1–2 weeks)

**Deliverables:**

- **QuickBooks Online OAuth scaffolding**
  - Intuit Developer app created (operator does this, hands you the client_id/client_secret)
  - `/admin/finance/connect-quickbooks` page: "Connect QuickBooks" button → OAuth redirect → callback that stores refresh token in DB (new `IntuitOAuthState` model with single-row pattern)
  - `src/lib/finance/qb-client.ts` — wraps Intuit's node SDK with refresh-token rotation
  - Health check: `GET /api/admin/finance/qb/health` returns connection status + company name
- **Plaid scaffolding**
  - Plaid app created (sandbox tier first)
  - `/admin/finance/connect-bank` page: Plaid Link button → onSuccess callback → store access_token in DB (new `PlaidItem` + `PlaidAccount` models)
  - `src/lib/finance/plaid-client.ts` — wraps Plaid node SDK
  - Health check: `GET /api/admin/finance/plaid/health` returns connection status + account names
- **Empty internal scaffolding** (no UI yet, just schema):
  - `FinanceRecommendation` model (mirror `OperationsRecommendation`)
  - `FinanceSnapshot` model (placeholder columns: id, snapshotDate, payload JSONB, createdAt)
  - `IntuitOAuthState` model
  - `PlaidItem`, `PlaidAccount`, `PlaidTransaction` models (transactions ingested in Phase 2 — schema in Phase 0)
  - Raw SQL migration committed to `prisma/migrations/manual/<date>-finance-phase-0.sql` per saved memory
- **No agent file in Phase 0.** Director is not invokable yet — there's nothing for it to read.
- **No cron in Phase 0.** Add in Phase 1.

**Exit criterion for Phase 0:** Operator clicks "Connect QuickBooks" + "Connect Bank" in admin UI; both report green health. No data flows yet — that's Phase 1.

### Phase 1A — Stripe data deepening (2 PRs)

- Add `stripeChargeAmountCents`, `stripeFeesCents`, `netReceivedCents` to `Order`
- Add `StripePayout`, `StripeBalance`, `ChargeDispute` models
- Webhook handlers for `payout.created`, `payout.paid`, `balance.available`, `charge.dispute.*`
- Backfill historical Stripe data via Stripe API (one-shot script: pull last 12 months of charges, fees, payouts)
- Daily cron `/api/cron/finance-stripe-sync` to pull yesterday's balance transactions + payouts

**Why first:** Until Stripe net amounts are reconciliable, nothing else is trustworthy.

### Phase 1B — AP on ReceivingInvoice **(CANCELLED 2026-05-20)**

Originally scoped: add `invoice_total_cents` / `due_date` / `paid_at` / `paid_via` to `receiving_invoices` + an `/admin/finance/ap` outstanding-AP dashboard.

**Cancelled** by operator. Distributor invoices arrive electronically and live in QuickBooks already — PartyOn does not duplicate AP tracking. PR #83 was closed without merging. See saved memory `finance_no_internal_ap_tracking.md`. The Director gets AP visibility through Phase 2A (QB read), not PartyOn-side modelling.

**New phase sequence:** 0 → 1A → **1C** → 2A → 2B → 2C → 3 → 4 → 5 → 6 (1B removed; total of 10 phases now, not 11).

### Phase 1C — Internal P&L (1 PR)

- Daily cron `/api/cron/finance-snapshot` at 07:45 UTC (after Marketing 07:00 + Ops 07:30)
- Computes: revenue, refunds, COGS-where-known, gross margin, sales tax accrual, affiliate commission accrual
- Writes `FinanceSnapshot` row with payload JSON
- `/admin/finance` dashboard page: same card-grid pattern as `/admin/operations`
- No recommendations yet — just data visibility

### Phase 2A — QuickBooks: read OpEx (1 PR)

- Weekly cron `/api/cron/finance-qb-pull` pulls QB expense transactions for trailing 30 days
- Categorize by QB account (chart of accounts lives in QB already — pull via API)
- Surface in `/admin/finance` dashboard as "OpEx by category"
- Internal P&L becomes: revenue − COGS − OpEx (from QB) = net income

### Phase 2B — QuickBooks: write sales journals (1 PR) — **autonomous**

- Daily cron drafts + POSTs yesterday's sales summary to QB as a journal entry in one step. **No operator approval click required** per updated decision 2026-05-21.
- Operator one-time setup: map PartyOn concepts → QB account IDs at `/admin/finance/journals/settings`, toggle `enabled` on.
- Safety nets:
  - Global `enabled` kill switch on the config row — flip off and the cron silently skips.
  - Per-entry "Reverse" action on POSTED entries — writes a balanced reverse JournalEntry to QB.
  - `FAILED` rows on QB errors with the QB response stored verbatim; Phase 5 surfaces "QB sync error" recs.
- Audit trail: every state transition appended to `action_log` JSON on the entry.

### Phase 2C — Plaid: auto-match + auto-categorize (1 PR)

- Webhook + nightly sync of Plaid transactions to `PlaidTransaction` model
- Auto-match logic:
  - Bank deposits → Stripe payouts (via amount + date)
  - Bank outflows → `ReceivingInvoice` (mark paid)
  - Bank outflows → contractor payments (track for 1099)
- Auto-categorize remaining transactions in QB (the one autonomous action per autonomy decision)
- Every auto-categorize writes a `FinanceRecommendation` row with status `shipped` + reversal button

### Phase 3 — Contractor 1099-NEC tracking (1 PR)

- New `Contractor` model (name, tax ID, address, payment method)
- Aggregate annual payouts per contractor (from Plaid outflows + AffiliatePayout)
- Threshold flag at $600/year (IRS 1099-NEC requirement)
- Year-end report at `/admin/finance/1099-prep` — exports CSV ready for e-file service (e.g., Track1099) or print-and-mail

### Phase 4 — Tax filing surfaces (1 PR)

- **TX sales tax:** Quarterly report at `/admin/finance/sales-tax` formatted for TX Comptroller webfile entry (gross sales, taxable sales, tax collected per period). Track remittance via new `TaxRemittance` model.
- **Federal/state income tax prep:** Annual revenue + expense rollup at `/admin/finance/annual-rollup` — exports CSV ready for accountant or TurboTax import.
- No e-file automation in Phase 4. Reports only; operator submits.

### Phase 5 — Director surface (1 PR — the actual agent)

- `.claude/agents/finance-director.md` — Sonnet, Read/Grep/Glob/Bash tools, bootstrap reads latest snapshot + active recs + QB connection state + Plaid connection state. Hard rules include ADR M0001 (no affiliate-margin recs until coverage ≥70%), group-order manifest-name rule, autonomy ceiling (auto-categorize only).
- Weekly Monday briefing email at 14:00 UTC (after Marketing 13:00 + Ops 13:30)
- Monthly close email on 1st of month at 14:00 UTC (deeper P&L + reconciliation status)
- Heuristic generators in `src/lib/finance/recommendations.ts` (signals listed below)
- Obsidian sync: `scripts/finance/sync-obsidian.mjs` + PreToolUse hook in `.claude/settings.json`
- Vault shell: `Programs/Finance-Director.md` + `Memory/Finance/{Briefings,Recommendations,Decisions,MonthlyClose,Open-Questions.md,README.md}`

### Phase 6 — Auto-categorize graduation (post-trust)

Only after the operator has reviewed Phase 5 briefings for 4+ weeks and feels confident, graduate the Director's auto-categorize behavior from "one-by-one with reversal button" to "batch auto-categorize with weekly audit summary." This is a config flag, not new code.

---

## 8. The Director's signals (Phase 5)

Heuristics the Finance Director surfaces as recommendations. These are starting points — tune from operator feedback. Each has a severity (urgent / high / normal) and an inline action where applicable.

| # | Signal | Detection | Severity | Inline action |
|---|---|---|---|---|
| 1 | **Stripe payout failed to match a bank deposit** | StripePayout marked `paid` but no corresponding PlaidTransaction within 4 banking days | high | "Investigate" → opens Stripe payout + Plaid transaction comparison view |
| 2 | ~~Distributor invoice past due~~ | **REMOVED** — Phase 1B cancelled. AP lives in QuickBooks; if QB exposes a "past due AP" signal in Phase 2A, re-evaluate then. | — | — |
| 3 | **Cash runway < 30 days** | (Bank balance from Plaid + outstanding AR from `DraftOrder`) / avg daily burn < 30. **No PartyOn-side AP component** — pull committed AP from QB once Phase 2A lands if needed. | urgent | "Open cash dashboard" |
| 4 | **Gross margin trending down** | 30-day rolling gross margin % drops > 5pp from prior 30 days | high | "Open margin analysis" |
| 5 | **Sales tax accrual exceeds remittance pace** | Cumulative taxAmount collected − cumulative tax remitted > one quarter's expected liability | high | "Open sales-tax dashboard" |
| 6 | **Contractor approaching 1099 threshold** | Single contractor cumulative YTD payouts > $500 (early warning before $600 IRS threshold) | normal | "Review contractor totals" |
| 7 | **OpEx category spiking** | Any QB expense category's 30-day total > 150% of trailing 90-day average | normal | "Open OpEx breakdown" |
| 8 | **Affiliate commission accrual aging** | AffiliateCommission status = HELD or APPROVED for >30 days | normal | "Open affiliate payouts" |
| 9 | **Discount over-use** | Discount code's total dollars given > $X in 7d (configurable) | normal | "Review discount usage" |
| 10 | **Untouched bank transaction** | PlaidTransaction unreconciled (not matched to Stripe payout / ReceivingInvoice / QB entry) for >7 days | normal | "Categorize in QB" (the auto-categorize action) |
| 11 | **QB sync error** | QB API call fails (token expired, account deleted, rate limit) | urgent | "Reconnect QuickBooks" |
| 12 | **Plaid sync error** | Plaid item login required (bank changed password) or connection error | urgent | "Reconnect bank" |

---

## 9. Files this build will likely touch

Across all phases. Phase 0's first PR will touch only the rows marked `[P0]`.

```
.claude/agents/finance-director.md                                       [P5 NEW]
.claude/settings.json                                                    [P5 hook]
scripts/finance/sync-obsidian.mjs                                        [P5 NEW]
scripts/finance/backfill-stripe-history.ts                               [P1A NEW]
scripts/finance/manual-migrate-finance-phase-N.sql                       [P0+ NEW per phase]
prisma/schema.prisma                                                     [P0+ ADDS]
prisma/migrations/manual/<date>-finance-phase-N.sql                      [P0+ NEW per phase]

src/lib/finance/qb-client.ts                                             [P0 NEW]
src/lib/finance/qb-account-map.ts                                        [P2A NEW]
src/lib/finance/plaid-client.ts                                          [P0 NEW]
src/lib/finance/snapshot.ts                                              [P1C NEW]
src/lib/finance/pl-calculation.ts                                        [P1C NEW]
src/lib/finance/recommendations.ts                                       [P5 NEW]
src/lib/finance/recommendation-store.ts                                  [P5 NEW]
src/lib/finance/recommendation-mirror.ts                                 [P5 NEW]
src/lib/finance/briefing-payload.ts                                      [P5 NEW]
src/lib/finance/briefing-markdown.ts                                     [P5 NEW]
src/lib/finance/stripe-extended.ts                                       [P1A NEW]
src/lib/finance/ap-service.ts                                            [P1B NEW]
src/lib/finance/contractor-service.ts                                    [P3 NEW]
src/lib/finance/tax-reporting.ts                                         [P4 NEW]
src/lib/email/templates/finance-weekly-briefing.ts                       [P5 NEW]
src/lib/email/templates/finance-monthly-close.ts                         [P5 NEW]

src/app/api/admin/finance/qb/connect/route.ts                            [P0 NEW]
src/app/api/admin/finance/qb/callback/route.ts                           [P0 NEW]
src/app/api/admin/finance/qb/health/route.ts                             [P0 NEW]
src/app/api/admin/finance/plaid/link-token/route.ts                      [P0 NEW]
src/app/api/admin/finance/plaid/exchange/route.ts                        [P0 NEW]
src/app/api/admin/finance/plaid/health/route.ts                          [P0 NEW]
src/app/api/admin/finance/snapshot/route.ts                              [P1C NEW]
src/app/api/admin/finance/ap/route.ts                                    [P1B NEW]
src/app/api/admin/finance/1099/route.ts                                  [P3 NEW]
src/app/api/admin/finance/sales-tax/route.ts                             [P4 NEW]
src/app/api/cron/finance-stripe-sync/route.ts                            [P1A NEW]
src/app/api/cron/finance-snapshot/route.ts                               [P1C NEW]
src/app/api/cron/finance-qb-pull/route.ts                                [P2A NEW]
src/app/api/cron/finance-qb-post-sales/route.ts                          [P2B NEW]
src/app/api/cron/finance-plaid-sync/route.ts                             [P2C NEW]
src/app/api/cron/finance-weekly-briefing/route.ts                        [P5 NEW]
src/app/api/cron/finance-monthly-close/route.ts                          [P5 NEW]
src/app/api/cron/measure-finance-recommendations/route.ts                [P5 NEW]
src/app/api/webhooks/stripe/route.ts                                     [P1A handlers added]
src/app/api/webhooks/plaid/route.ts                                      [P2C NEW]

src/app/admin/finance/page.tsx                                           [P1C NEW]
src/app/admin/finance/connect-quickbooks/page.tsx                        [P0 NEW]
src/app/admin/finance/connect-bank/page.tsx                              [P0 NEW]
src/app/admin/finance/ap/page.tsx                                        [P1B NEW]
src/app/admin/finance/1099/page.tsx                                      [P3 NEW]
src/app/admin/finance/sales-tax/page.tsx                                 [P4 NEW]
src/app/admin/finance/annual-rollup/page.tsx                             [P4 NEW]
src/app/admin/recommendations/page.tsx                                   [P5 add Finance chip]

vercel.json                                                              [P1A+ add crons]
.env.example                                                             [P0+ add secrets]

# Obsidian vault (manual creates, not in repo)
PartyOn2/Programs/Finance-Director.md                                    [P5 NEW]
PartyOn2/Memory/Finance/README.md                                        [P5 NEW]
PartyOn2/Memory/Finance/Open-Questions.md                                [P5 NEW]
PartyOn2/Memory/Finance/{Briefings,Recommendations,Decisions,MonthlyClose}/  [P5 shells]
```

---

## 10. First-iteration checklist (your first wakeup in the loop)

1. **Read this entire doc.**
2. **Read these reference files in order:**
   - `docs/OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md` — full pattern Finance mirrors
   - `.claude/agents/marketing-director.md`, `.claude/agents/operations-director.md` — agent file templates
   - `~/Projects/Obsidian/Obsidian/PartyOn2/Programs/Operations-Director.md` — program doc template
   - `~/Projects/Obsidian/Obsidian/PartyOn2/Memory/Operations/README.md` — memory conventions
   - `src/lib/recommendations/{lifecycle,measurement,card-types}.ts` — shared rec lib
   - `src/app/api/admin/recommendations/[id]/execute/route.ts` — action dispatcher to extend later with `qb-categorize` kind
   - `prisma/schema.prisma` — read the inventory + order + affiliate + receiving sections (lines 555–700, 800–1030, 1980–2080)
3. **Read saved memory** at `~/.claude/projects/-Users-allan-Projects-Party-On-Delivery-Website-PartyOn2/memory/MEMORY.md` and every entry it indexes. Especially:
   - `prisma_schema_drift.md` (use raw SQL for additive migrations)
   - `project_marketing_adr_m0001.md` (no affiliate-margin recs until coverage ≥70%)
   - `group_order_manifest_name_rule.md` (always show manifest name for group-order rec evidence)
   - `ops_recommendation_store_behavior.md` (no auto-downgrade, no auto-invalidate)
4. **Ask the operator for credentials BEFORE writing any client code:**
   - Intuit Developer app: `INTUIT_CLIENT_ID`, `INTUIT_CLIENT_SECRET`, redirect URI for OAuth (e.g., `https://partyondelivery.com/api/admin/finance/qb/callback`), preferred environment (sandbox vs production for initial test)
   - Plaid app: `PLAID_CLIENT_ID`, `PLAID_SECRET`, env (`sandbox` first)
   - Add to `.env.example` with placeholder values; ask operator to add to Vercel env config
5. **Build Phase 0.** Connections + scaffolding. Health checks green. No data flows.
6. **Open the Phase 0 PR.** Title: `feat(finance): QuickBooks + Plaid OAuth scaffolding (Phase 0 for Finance Director)`. PR description must:
   - Link this doc
   - State explicitly that no data flows yet
   - List the 4 new models added to Prisma
   - Include the raw-SQL migration file in `prisma/migrations/manual/`
   - Include a screenshot of both health endpoints returning green
   - Note that Phase 1A (Stripe deepening) is the next PR
7. **Schedule your next wakeup** (`ScheduleWakeup` with delay 3600s, reason "checking whether operator merged Phase 0 PR"). Sleep.
8. **On every subsequent wakeup**, follow the §1.5 iteration ritual: pull main, health-check the last phase, run tests, decide next action, build or wait, schedule wakeup again. Continue until all 11 phases ship or you hit a stop condition.

---

## 11. Hard rules (apply throughout all phases)

- **All Director writes that touch money require operator click** except the single `qb-categorize` action kind (per autonomy decision #4). Every auto-categorize writes an `actionLog` entry on the rec + supports one-click revert.
- **Never propose a recommendation that conflicts with ADR M0001** — affiliate ROI and margin-leak decisions stay with Marketing until cost coverage ≥70%. Finance complements with P&L and tax-side decisions.
- **Group orders:** when surfacing recs that target an `Order` with `groupOrderV2Id`, resolve and display the manifest name via `scripts/ops/_group-label.mjs:resolveGroupLabel()`. Tested-and-working pattern from Ops Director.
- **Schema changes use raw SQL** `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` per saved memory `prisma_schema_drift.md`. Bundle each phase's migration into `prisma/migrations/manual/<date>-finance-phase-N.sql`.
- **Credentials in env vars only.** Never commit Intuit or Plaid client_id / secret / refresh_token / access_token.
- **Sandbox first.** Start QB connection in Intuit sandbox + Plaid sandbox environment. Move to production only after Phase 0 PR merges and operator manually swaps env vars.
- **All admin endpoints behind `requireOpsAuth`.** All cron endpoints behind `CRON_SECRET` bearer. Match Marketing/Ops patterns.
- **No `any` type, files <500 lines, components <200 lines, functions <50 lines** (project CLAUDE.md).
- **Files in `scripts/` are excluded from `@/` path alias** (saved memory `reference_worktree_env_and_github_token.md`).
- **TABC + alcohol compliance is unchanged by Finance.** Tax calculations remain at 8.25% TX rate. Finance reports cumulative liability; does not change per-order math.

---

## 12. Open questions for the operator (ask in the first session, before building)

The Phase 0 session must ask these BEFORE writing code:

1. **Intuit Developer app provisioning** — does an app exist yet, or does the operator need to create one at https://developer.intuit.com? If new, walk through the create-app flow with the operator (5 min) to get `INTUIT_CLIENT_ID` + `INTUIT_CLIENT_SECRET`. Specify redirect URI matches `https://partyondelivery.com/api/admin/finance/qb/callback`.
2. **Plaid environment + tier** — `sandbox` is free, `development` is free with limits, `production` requires paid plan. Confirm: start in sandbox, move to production after Phase 0 lands.
3. **QB Online tier** — Simple Start / Essentials / Plus / Advanced? Affects which API endpoints are available (e.g., class-tracking + budgeting need Plus or Advanced).
4. **Bank institution** — which bank? Plaid covers most US banks but check coverage upfront.
5. **Stripe payout schedule** — daily / weekly / custom? Phase 1A's reconciliation logic depends on this.
6. **Existing QB chart of accounts** — already configured (revenue, COGS, OpEx categories) or fresh QB file? Affects Phase 2A complexity.
7. **Year-end 1099 e-file preference** — Track1099 / Tax1099 / print-and-mail / accountant handles it? Affects Phase 3 export format.

---

## 13. Success metrics (set baselines in Phase 0, measure quarterly)

- **Cost coverage %** — currently 20.6%, target 70%+ (gates ADR M0001 unlock for Marketing too)
- **Margin coverage % on orders** — currently 51%, target 90%+
- **Stripe payout reconciliation rate** — % of bank deposits auto-matched to Stripe payouts (Phase 1A onward)
- **Distributor invoice on-time payment rate** — Phase 1B baseline + monitor
- **OpEx categorization auto-rate** — % of Plaid transactions auto-categorized in QB without operator click (Phase 2C onward; informs Phase 6 graduation decision)
- **Monthly close completion time** — hours between month-end and "books reconciled" state (Phase 2 onward)
- **Tax-filing prep time** — hours operator spends preparing TX sales-tax filing per quarter (target: under 30 min after Phase 4)
- **Cash runway visibility** — yes/no operator can answer "how many weeks of cash do I have?" from the dashboard without manual math (Phase 1C onward)

---

That's everything. Phase 0 is a small, focused PR — connections + empty scaffolding. The next nine phases (1A through 5) each get their own scoped PR with its own buildout brief produced by the session that builds them. Iterate, ship small, prove pattern, expand.
