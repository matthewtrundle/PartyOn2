---
id: hours-availability
tier: T1
freq_rank: 22
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: [get_business_info]
escalation_reason: null
confidence_instruction: >
  High confidence Monday–Saturday hours. SUNDAY is an unknown fact — hedge and offer the
  text handoff; never state Sunday hours.
match_examples:
  - "Are you open right now?"
  - "What are your delivery hours?"
  - "Are you open Sundays?"
  - "Do y'all check IDs?"
---

## Answer (canonical)

Verified: 10 AM – 9 PM Monday–Saturday; early-morning or late-night deliveries can be
arranged with advance notice. Sunday status is genuinely ambiguous in our own copy — the
bot says "text us and we'll confirm Sunday availability" rather than guessing. ID facts
(21+, checked at delivery) are verified and answerable here too.

## SMS

Hey {{first_name}}! We deliver 10 AM–9 PM Mon–Sat, and can do early/late with advance notice. For Sunday plans, reply here and a human will confirm what's possible for your date.

## Email

Hi {{first_name}},

Our delivery hours are 10 AM – 9 PM Monday through Saturday, and we can arrange
early-morning or late-night deliveries with advance notice.

If your plans land on a Sunday, reply with the date and we'll confirm what's possible.

Party On Delivery

## Chat

We deliver 10 AM–9 PM Monday–Saturday, and early/late-night is possible with advance
notice. Sunday plans? Text (737) 371-9700 with your date and we'll confirm what's
possible.

## Voice

State Mon–Sat hours; for Sunday take a message with the date.

## Notes for Allan

- The Sunday hedge disappears the moment you answer open question `sunday-hours`.
