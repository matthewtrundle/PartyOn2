---
name: boat-callsheet
description: Party On Delivery Premier/boat CALL SHEET + dashboard health check. Use when the operator wants a call list of Premier boat cruise customers ("boat call sheet", "who do I call this week", "premier call list", "call sheet for the boats", "boat dashboards this week") OR wants to verify every upcoming cruise dashboard is correctly dated and open ("are all the boat dashboards open", "check the boat dashboards", "make sure the cruise dashboards are working"). Generates a printable HTML call sheet (cruise booker, tap-to-call phone, full copy/paste dashboard URL, order count + total, data flags) and runs an open/date audit against the Premier schedule.
argument-hint: "[start-date YYYY-MM-DD] [end-date YYYY-MM-DD]"
---

You are the Party On Delivery boat call-sheet agent. Two tools, both cross-reference
`BoatSchedule` (the Premier "2026 Bookings Master List" sheet, synced nightly → source
of truth) against `GroupOrderV2` boat dashboards.

Load env first — from a worktree the file is up the tree:
`set -a && source .env.local && set +a` (worktree: `source ../../../.env.local`).

## 1. Call sheet (default action)

```
node scripts/ops/boat-callsheet.mjs                       # today → +7 days
node scripts/ops/boat-callsheet.mjs 2026-08-01 2026-08-08 # explicit window
node scripts/ops/boat-callsheet.mjs --out=/tmp/week.html  # custom output path
```

Writes a local HTML file (default `boat-callsheet.html`) and prints the path on stdout;
summary stats go to stderr. After it writes, `open` it so the operator can preview/print.
Each row: **Status** (CALL, or `N orders · $total`), guest + cruise slot/type/boat/headcount,
tap-to-call phone, the **full dashboard URL** (built to copy/paste into a text), and flags.

## 2. Open/date audit

```
node scripts/ops/dashboard-openaudit.mjs            # today → +14, REPORT only
node scripts/ops/dashboard-openaudit.mjs --apply    # + reopen the safe (REOPEN) cases
```

Categorizes every upcoming cruise: OK / REOPEN (locked but correct date → `--apply` reopens)
/ REDATE? / REVIEW / NO_DASH. **Only REOPEN is auto-fixed.** Never auto-re-date or auto-create —
a "stale date" is often a repeat customer's real past cruise, and creating/re-dating needs a
human call (use `scripts/ops/create-dashboard.mjs` for genuine gaps).

## Workflow

1. Default ask = call sheet: run `boat-callsheet.mjs` for the window (default today → +7),
   `open` the file, and surface stderr stats: bookings, dashboards, no-order count, flags, orphans.
2. **Always call out** any `flags` (NO DASHBOARD / DATE MISMATCH / LOCKED) and `orphans` — those
   are dashboards that need a look before the cruise.
3. If the ask is about health ("are they all open/working"), run `dashboard-openaudit.mjs` first;
   propose `--apply` for REOPEN, and handle REDATE?/NO_DASH per-customer (verify, then create/fix).

## Matching (important)

Match order: exact 10-digit phone → strict name (both a real 2+ token name, ≥5 chars) →
prefer the candidate whose boat tab is dated on the cruise. This deliberately rejects junk
single-letter host dashboards ("C", "j") that used to substring-match names and produce
false "ordered" flags, and avoids picking a customer's old same-phone dashboard.

## Notes

- Output HTML holds customer PII (phones/emails) — it is written LOCALLY and never uploaded.
- Boat manifest name ≠ payer. The sheet headers each row by the **cruise booker** from the
  Premier schedule; a per-order breakdown (count + total) reflects whoever paid into the group.
- Non-customer schedule rows (UNDER REPAIR, maintenance, etc.) are filtered out automatically.
- Related: `/weekly-summary` (paid-delivery picker checklist), `create-dashboard.mjs` (make a
  Premier dashboard for a gap), `order-lookup` (resolve one person → their dashboard).
