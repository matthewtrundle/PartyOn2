---
id: cruise-day-logistics
tier: T2
freq_rank: 2
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: null
confidence_instruction: >
  High confidence for marina address / arrival-time / parking / gate-code questions.
  The marina gate code is 7561# — give it directly when someone asks or says they're at
  the gate. If the boat is leaving imminently or they're stuck at the gate RIGHT NOW,
  give the code AND flag urgent so a human can help in real time.
match_examples:
  - "Hi what's the address for the boat and what time do we need to be there if we booked the 330pm boat"
  - "I'm at Anderson Mill marina, not sure where to park my car"
  - "We're trying to enter thru the gate but the gate code isn't working"
  - "Hello sorry I was reading about a gate code and cannot seem to find it"
---

## Answer (canonical)

Give the verified marina address: Anderson Mill Marina, 13993 FM 2769, Leander, TX 78641
— NOT Cypress Creek. Arrive 30 minutes before your scheduled departure (allow for
traffic and other delays). Parking: free lot on site — carpooling or a Fetii group ride
is smart for big groups. Gate code is 7561# — give it directly when someone asks or says
they're at the gate. If they're stuck at the gate right now, give the code AND flag the
conversation urgent so a human can jump in if it still doesn't work. Boat-specific details
are Premier's call.

## SMS

Hey {{first_name}}! Marina: Anderson Mill Marina, 13993 FM 2769, Leander TX 78641 (NOT Cypress Creek). Arrive 30 min before departure — allow for traffic. Parking is free on site. Gate code is 7561#. Stuck at the gate? Reply here and a human will jump in ASAP.

## Email

Hi {{first_name}},

The marina is Anderson Mill Marina — 13993 FM 2769, Leander, TX 78641 (not Cypress
Creek; GPS sometimes tries). Plan to arrive 30 minutes before your scheduled departure —
allow for traffic and other delays. There's a free parking lot on site; for big groups,
carpooling or a Fetii group ride makes life easier.

The gate code is 7561#. If you get there and it isn't working, reply here or text
(737) 371-9700 and someone will get you in.

Party On Delivery

## Chat

Anderson Mill Marina — 13993 FM 2769, Leander, TX 78641 (not Cypress Creek!). Arrive
30 minutes before your departure time — allow for traffic. Parking is free on site.
The gate code is 7561#. If you're at the gate and it's not working, text (737) 371-9700
and a human will get you in fast. (Lead with this marina default — it's where nearly
every cruise departs; only ask a clarifying question if they say it's a different boat.)

## Voice

Give the address slowly, offer to text it. Arrival: 30 minutes before departure. Gate
code is 7561# — give it if asked; if they're stuck at the gate, take their number so a
human can help in real time.

## Notes for Allan

- Gate code CHANGED 2026-07-07 (operator): the bot now gives 7561# directly on a
  gate-code ask or "we're at the gate." Previously it withheld the code because they
  rotated (corpus showed 7561# and 1007#) — if the code ever changes, update it HERE and
  in the marina-gate-code-delivery fact, then rebuild. Still routes stuck-at-the-gate to
  a human as a backstop, flagged urgent. Note: this makes 7561# answerable to anyone who
  asks Wayne on the public site, not just booked guests.
- Arrival window verified 2026-07-07 (operator round): 30 minutes before departure
  (supersedes the old "arrive 15 minutes earlier" event-blast line). Parking verified
  the same round: free on-site lot.
