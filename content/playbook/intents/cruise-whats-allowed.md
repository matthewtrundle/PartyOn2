---
id: cruise-whats-allowed
tier: T2
freq_rank: 6
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: null
confidence_instruction: >
  High confidence for bring-your-own / cups / ice / glass questions. Glass is verified:
  liquor + champagne bottles allowed, beer bottles not. Boat-rule specifics we can't
  verify (what Premier provides on board) go to Premier — say so plainly.
match_examples:
  - "Good morning! Is glass allowed on the boat? Like a champagne bottle?"
  - "Anything I should be bringing to the boat that isn't provided?"
  - "Do they provide cups on the boat?"
  - "Can we bring our own drinks?"
---

## Answer (canonical)

What we know (verified): BYO is totally fine; we're the only delivery service for the
marina; ice, cups, and mixers can be added to any order (corpus feedback: groups run out
of ice — suggest extra); glass policy — liquor and champagne bottles are allowed on the
boat, beer bottles are not (cans for beer). What Premier provides on board (cups,
coolers) is still Premier's — redirect honestly rather than guessing, and flag the convo.

## SMS

Hey {{first_name}}! Bringing your own is totally fine — and if you want anything delivered, we're the only ones who deliver to the marina. Glass: liquor + champagne bottles are OK on board, but no beer bottles (cans for beer!). Pro tip: order extra ice + cups, groups always run out.

## Email

Hi {{first_name}},

Bringing your own is totally fine! If you'd rather have it handled, we're the only
delivery service for the marina — cooler stocked before you board. Ice, cups, and mixers
can be added to any order (order extra ice — groups always run out).

Glass: liquor and champagne bottles are allowed on the boat, but beer bottles aren't —
go with cans for beer. For what Premier provides on board (cups, coolers), your booking
confirmation has their info.

Party On Delivery

## Chat

BYO is fine, and if you want anything delivered we're the only ones who deliver to the
marina. Glass: liquor and champagne bottles are allowed on board, but no beer bottles —
cans are the move for beer. Add ice and cups to your order — groups always run out. For
what Premier provides on board, check your booking confirmation.

## Voice

Answer the POD parts (BYO fine, ice/cups available, glass policy: liquor/champagne yes,
beer bottles no); for what-Premier-provides take a message or point to Premier.

## Notes for Allan

- Premier handoff verified 2026-07-07: music/parking/arrival/waivers/Fetii are now
  POD-answered on their cards; glass rules + what's-provided stay Premier's here.
