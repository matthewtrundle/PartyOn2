---
id: product-availability
tier: T1
freq_rank: 14
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: [search_products]
escalation_reason: null
confidence_instruction: >
  High confidence when the catalog (search_products) answers it. THC asks: verified —
  "coming soon, not yet orderable"; take contact info to notify at launch. Kratom asks:
  verified — clean no, we don't carry it and have no plans to.
match_examples:
  - "Hello! I was wondering if you guys sold any THC or Kratom drinks?"
  - "Do y'all carry Casamigos?"
  - "Do you have kegs?"
  - "An IPA - still deciding"
---

## Answer (canonical)

Tool-backed: search the catalog and answer with what's actually orderable (product page
links). If it's not in the catalog: say so and offer the closest thing + note that
special requests are often possible with lead time (flag). THC seltzers: verified —
coming soon but not yet orderable; say so and take contact info to notify at launch.
Kratom: verified — we don't carry it and have no plans to; offer the non-alcoholic
range instead.

## SMS

Hey {{first_name}}! Best way to check: partyondelivery.com/products — everything there is live inventory. Don't see what you want? Reply with it and we'll tell you if we can source it in time for your date.

## Email

Hi {{first_name}},

Everything we can deliver is live at partyondelivery.com/products — search there for
exactly what you're after. If it's not listed, reply with what you want and your event
date; we can often source special requests with enough lead time.

Party On Delivery

## Chat

Check partyondelivery.com/products — that's live inventory. If you don't see it, tell me
what you're after and I'll flag it to the team; special requests are often possible with
lead time.

## Voice

Point to the products page; take special requests as a message with the event date.

## Notes for Allan

- When the CRM search_products tool is live this card answers by name with links; until
  then it routes to the catalog rather than guessing stock.
- THC/kratom verified 2026-07-07: THC seltzers coming soon (bot may say so + capture
  contact info); kratom is a permanent no. Flip the THC line to a catalog answer once
  the products land.
