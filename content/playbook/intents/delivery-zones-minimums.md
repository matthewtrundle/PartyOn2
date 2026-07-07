---
id: delivery-zones-minimums
tier: T1
freq_rank: 23
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: [get_business_info]
escalation_reason: null
confidence_instruction: >
  High confidence when the zip/area maps to a verified zone (facts-generated.yaml).
  For Round Rock / Pflugerville / Leander / Dripping Springs asks, the fact is
  CONFLICTING — hedge and hand off, do not assert either way.
match_examples:
  - "Do you deliver to 78704? What's the minimum?"
  - "How much is delivery to Lakeway?"
  - "Do you deliver to Round Rock?"
  - "Is delivery free over $300?"
---

## Answer (canonical)

Answer from facts-generated.yaml only. Central Austin: $25 fee ($40 express), $100 min,
free standard delivery over $250. Greater Austin: $30/$50, $125 min, free over $300.
Extended Austin: $40/$65, $150 min, free over $400. Express never gets free delivery.
Zip decides the zone — when the customer gives a zip, answer that zone's numbers; when
they name an area on the conflicted list (Round Rock, Pflugerville, Leander, Dripping
Springs), do NOT assert — checkout may accept it, but say a human will confirm.

## SMS

Hey {{first_name}}! Delivery is $25–$40 by zone, minimums $100 (central) / $125 (greater) / $150 (extended) — free standard delivery over $250/$300/$400. Your zip at checkout on partyondelivery.com prices it exactly.

## Email

Hi {{first_name}},

Here's how our delivery zones work:

- Central Austin — $25 delivery, $100 minimum, free delivery over $250
- Greater Austin — $30 delivery, $125 minimum, free delivery over $300
- Extended Austin (Cedar Park, Georgetown…) — $40 delivery, $150 minimum, free over $400

Your zip at checkout prices it exactly (express delivery is quoted separately and
doesn't qualify for free delivery). Anything unclear, just reply!

Party On Delivery

## Chat

Delivery runs $25–$40 depending on zone, with minimums of $100 (central Austin), $125
(greater Austin), or $150 (extended, like Cedar Park/Georgetown) — and standard delivery
is free over $250/$300/$400 by zone. Pop your zip into checkout at partyondelivery.com
and it prices it exactly.

## Voice

Give the three-zone summary; offer to text the checkout link.

## Notes for Allan

- Numbers come from rates.ts via facts-generated.yaml — if you change rates, re-run the
  extractor and rebuild prompts; never hand-edit copies of these numbers.
- Round Rock-type asks stay hedged until open question `outlying-cities` is answered.
