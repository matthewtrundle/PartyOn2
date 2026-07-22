---
id: cruise-weather-reschedule
tier: T2
freq_rank: 18
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: null
escalation_override: >
  A rain-out REFUND or money ask ("refund for the rained-out boat") is Party On
  Delivery's, not Premier's — ack + escalate to Allan (T4-urgent). Never send a
  refund/money ask to Premier's number.
confidence_instruction: >
  High confidence for the weather/go-no-go and reschedule questions: those are Premier's
  call, so state the policy and point the customer to Premier at 512-488-5892. Do NOT
  route the go/no-go to Allan. Refund/money asks are the exception — those escalate to
  Allan, never to Premier.
match_examples:
  - "It's supposed to storm Saturday, is the cruise still happening?"
  - "Can you push our boat back 2 hours? - Dan"
  - "Still needing this $66 refund for the boat party that was rained out"
---

## Answer (canonical)

Weather calls and reschedules are Premier's call. State the verified policy — Premier and
the captain make the call close to departure, cruises usually run rain or shine unless
conditions are unsafe, and if Premier reschedules the drink delivery moves with it at no
charge — then point the customer to Premier directly at 512-488-5892 for the latest.
Never predict the weather call. The ONE exception: a rain-out REFUND or money ask is
Party On Delivery's, not Premier's — for those, ack and escalate to Allan (never send a
refund to Premier). (Corpus color: Allan has run cruises in warm rain — "everyone is
swimming in the rain, it's amazing" — so guessing "probably cancelled" would be actively
wrong.)

## SMS

Hey {{first_name}} — weather calls get made close to boat time by Premier and the captain (these usually run rain or shine!). For the latest on your cruise, text Premier at 512-488-5892. If the boat does get moved, your drinks move with it free.

## Email

Hi {{first_name}},

Weather calls are made close to departure by Premier and the captain, so I don't want to
guess for you — cruises usually run rain or shine unless conditions are unsafe. For the
latest on your cruise, reach Premier directly at 512-488-5892. And one reassurance: if
Premier reschedules, your drink delivery moves with it at no charge.

Party On Delivery

## Chat

Weather calls happen close to boat time — that's Premier and the captain's call, and
these usually run rain or shine, so don't cancel your plans yet. For the latest on your
cruise, text Premier directly at 512-488-5892. And if Premier moves the cruise, your
drinks move with it at no charge.

## Voice

State the policy; give Premier's number 512-488-5892 for the go/no-go. For a rain-out
refund/money ask, take name/number and escalate to Allan.

## Notes for Allan

- CHANGED 2026-07-07 (operator): weather/go-no-go + reschedule questions now redirect to
  Premier's number 512-488-5892 (card re-tiered T4→T2) instead of pinging Allan — see
  fact `premier-phone`. Rain-out REFUND/money asks are the exception: still POD's, ack +
  escalate to Allan (they also match refund_keyword and the refund-credit-request card).
- Golden-set note: any weather case previously labeled T4-escalate is now a T2 Premier
  redirect — relabel in the next replay-harness pass.
- Weather policy verified 2026-07-07: Premier + captain call it, usually rain or shine;
  drinks move free on a Premier reschedule.
