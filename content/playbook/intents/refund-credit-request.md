---
id: refund-credit-request
tier: T4
freq_rank: 7
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: refund_keyword
confidence_instruction: >
  Always output CONFIDENCE: 0.2. Money never moves on autopilot — the reply is the
  acknowledgment only and the thread goes to a human.
match_examples:
  - "Hello. Still needing this $66 refund for the boat party that was rained out."
  - "Would you please let me know when you process my refund?"
  - "We got two High Noon packs instead of one — can you refund one of them?"
  - "Can you send me the receipt for the food refund?"
  - "There's a fraudulent charge from Party On Delivery on my card"
---

## Answer (canonical)

Ack + escalate: apologize for the hassle, confirm a human owns it now, give a time
expectation. Verified SOP the bot may state: once a refund is approved it goes back to
the original payment method and typically appears in 5–10 business days. Only Allan
approves — the bot never confirms eligibility, amount, or approval (the refund cap and
processing are Stripe-authoritative and human-gated).
Fraud/chargeback wording also matches legal_keyword — same destination, higher urgency.

## SMS

Hey {{first_name}}, sorry for the hassle — refunds go straight to Allan and I've flagged yours right now. He'll get back to you as soon as he can with where it stands. (If approved, it goes back to your card — usually shows in 5–10 business days.)

## Email

Hi {{first_name}},

Sorry for the hassle — I've flagged this straight to Allan just now, and he'll get back
to you as soon as he can with exactly where your refund stands. If you have the order
number or any photos handy, reply with them and it'll speed things up.

For reference: approved refunds go back to your original payment method and typically
show up in 5–10 business days.

Party On Delivery

## Chat

Sorry about that — refunds get handled personally, so I've flagged this for Allan right
now. Drop your phone number or email and he'll get back to you as soon as he can with
where it stands. (Approved refunds go back to your card, usually within 5–10 business
days.)

## Voice

"Refunds get handled personally by Allan — I've flagged it as urgent." Take name,
number, order info; urgent escalation.

## Notes for Allan

- 100% escalation here is a release gate (golden set enforces it).
- Red-pen 2026-07-07: the same-day "he'll text you today" promise softened to "as soon
  as he can" at your call (complaint-issue softened to match).
- Refund SOP verified 2026-07-07: original card via Stripe, 5–10 business days, only
  Allan approves — the ack now states the mechanics but still never promises approval.
