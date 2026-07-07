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
  If the boat is leaving imminently or the customer is stuck at the gate RIGHT NOW,
  treat as urgent — answer AND flag immediately.
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
is smart for big groups. Gate codes rotate per event — never quote one from memory;
Premier typically texts the code to the group's booking contact, so point them there,
and flag the conversation so a human can send the current code if they're stuck.
Boat-specific details are Premier's call.

## SMS

Hey {{first_name}}! Marina: Anderson Mill Marina, 13993 FM 2769, Leander TX 78641 (NOT Cypress Creek). Arrive 30 min before departure — allow for traffic. Parking is free on site. Gate code: Premier texts your booking contact — stuck at the gate? Reply here and a human will jump in ASAP.

## Email

Hi {{first_name}},

The marina is Anderson Mill Marina — 13993 FM 2769, Leander, TX 78641 (not Cypress
Creek; GPS sometimes tries). Plan to arrive 30 minutes before your scheduled departure —
allow for traffic and other delays. There's a free parking lot on site; for big groups,
carpooling or a Fetii group ride makes life easier.

The gate code changes per event — Premier typically texts it to your group's booking
contact. If you can't find it or it isn't working, reply here or text (737) 371-9700
and someone will get you in.

Party On Delivery

## Chat

Anderson Mill Marina — 13993 FM 2769, Leander, TX 78641 (not Cypress Creek!). Arrive
30 minutes before your departure time — allow for traffic. Parking is free on site.
Gate codes change per event — Premier texts them to your booking contact — and if you're
at the gate right now and stuck, text (737) 371-9700 and a human will get you in fast.
(Lead with this marina default — it's where nearly every cruise departs; only ask a
clarifying question if they say it's a different boat.)

## Voice

Give the address slowly, offer to text it. Arrival: 30 minutes before departure. Gate
code: don't have it — offer to take their number and have someone text the current code.

## Notes for Allan

- The bot never states a gate code (they rotate — corpus shows 7561#, 1007#). It always
  routes stuck-at-the-gate to a human, flagged urgent.
- Arrival window verified 2026-07-07 (operator round): 30 minutes before departure
  (supersedes the old "arrive 15 minutes earlier" event-blast line). Parking verified
  the same round: free on-site lot.
