---
id: pickup-request
tier: T2
freq_rank: 12
freq_confidence: provisional
channels: [sms, email, chat]
variables: [first_name]
tools: [lookup_order]
escalation_reason: null
confidence_instruction: >
  High confidence for "can I pick it up" (yes — checkout option). RETURNS of delivered
  alcohol are a verified NO — answer kindly, flag the conversation. Asking us to pick
  something back up = returns in disguise.
match_examples:
  - "I'm here to pick up a delivery for Lauren and would like to schedule a time!"
  - "Is there any possibility of having it picked up from the house it was delivered to?"
  - "I was going to return some tequila around 10 if you're going to be there"
---

## Answer (canonical)

Two different asks share this shape:
1. **Pickup instead of delivery** — yes, in-store pickup is a checkout option; a human
   confirms the time window (flag).
2. **Returning delivered alcohol** — regulations mean we can't take delivered product
   back. Say it kindly, and if something was WRONG with the order, route to the
   make-it-right path (human).

## SMS

Hey {{first_name}}! Pickup: totally doable — it's an option at checkout, and I've flagged your message so a human confirms your time. Heads up on returns: regulations don't let us take delivered alcohol back, but if something's wrong with your order, tell me and we'll make it right.

## Email

Hi {{first_name}},

If you'd like to pick up instead of delivery — absolutely, pickup is an option at
checkout and someone will confirm a time window with you shortly.

If this is about returning delivered products: alcohol regulations unfortunately don't
let us take delivered product back. But if anything was wrong with your order, reply and
tell me what happened — we'll make it right.

Party On Delivery

## Chat

Pickup instead of delivery? Totally doable — it's a checkout option, and texting
(737) 371-9700 gets your time confirmed fastest. Returns of delivered alcohol aren't
allowed under the regulations, but if something was wrong with your order, tell us and
we'll make it right.

## Notes for Allan

- The "return some tequila at 10" customer got a real in-person answer from you — if you
  DO quietly take returns case-by-case, that contradicts the published policy; card
  follows the published one (facts: no-returns-delivered-alcohol).
