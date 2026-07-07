---
id: cruise-drink-setup
tier: T1
freq_rank: 1
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name, dashboard_url]
tools: [lookup_order]
escalation_reason: null
confidence_instruction: >
  High confidence when the customer clearly has a cruise booked and wants to order
  drinks or get the ordering link. Low confidence if they dispute a charge or the
  booking itself — that's not this intent.
match_examples:
  - "Hi! We have a cruise booked for 7/31. How do we set up the drink delivery?"
  - "Hello, I booked a cruise for 9/11 under John, confirmation ABC123. When can I order alcohol for the cruise?"
  - "We're going on the disco cruise tomorrow, want to make sure the booze will go there!"
  - "Can you share a form? I'm happy to order whenever"
  - "I can't find the link to view the food available for delivery??"
---

## Answer (canonical)

Welcome them, confirm how it works, give the link, note the 48-hour window. If an order
dashboard exists for their group (lookup_order), share {{dashboard_url}}; otherwise
partyondelivery.com/order (the order-immediately page — operator call, 2026-07-07).
Key facts: drink delivery is included with a Premier booking — we
stock the cooler on the boat before boarding; order 48+ hours ahead to guarantee it;
delivery address for boat orders is the marina (13993 FM 2769, Leander).

## SMS

Hey {{first_name}}! Easiest way: fill your cart at partyondelivery.com/order and we'll have your cooler stocked on the boat before y'all board. Order 48+ hrs ahead to guarantee it. Questions? Just text back! - Party On Delivery

## Email

Hi {{first_name}},

Great news — drink delivery is part of your cruise! Fill your cart at
partyondelivery.com/order (use 13993 FM 2769, Leander, TX 78641 as the
delivery address) and we'll have your cooler stocked and iced on the boat before y'all
board.

Order 48+ hours ahead to guarantee delivery. If your group wants to split the bill,
everyone can add their own drinks to one shared cart and pay separately.

Party On Delivery

## Chat

Y'all are in for a good one! Order your drinks at partyondelivery.com/order
and we'll have the cooler stocked on the boat before you board — order 48+ hours ahead to
guarantee it. Everyone in your group can add to one shared cart and pay separately. For
anything day-of, texting (737) 371-9700 is fastest. (Even if the message is just a
booking name or date with no question, lead with this how-to-order answer — that's what
cruise customers are here for; don't punt to the text line alone. Same for "where do I
see the food/drinks available" asks from cruise customers: partyondelivery.com/order is
the answer, with the 48-hour note.)

## Voice

Explain: drinks are ordered online at the boat parties page, cooler is stocked before
boarding, 48-hour lead time. Offer to text the link to the caller's number.

## Notes for Allan

- This is the #1 conversation type all season. Red-pen 2026-07-07: ordering links point
  to partyondelivery.com/order (was the boat-parties landing page); when the CRM lookup
  tool is live it should prefer the group's own {{dashboard_url}}.
- PREMIER25 is retired (verified 2026-07-07): guests get per-customer credit codes by
  text/email — the bot never quotes any code; missing-code asks escalate for a re-send.
