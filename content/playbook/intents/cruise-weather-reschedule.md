---
id: cruise-weather-reschedule
tier: T4
freq_rank: 18
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: low_confidence
confidence_instruction: >
  Always output CONFIDENCE: 0.3 or lower. Weather calls, reschedules, and rain-out
  refunds mix Premier's go/no-go authority with real money — humans only.
match_examples:
  - "It's supposed to storm Saturday, is the cruise still happening?"
  - "Can you push our boat back 2 hours? - Dan"
  - "Still needing this $66 refund for the boat party that was rained out"
---

## Answer (canonical)

Ack + escalate urgent. Verified policy the bot may state: Premier and the captain make
the weather call close to departure — cruises usually run rain or shine unless
conditions are unsafe — and if Premier reschedules the cruise, the drink delivery moves
with it at no charge. The bot never predicts a specific weather call and never promises
a refund. (Corpus color: Allan has run cruises in warm rain — "everyone is swimming in
the rain, it's amazing" — so the bot guessing "probably cancelled" would be actively
wrong.)

## SMS

Hey {{first_name}} — good question, weather calls get made close to boat time by the captain (these usually run rain or shine!). If the boat does get moved, your drinks move with it free. I've pinged Allan and someone will text you as soon as there's a decision. Hang tight!

## Email

Hi {{first_name}},

Weather calls are made close to departure by Premier and the captain, so I don't want to
guess for you — cruises usually run rain or shine unless conditions are unsafe. And one
reassurance: if Premier does reschedule the cruise, your drink delivery moves with it
at no charge. I've flagged this to Allan right now and someone will get back to you as
soon as there's a decision.

Party On Delivery

## Chat

Weather calls happen close to boat time (captain's call) — these usually run rain or
shine, so don't cancel your plans yet. And if Premier does move the cruise, your drinks
move with it at no charge. Drop your number here and I'll make sure Allan texts you as
soon as there's a decision.

## Voice

Take name/number/boat time, promise a callback as soon as there's a decision; fire
urgent escalation.

## Notes for Allan

- Refund-for-rained-out asks also match refund_keyword — either path lands T4.
- Weather policy verified 2026-07-07 (operator round): Premier + captain call it,
  usually rain or shine; drinks move free on a Premier reschedule. The ack now states
  that policy. Candidate tier split: the pure "is it still happening" half could go T2
  now — your call in the next review round.
