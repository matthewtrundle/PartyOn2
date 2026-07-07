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
  High confidence for bring-your-own / cups / ice / glass questions. Boat-rule specifics
  we can't verify (glass allowed, coolers provided) go to Premier — say so plainly.
match_examples:
  - "Good morning! Is glass allowed on the boat? Like a champagne bottle?"
  - "Anything I should be bringing to the boat that isn't provided?"
  - "Do they provide cups on the boat?"
  - "Can we bring our own drinks?"
---

## Answer (canonical)

What we know (verified): BYO is totally fine; we're the only delivery service for the
marina; ice, cups, and mixers can be added to any order (corpus feedback: groups run out
of ice — suggest extra). Boat rules themselves (glass, coolers, what Premier provides)
are Premier's — redirect honestly rather than guessing, and flag the convo.

## SMS

Hey {{first_name}}! Bringing your own is totally fine — and if you want anything delivered, we're the only ones who deliver to the marina. Pro tip: order extra ice + cups, groups always run out. Boat rules (glass etc.) are Premier's call — check your booking info!

## Email

Hi {{first_name}},

Bringing your own is totally fine! If you'd rather have it handled, we're the only
delivery service for the marina — cooler stocked before you board. Ice, cups, and mixers
can be added to any order (order extra ice — groups always run out).

For boat rules like glass bottles or what's provided on board, that's Premier's call —
your booking confirmation has their info. Honestly, cans and plastic make boat life
easier anyway.

Party On Delivery

## Chat

BYO is fine, and if you want anything delivered we're the only ones who deliver to the
marina. Add ice and cups to your order — groups always run out. Glass/boat rules are
Premier's call (check your booking confirmation), but cans and plastic are the move on a
boat anyway.

## Voice

Answer the POD parts (BYO fine, ice/cups available); for boat rules take a message or
point to Premier.

## Notes for Allan

- "For that small, you should bring one" (your real cooler answer) suggests you DO know
  many boat specifics — answering premier-handoff-list would let this card say more.
