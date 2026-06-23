# Finance data cleanup — canonical plan

> Self-contained brief. A future session (or the operator) should be able to read this
> alone and understand what the cleanup does, why, and in what order. Companion to
> `docs/FINANCE-DIRECTOR-AGENT-BUILDOUT.md` §0 and `docs/CONNECT-PRODUCTION-PLAID.md`.

## Why

The Finance Director's **revenue** trajectory (2021→today) is solid. But **net income is
unreliable for every month** because expenses and income aren't reconciled against the two
sources the operator actually has: the **Wells Fargo bank account** and **QuickBooks**.

The 3-agent investigation (2026-06-18/19) found:

- **QuickBooks** (prod, *Premier Concierge Worldwide*, realm 9130357382202626) has clean
  expenses for **2023–2025** but is **dormant for 2026** — only ~$1,700/mo of auto-posted
  Shopify-selling-fee Purchases, no rent/payroll/alcohol, 0 Bills, 0 Journal Entries.
- **Plaid (bank feed) is still on SANDBOX** — fake "Platypus" test data. Real Wells Fargo
  was never connected, so the bank-reconciliation path is synthetic.
- **No Stripe→QB income connector** beyond the daily sales-journal cron; real 2026 income
  (~$107k YTD) lives in the `Order` table.

This cleanup makes monthly profit trustworthy, then rebuilds the rollup on reconciled
data. It is the prerequisite for **PR D** (the monthly close email — deferred).

## Operator decisions (locked)

1. Connect Wells Fargo via Plaid for the recent ~24 months (Plaid's window; fills the 2026
   expense gap QB misses). Rely on QB for 2023–2025. **No manual CSV import** this slice —
   2021–2022 stays thin and that's accepted.
2. **Income source of truth = actual Wells Fargo deposits.**
3. **Focused first slice**; defer historical CSV import + a full discrepancy dashboard.

## The slice (B1–B6)

### B0. Schema + migration
Add two columns to `PlaidTransaction`: `bankDerivedCategory` (text) and
`isBankDerivedExpense` (bool, default false). Idempotent raw SQL in
`prisma/migrations/manual/2026-06-19-finance-bank-derived-expense.sql` — auto-applies on
the next prod deploy via the `_manual_migrations` ledger.

### B1. Connect production Wells Fargo (operator + a small OAuth code change)
Operator sets `PLAID_ENV=production` + prod `PLAID_CLIENT_ID`/`PLAID_SECRET` in Vercel,
redeploys, and reconnects at `/admin/finance/connect-bank` with the real Wells Fargo
login (runbook: `docs/CONNECT-PRODUCTION-PLAID.md`). `exchangePublicToken()` already
stamps `environment` and upserts by Plaid item_id, so storage is multi-env-ready.

**⚠️ OAuth.** Wells Fargo is an OAuth-only institution at Plaid. The current
`createLinkToken` passes a `webhook` but **no `redirect_uri`**, and the connect-bank page
has no OAuth re-init — the flow was only exercised against the non-OAuth sandbox bank. So
B1 includes a small code change: add `redirect_uri` (env `PLAID_REDIRECT_URI`) to the
link-token, handle `receivedRedirectUri` re-init on the connect page, and register the URI
in the Plaid dashboard.

After the cutover, **purge the sandbox PlaidItem** via
`POST /api/admin/finance/plaid/purge-non-prod` (deletes everything where
`environment != 'production'`).

### B2. Bank-outflow categorization (production-only)
New `src/lib/finance/plaid-category-map.ts` → `categorizeBankOutflow(txn)` → `CategorySlug`
(the shared taxonomy from `qb-account-map.ts`). Precedence: **distributor allowlist →
`cogs`** → Plaid `pfcDetailed` → `pfcPrimary` → merchant name (reuses
`NAME_KEYWORD_RULES`) → `other`. **Transfers / credit-card payments / loan principal /
owner draws → `non_operating`** so they're never counted as expenses (bank data is noisy).
Stamped during the existing Plaid sync (a step after `reconcileItem`), production items
only, on outflows with no QB match. `isBankDerivedExpense = true` only for real costs
(cogs or an operating slug; false for `non_operating`).

**⚠️ Alcohol COGS** is the weak point — Plaid has no wholesale-alcohol signal. The
allowlist is seeded with **RNDC / Republic National, Southern Glazer's, Total Wine,
Spec's** and refined against real bank-statement names after the first prod sync, or 2026
gross margin is approximate.

### B3. Income reconciliation to bank deposits (a check — does NOT overwrite revenue)
New `src/lib/finance/bank-income-recon.ts` → `reconcileBankIncome(year, month)`: aggregate
production bank inflows, split matched-to-Stripe-payout vs unmatched, surface unmatched as
"other income" + a flag. Order/Shopify stays the itemized revenue line.

**⚠️ StripePayout gap.** Jan–May 2026 has no `StripePayout` rows (sync gap before
2026-05-26), so those deposits look non-Stripe purely from the gap. A deposit counts as
Stripe-explained if it matches a payout **or** the month's aggregate Order/Shopify Stripe
revenue accounts for it. Backfilling earlier payouts is deferred.

### B4. Rollup source-precedence + reliability flip (`monthly-rollup.ts`)
Per month, **never blend** QB + bank (QB's own bank feed sees the same transactions →
double-count):

- **Expense source = QB where QB is _material_, else bank-derived.** Material =
  **sum of QB expenses in categories other than `payment_fees` ≥ a floor (~$500)**. This
  defeats the trap where 2026's ~$1,700 of `payment_fees` rows would falsely win under a
  naïve `qbExpenses.length > 0` test and hide the real bank expenses.
- **Reliability:** `netIncomeReliable` becomes true via **either** the QB path (existing)
  **or** the bank path (`expenseSource='bank'` + non-trivial bank-outflow coverage vs
  revenue + income reconciled per B3). 2026 months flip to reliable once WF lands; thin
  pre-2023 months stay unreliable.

### B5. Discrepancy flags (surface, don't auto-fix → `dataHealth.flags`)
Per month: bank outflow with no QB match in a QB-material month; bank deposit not matching
any Stripe payout (and not Stripe-explained per B3); month where bank total materially ≠
QB total.

### B6. Backfill + cron
New `scripts/finance/backfill-bank-categories.ts` stamps existing prod Plaid outflows, then
re-run `scripts/finance/backfill-monthly-rollups.ts`. Steady state: the daily
`finance-plaid-sync` cron categorizes new outflows; the nightly monthly-rollup cron
recomputes trailing months.

## Execution order & operator pause

1. Worktree → main → 2. **PR A** (docs/infra) → 3. **PR B** code (B0, B2, B3, B4, B5,
B6-script, the B1 OAuth change + purge route) — tsc/lint/test clean, merge →
4. **PAUSE: operator connects Wells Fargo** (env + reconnect via the runbook) →
5. purge sandbox → 6. first prod sync populates rows → 7. run
`backfill-bank-categories.ts` then `backfill-monthly-rollups.ts` → 8. verify.

## Top risks
1. **Precedence trap** — "QB material" (floor excluding `payment_fees`), not `length>0`.
2. **Alcohol COGS** — needs the distributor allowlist, or 2026 margin is approximate.
3. **StripePayout Jan–May gap** — income gate must fall back to aggregate Stripe revenue.
4. **Wells Fargo OAuth** — connect needs the `redirect_uri` + re-init change (B1).
5. **Sandbox contamination** — all bank-derived logic gates on
   `PlaidItem.environment = 'production'`, so sandbox data never pollutes rollups.
6. **Plaid PFC enum drift** — validate category strings against the live taxonomy after the
   first prod sync.
