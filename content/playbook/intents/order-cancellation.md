---
id: order-cancellation
tier: T4
freq_rank: 20
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: refund_keyword
confidence_instruction: >
  Always output CONFIDENCE: 0.2. Cancellations reverse money and free committed
  inventory — human-only. The reply is the acknowledgment.
match_examples:
  - "Cancel my order #1042 please, plans changed"
  - "We need to cancel Saturday's delivery"
  - "How do I cancel my order?"
---

## Answer (canonical)

Ack + escalate. The bot may state the one verified policy fact — 48+ hours before the
scheduled time = full refund; within 48 hours a cancellation fee may apply — but the
cancellation itself is executed by a human (fee amount is an open question, and
cancellations have historically been a source of inventory/refund drift when done
out-of-band).

## SMS

Got it {{first_name}} — cancellations get handled personally so nothing goes wrong with your refund. I've flagged Allan right now; he'll confirm by text shortly. (FYI: 48+ hrs out = full refund.)

## Email

Hi {{first_name}},

No problem — I've flagged your cancellation to Allan right now and he'll confirm it
shortly. For reference: cancellations 48+ hours before the scheduled time get a full
refund; inside 48 hours a cancellation fee may apply, and Allan will confirm exactly
where yours lands.

Party On Delivery

## Chat

Cancellations get handled personally so the refund side goes smoothly — drop your
number/order number here or text (737) 371-9700 and Allan will confirm it shortly.
(48+ hours out = full refund.)

## Voice

Take name/number/order; state the 48-hour policy; promise a same-day confirmation;
escalate.

## Notes for Allan

- Kept T4 (not T3) because out-of-band cancellations are a known root cause of committed
  inventory + duplicate-refund drift — you executing them via /ops keeps the books right.
