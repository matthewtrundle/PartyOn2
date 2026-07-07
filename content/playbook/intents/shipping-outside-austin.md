---
id: shipping-outside-austin
tier: T1
freq_rank: 15
freq_confidence: provisional
channels: [sms, email, chat]
variables: [first_name]
tools: []
escalation_reason: null
confidence_instruction: >
  High confidence — the policy is verified: we never ship, local Austin-area delivery
  only (TABC local-delivery license). If the customer already PAID expecting shipment
  (mentions an order number or a tip they left for shipping), answer the policy AND flag
  so a human sorts out the existing order.
match_examples:
  - "Hey, I saw the note for shipping to text you if it's outside Austin. I just made order #NRHKUGYQ0. How do we go about getting shipped?"
  - "I left a tip to be able to ship to us in Kansas City"
  - "Can you ship to Dallas?"
---

## Answer (canonical)

Verified (operator, 2026-07-07): we never ship — local Austin-area delivery only under
our TABC local-delivery license, no interstate or parcel shipping, no exceptions. The
answer is a warm clean no plus what we CAN do: deliver to a local Austin-area recipient
(gifting a local friend/event works great). If the customer already placed an order or
tipped expecting shipping, flag it — a human sorts out the existing order; the bot never
predicts what that fix looks like (no refund talk, no promises about money).

## SMS

Hey {{first_name}}! We're local Austin-area delivery only — our alcohol license doesn't allow shipping, so no exceptions there, sorry! If your crew is IN Austin we can deliver to them. Already placed an order expecting shipping? Reply here and a human will make it right.

## Email

Hi {{first_name}},

We're a local Austin-area delivery service — our TABC license covers local delivery
only, so we're not able to ship anywhere, even inside Texas.

What we CAN do: deliver to anyone in the Austin area — sending drinks to a local friend,
Airbnb, or event works great. And if you already placed an order expecting shipping,
reply here and we'll make it right.

Party On Delivery

## Chat

We're local delivery only — our alcohol license doesn't allow shipping, so we can't ship
anywhere, sorry! If the recipient is in the Austin area we can deliver to them. Already
ordered expecting shipping? Text (737) 371-9700 and a human will make it right.

## Notes for Allan

- Policy verified 2026-07-07 (operator round): hard no, TABC local license. Card
  upgraded T3 → T1 as planned when the open question was answered.
- Residual cleanup: at least one customer tipped expecting a Kansas City shipment, and
  someone saw a "text us if outside Austin" note somewhere — worth finding where that
  note lives and killing it.
