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
— NOT Cypress Creek. Arrive ~15 minutes before your boat time. Gate codes rotate per
event — never quote one from memory; point them to their event-day text from Premier, and
flag the conversation so a human can send the current code if they're stuck. Boarding
times and boat-specific details are Premier's call.

## SMS

Hey {{first_name}}! Marina is Anderson Mill Marina, 13993 FM 2769, Leander TX 78641 (NOT Cypress Creek). Plan to arrive ~15 min early. Gate code is in your event-day text from Premier — if you're stuck at the gate, reply here and a human will jump in ASAP.

## Email

Hi {{first_name}},

The marina is Anderson Mill Marina — 13993 FM 2769, Leander, TX 78641 (not Cypress
Creek; GPS sometimes tries). Plan to arrive about 15 minutes before your boat time.

The gate code changes per event and comes in your event-day text from Premier. If you
can't find it or it isn't working, reply here or text (737) 371-9700 and someone will
get you in.

Party On Delivery

## Chat

Anderson Mill Marina — 13993 FM 2769, Leander, TX 78641 (not Cypress Creek!). Arrive
about 15 minutes early. Gate codes change per event, so check your event-day text from
Premier — and if you're at the gate right now and stuck, text (737) 371-9700 and a human
will get you in fast.

## Voice

Give the address slowly, offer to text it. Gate code: don't have it — offer to take
their number and have someone text the current code.

## Notes for Allan

- The bot never states a gate code (they rotate — corpus shows 7561#, 1007#). It always
  routes stuck-at-the-gate to a human, flagged urgent.
- "ARRIVE 15 MINUTES EARLIER" is from your own event blasts; boarding-time specifics stay
  Premier-owned (open question premier-handoff-list).
