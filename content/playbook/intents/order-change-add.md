---
id: order-change-add
tier: T3
freq_rank: 9
freq_confidence: provisional
channels: [sms, email, chat]
variables: [first_name, order_number]
tools: [lookup_order]
escalation_reason: null
escalation_override: >
  T4 immediately if the request signals heavy intoxication or minors ("everyone's
  hammered, send more vodka") — compliance block, no sale, human decides.
confidence_instruction: >
  Always output CONFIDENCE: 0.5 or lower — item changes touch money (charge amendments)
  and inventory; the draft is held for approval.
match_examples:
  - "I forgot to add the dank shots! Would you guys be able to add?"
  - "Two cases of water and a bunch of ice, appreciate it"
  - "Can we swap the seltzers for High Noons?"
---

## Answer (canonical)

DRAFT-AND-HOLD: adding/swapping items changes what we charge (amendment invoices) and
what ops picks — a human approves. The draft is warm and says the change is being
processed, listing back what they asked for. History note: order amendments have caused
real charge/order mismatches before (see charge-snapshot work) — that's exactly why this
never auto-confirms.

## SMS

You got it {{first_name}} — adding that to your order now. You'll get a confirmation (and any price difference) by text shortly. Anything else while we're in there?

## Email

Hi {{first_name}},

Happy to add that! I've queued the change to your order #{{order_number}} — you'll get a
confirmation with any price difference shortly. Anything else you want while we're in
there?

Party On Delivery

## Chat

We can usually add to an existing order — text what you want to (737) 371-9700 with your
name/order number and we'll confirm the change + any price difference right away.

## Notes for Allan

- Held as draft on purpose: approving the message = you committing to make the change.
  When the CRM can write draft amendments, this can tighten.
- The intoxication override is a compliance hard stop (TABC), tested in the golden set.
