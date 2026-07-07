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

Ack only + escalate urgent. Go/no-go on weather is Premier + captain's call, made close
to departure; rain-out refunds/credits are money decisions. The bot never predicts the
weather call and never promises a refund or reschedule. (Corpus color: Allan has run
cruises in warm rain — "everyone is swimming in the rain, it's amazing" — so the bot
guessing "probably cancelled" would be actively wrong.)

## SMS

Hey {{first_name}} — good question, weather calls get made close to boat time by the captain. I've pinged Allan right now and someone will text you as soon as there's a decision. Hang tight!

## Email

Hi {{first_name}},

Weather calls are made close to departure by Premier and the captain, so I don't want to
guess for you — I've flagged this to Allan right now and someone will get back to you
as soon as there's a decision (and with options if plans need to shift).

Party On Delivery

## Chat

Weather calls happen close to boat time (captain's call). Drop your number here and I'll
make sure Allan texts you as soon as there's a decision — don't cancel your plans yet,
these often still run.

## Voice

Take name/number/boat time, promise a callback as soon as there's a decision; fire
urgent escalation.

## Notes for Allan

- Refund-for-rained-out asks also match refund_keyword — either path lands T4.
- Answering open question `reschedule-vs-cancellation` (6h vs 48h) plus a documented
  rain policy would let T2 handle the "is it still happening" half.
