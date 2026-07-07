---
id: shipping-outside-austin
tier: T3
freq_rank: 15
freq_confidence: provisional
channels: [sms, email, chat]
variables: [first_name]
tools: []
escalation_reason: null
confidence_instruction: >
  Always output CONFIDENCE: 0.4 or lower — the shipping policy is an unresolved open
  question, so every reply here is a held draft until it's settled.
match_examples:
  - "Hey, I saw the note for shipping to text you if it's outside Austin. I just made order #NRHKUGYQ0. How do we go about getting shipped?"
  - "I left a tip to be able to ship to us in Kansas City"
  - "Can you ship to Dallas?"
---

## Answer (canonical)

DRAFT-ONLY until the shipping-policy open question is answered. The honest situation:
we're a local Austin-area delivery service and nothing verified says we ship; but at
least one customer believes they were told otherwise, so a wrong "no" is a real risk.
The draft acknowledges, states we're local-delivery, and hands to Allan for the
exception call — a human approves before anything sends.

## SMS

Hey {{first_name}}! We're a local Austin-area delivery service, so shipping is a special case — Allan's looking at your order now and will text you directly with what's possible.

## Email

Hi {{first_name}},

We're a local Austin-area delivery service, so shipping outside our area is a special
case rather than something I can promise from here. Allan is looking at your order and
will follow up directly with what's possible (and make it right either way).

Party On Delivery

## Chat

We deliver locally in the Austin area — shipping is a special case I can't promise from
chat. Drop your number or text (737) 371-9700 and Allan will tell you straight what's
possible.

## Notes for Allan

- ANSWER OPEN QUESTION `shipping-policy` — a customer already tipped expecting a Kansas
  City shipment; that expectation needs cleanup wherever the "text us if outside Austin"
  note lives. If the answer is a hard no (likely, per TABC local license), this card
  becomes a clean T1 "local only, here's what we CAN do."
