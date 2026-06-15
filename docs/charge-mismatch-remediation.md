# Charge-mismatch remediation runbook

A two-snapshot race let some orders ship with items Stripe never charged (undercharge) or bill for
items that weren't delivered (overcharge). The code path is now fixed (see
`src/lib/stripe/charge-snapshot.ts` and the migration `prisma/migrations/manual/2026-06-15-charge-snapshot.sql`),
so **no new mismatches accrue**. This runbook is for cleaning up the **historical** ones.

Everything here is **operator-gated**. The audit script only reports; nothing is charged or refunded
automatically. You decide per order.

## 1. Get the list

```bash
set -a && source .env.local && set +a
node scripts/ops/audit-order-charge-mismatches.mjs --csv > charge-mismatches.csv
# or just a human summary:
node scripts/ops/audit-order-charge-mismatches.mjs
```

The report classifies every order with a Stripe session:

- **UNDERCHARGED** — we delivered product we never billed for (Party On's loss). Re-bill or write off.
- **OVERCHARGED (owed)** — we billed for product we didn't deliver, net of refunds already issued.
  These are customers we owe money. Refund them.
- **AMENDED-REVIEW** — the order has a paid amendment (charged on a separate payment), so the automatic
  diff can't be trusted. Verify by hand.

Each row carries: amount, age (days), whether a **reusable card** is on file, group/solo, the specific
items, and the Stripe session / payment-intent ids.

## 2. Do the refunds first (overcharged customers)

These are low-risk and pure goodwill — **do them promptly.** As of the investigation, 4 customers are owed
**$276.51** total (#227 $174.54, #305 $34.99, #291 $34.99, #269 $31.99). Refund via the ops order page or the
Stripe dashboard against the original payment, then send the short note below. Verify the refund settles in
Stripe before marking the order reconciled.

> **Subject: We refunded you — a billing error in your favor**
>
> Hi {{firstName}},
>
> While auditing our records we found that your order on {{date}} was billed for an item we didn't end up
> delivering: {{item}}. We've refunded **${{amount}}** to your original payment method — you should see it in
> a few business days. Sorry for the mix-up, and thank you for partying with us.
>
> — The Party On Delivery team

## 3. Re-bill the undercharges (escalation ladder)

**Never** silently charge a months-old card as the first move — lead with a fresh, customer-authorized
payment link. The original checkouts did **not** save cards for off-session reuse (`setup_future_usage` was
never set), so a last-resort charge is only possible for the minority of customers with a reusable card on
file — the audit's `reusableCard` column tells you which.

| Day | Action |
|-----|--------|
| **0** | Send a fresh re-bill invoice via the amendment-invoice flow → `/invoice/[token]`. Own the error, itemize exactly what they received but weren't billed for, keep the ask low-pressure (template below). |
| **+7** | Follow-up #1 — gentle reminder, same link. |
| **+14** | Follow-up #2 / **final notice** — restate the items, and note that if we don't hear back we may charge the card from the original order. |
| **+21** | Still unpaid → **decide per order**: if a reusable card is on file, attempt an off-session charge (full or partial) with `scripts/ops/rebill-charge-on-file.mjs`; otherwise write it off. Weigh amount, age, and goodwill. |

**Write-off guidance.** Small/old amounts usually aren't worth chasing — the goodwill hit of dunning a
months-old charge can exceed the dollars. Use `--writeoff-below=<$>` on the audit to size the tail, and lean
toward writing off low-dollar, high-age rows.

### Re-bill email template (Day 0)

> **Subject: A small billing correction on your Party On order**
>
> Hi {{firstName}},
>
> We owe you an apology and a quick heads-up. Due to a system error, your order delivered on {{date}} included
> items that we never actually charged you for:
>
> {{itemized list — name, qty, price}}
>
> **Total not yet billed: ${{amount}}**
>
> You received and enjoyed these, so we're sending a secure link to settle the difference whenever it's
> convenient: **{{invoiceLink}}**. No rush, and no late fees — we just want our records to match what you got.
> If anything looks off, reply to this email and we'll sort it out personally.
>
> Thanks for your understanding,
> The Party On Delivery team

### Follow-up #2 / final notice (Day +14)

> Hi {{firstName}}, just following up on the ${{amount}} balance from your {{date}} order ({{items}}). Here's the
> secure link again: {{invoiceLink}}. If we don't hear back, we may charge the card used on the original order to
> close it out. We'd much rather you use the link — reply anytime with questions.

## 4. Last-resort charge (operator-run, guard-railed)

Only after the link + two follow-ups, and only where `reusableCard=true`:

```bash
set -a && source .env.local && set +a
# Dry run (default) — shows owed amount, age, card on file, and the exact charge:
node scripts/ops/rebill-charge-on-file.mjs --order=227
# Execute the full owed amount:
node scripts/ops/rebill-charge-on-file.mjs --order=227 --confirm
# Or a partial / goodwill amount:
node scripts/ops/rebill-charge-on-file.mjs --order=227 --amount=50 --confirm
```

The tool operates on **one order at a time**, refuses to run if no reusable card exists, defaults to a dry run,
and logs every attempt. On a decline or expired card it reports and recommends writing off or continuing to
nudge. After any charge, confirm it settled in Stripe before marking the order reconciled.

## Sequence checklist

1. Run the audit → CSV.
2. Refund the overcharged customers; send the goodwill note.
3. For undercharges above your write-off threshold: send Day-0 invoice, then +7 and +14 follow-ups.
4. At +21, per order: off-session charge (if reusable card) or write off.
5. Verify every refund/charge in Stripe; mark reconciled.
