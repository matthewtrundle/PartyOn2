---
name: reconcile
description: Investigate and fix production data inconsistencies — duplicate refunds, charge/order mismatches, inventory drift, doubled amendments, orphaned rows, webhook double-writes. Use when the user reports numbers not matching, suspected data corruption, or asks to "clean up", "reconcile", "audit", or "backfill" production data. Builds an operator-gated script (dry-run default, --apply flag, idempotent, refuses test keys) — NEVER mutate prod data ad hoc, and treat Stripe as the authoritative source for money.
---

# Reconcile — operator-gated production data fixes

Production data fixes here follow one proven pattern: **measure first, propose a plan, apply only behind an explicit operator gate.** Ad-hoc `prisma.update()` runs against prod are forbidden — every past incident cleanup (duplicate refunds, doubled amendments, charge mismatches) went through a script, and the scripts are committed so the next investigation starts from prior art.

## Phase 1 — investigate (read-only)

1. Quantify the blast radius with read-only queries (`/db-query` skill / Postgres MCP). How many rows, how many dollars, which date range, still occurring or historical?
2. **When money is involved, the DB is not the source of truth — Stripe is.** List the actual Stripe objects (refunds, charges, sessions) and diff against DB rows (memory: `refund_cap_stripe_authoritative.md`, `charge_snapshot_invariant.md`).
3. Find the root cause before repairing data. If the writer bug is still live, fix and ship it first (via `ship`) — otherwise the repair re-corrupts.
4. Read the closest prior-art script before writing a new one:

| Script (`scripts/ops/`) | What it repaired |
|---|---|
| `reconcile-duplicate-refunds.mjs` | Webhook double-created Refund rows; merges/deletes only when DB↔Stripe reconcile 1:1 |
| `fix-doubled-amendment-orders.mjs` | Amendment diff applied twice (submission + webhook) |
| `audit-order-charge-mismatches.mjs` | OrderItems vs Stripe-charged lines (two-snapshot undercharge) |
| `audit-affiliate-discounts.mjs` | Affiliate discount-redemption drift |

`reconcile-duplicate-refunds.mjs` is the gold standard — copy its structure.

## Phase 2 — write the script

`scripts/ops/reconcile-<slug>.mjs`, with ALL of these properties (all lifted from the gold standard):

- **Header comment** stating the bug, the repair semantics, and the safety invariant.
- **Dry-run is the default.** Nothing writes without `--apply`. Support `--json` and a narrowing flag (e.g. `--order=N`) for spot checks.
- **Fail loudly on bad env**: exit 1 if the needed keys are missing; **refuse `sk_test_`/`rk_test_` Stripe keys** (a test key silently returns empty lists and the script would "reconcile" against nothing).
- **Safety invariant over reason-matching**: only apply a change when the post-change state provably matches the authoritative source (e.g. DB refund rows map 1:1 onto Stripe's live refunds, totals within a cent). Anything that doesn't reconcile cleanly → report `NEEDS-MANUAL`, touch nothing.
- **Idempotent** — running twice is safe; re-running after a partial apply converges.
- **Row locks where writers race**: inside a transaction, `SELECT ... FOR UPDATE ORDER BY id` before re-validating (single-writer principle, vault ADR-0006).
- **Summary output**: counts per action (merge/delete/stamp/needs-manual) and dollar totals, both in dry-run and after apply.

Env preamble for every run:
```bash
set -a && source .env.local && set +a
node scripts/ops/reconcile-<slug>.mjs            # dry run
node scripts/ops/reconcile-<slug>.mjs --apply    # only after operator approval
```

## Phase 3 — the operator gate

1. Present the dry-run output to Allan: counts, dollars, the NEEDS-MANUAL list, and what `--apply` will change.
2. **Wait for an explicit go.** "Apply it" means run `--apply` once and report the post-apply summary; anything less means stop at the dry run.
3. After apply: re-run the dry run — it should now report zero planned changes. Paste that as proof of convergence.
4. **Commit the script** (via `ship`). Uncommitted ops scripts have been lost to branch switches before (`reconcile-committed.mjs` was built in June and never committed — it's gone from the repo). The script *is* the documentation of what was repaired.

## Never

- Never mutate prod rows from an inline `node -e` / ad-hoc Prisma call.
- Never delete rows on pattern-matching alone (reason strings, timestamps) — only on failed reconciliation against the authoritative source.
- Never touch rows that other records point at (e.g. `OrderAmendment.refundId`) without handling the reference.
- Never run `--apply` in the same turn you present the dry run. The gate is the point.
