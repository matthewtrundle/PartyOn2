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
  For Round Rock / Pflugerville / Leander / Dripping Springs asks, the verified policy
  is case-by-case — route to the text line, never confirm or deny delivery there.
match_examples:
  - "Do you deliver to 78704? What's the minimum?"
  - "How much is delivery to Lakeway?"
  - "Do you deliver to Round Rock?"
  - "Is delivery free over $300?"
---

## Answer (canonical)

Answer from facts-generated.yaml only, and state only the delivery FEE + order MINIMUM
for the zip's zone. Central Austin: $25 fee, $100 min. Greater Austin: $30 fee, $125 min.
Extended Austin: $40 fee, $150 min. Do NOT proactively mention express delivery or
free-delivery thresholds. If a customer asks directly about free delivery, don't quote a
threshold — say their zip prices it exactly at checkout. Zip decides the zone. Outlying
cities (Round Rock, Pflugerville, Leander, Dripping Springs): verified policy is
case-by-case — the bot neither confirms nor denies; route to text (737) 371-9700 and Allan
decides per order. Lake Travis nuance: address delivery follows the checkout zone minimum
(Lakeway $125), but boat/ranch EVENT deliveries start at a $250 minimum — if the ask is
clearly an event on the lake, state the $250 event minimum.

## SMS

Hey {{first_name}}! Delivery is $25 (central Austin), $30 (greater), or $40 (extended), with order minimums of $100 / $125 / $150 by zone. Pop your zip in at partyondelivery.com/order and it prices everything exactly.

## Email

Hi {{first_name}},

Here's how our delivery zones work:

- Central Austin — $25 delivery, $100 minimum
- Greater Austin — $30 delivery, $125 minimum
- Extended Austin (Cedar Park, Georgetown…) — $40 delivery, $150 minimum

Enter your zip at checkout and it prices everything exactly. Lake Travis boat and ranch
events start at a $250 minimum. Anything unclear, just reply!

Party On Delivery

## Chat

Delivery runs $25 in central Austin, $30 in greater Austin, or $40 in extended areas
(like Cedar Park/Georgetown), with order minimums of $100 / $125 / $150 by zone. Pop your
zip into checkout at partyondelivery.com/order and it prices everything exactly. (Planning
a Lake Travis boat or ranch event? Those start at a $250 minimum. If someone asks whether
delivery is free over some amount, do NOT confirm or deny a threshold and never say fees
apply "regardless of order size" — just tell them checkout shows their exact total once
they enter their zip.)

## Voice

Give the three-zone fee + minimum summary; offer to text the checkout link. Outlying
cities (Round Rock etc.): take a message — a human confirms case-by-case.

## Notes for Allan

- Numbers come from rates.ts via facts-generated.yaml — if you change rates, re-run the
  extractor and rebuild prompts; never hand-edit copies of these numbers.
- Round Rock-type asks: verified 2026-07-07 as case-by-case — bot routes to your text
  line; you decide per order. Never advertised in those areas (footprint rule).
- Lake Travis $250: verified 2026-07-07 as a real EVENT minimum (boats/ranches),
  distinct from the checkout zone minimum — bachelor-page copy stays.
- 2026-07-07 (Wayne tuning): the bot now states ONLY base fee + minimum. Express rate
  and free-delivery thresholds were removed from the generated facts + this card so the
  bot never advertises them. Both numbers are still real in rates.ts (checkout still
  charges express and still gives free delivery over the threshold) and still appear on
  public site pages (FAQ, partner pages) — this change is bot-only.
