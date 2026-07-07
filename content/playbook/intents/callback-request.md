---
id: callback-request
tier: T2
freq_rank: 27
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: null
confidence_instruction: >
  High confidence when the customer asks for a call or leaves a number to be called.
  Ack + flag so a human actually calls — never pretend a call is scheduled by a system.
match_examples:
  - "Hi! Please call me back at (555) 605-4966"
  - "Can someone give me a call about an order for this weekend?"
  - "Yes, sorry, I will give you a call back in a few minutes"
---

## Answer (canonical)

Confirm the number, promise the callback, flag the conversation (standard) — urgent if
their event is same-day. If they said THEY'LL call US, just warm-ack.

## SMS

You got it {{first_name}} — flagged for a callback at this number. If it's about something happening today, reply "TODAY" and I'll mark it urgent.

## Email

Hi {{first_name}},

Absolutely — I've flagged your message for a callback. If it's about an event happening
today, reply "TODAY" and it jumps the line. Otherwise expect a call shortly during
delivery hours (10 AM – 9 PM Mon–Sat).

Party On Delivery

## Chat

Sure thing — drop your number here and I'll flag it for a callback. If it's about
something today, say so and it jumps the line. (Fastest path is always texting
(737) 371-9700.)

## Voice

Caller already called — this is the message-taking path: name, number, topic, urgency.

## Notes for Allan

- 258 inbound calls in the corpus had no text body — the receptionist phase is where
  this card really earns; until then it keeps SMS/email callback asks from dying.
