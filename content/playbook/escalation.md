# Escalation policy

When the bot must stop being helpful and get a human. The keyword lists below MIRROR the
code-owned lists in `partyon-crm/apps/web/lib/ai-inbox/escalation-triggers.ts` — the
ingest lint fails if they drift. **Changing a trigger = a CRM pull request**, not a
playbook edit.

## When to escalate (any one is sufficient)

1. **Tier rule**: the matched intent card is T4 → always. T3 → draft held for approval.
2. **Keyword triggers** (mirrored below) fire regardless of intent match.
3. **Low confidence**: model confidence < 0.6 → held as draft (`low_confidence`).
4. **Negative sentiment** and **repeat contact** (same sender ≥3 messages in 24h with no
   human reply) — engine-computed.
5. **Judgment overrides** (the bot is told): minors/intoxication signals, safety
   incidents, anything about chargebacks or fraud, media/PR inquiries, and any request
   to change money (refund, cancel, price adjustment).

## Destinations (interim — until the CRM escalations queue is live)

| Class | Route | Examples |
|---|---|---|
| **Urgent** (day-of, safety, money-in-flight) | SMS to Allan's cell 512-576-7975 | boat leaving, delivery failed, minors/intoxication, injury |
| **Standard** (everything else T4 + T3 drafts) | info@partyondelivery.com | refund requests, complaints, quotes awaiting approval |

Once the CRM is deployed: escalations land in the `escalations` table (with reason +
confidence), replies are held as drafts (`ai-inbox-process-inbound.ts`), and notify rules
take over. The classes above map 1:1.

## Customer-facing ack (what the customer hears at T4)

Per-channel copy lives on each T4 card. The shape is always: acknowledge → name the next
step → give a time expectation. Never argue, never explain policy, never promise an
outcome ("Allan will make the final call on the refund" — not "you'll get a refund").

## Keyword mirror (source of truth: escalation-triggers.ts — do not edit here)

### refund_keyword
```
refund, chargeback, charge back, money back, never received, haven't received,
have not received, didn't receive, did not receive, still waiting,
cancel my subscription, cancel subscription, cancel my order, cancel order
```

### complaint_keyword
```
complaint, unacceptable, terrible, awful, worst, disappointed, frustrated,
angry, ridiculous, unhappy
```

### legal_keyword
```
lawyer, attorney, legal, lawsuit, sue, dispute, scam, fraud,
better business bureau, bbb
```

### repeat_phrase
```
fourth attempt, fourth time, third time, third attempt, again, still no response,
no response, follow up, following up, as i mentioned, like i said
```

### Other engine reasons (no keyword list)
`low_confidence` (< 0.6), `negative_sentiment`, `repeat_contact`

## Known gaps to raise in review

- The `repeat_phrase` list contains the bare word "again" — it will over-trigger on
  benign messages ("can't wait to do it again!"). Flagged for a future CRM PR; the
  playbook does not work around it.
- The engine has no explicit minors/intoxication trigger — the playbook covers this via
  T4 intent cards + the compliance prompt block, but a keyword class in code would be
  more robust. Candidate future CRM PR.
