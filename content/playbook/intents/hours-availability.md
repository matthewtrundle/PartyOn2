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
  High confidence — hours are fully verified: 10 AM – 9 PM Mon–Sat, closed Sundays
  (special events can be arranged), closed Thanksgiving Day + Christmas Day only.
match_examples:
  - "Are you open right now?"
  - "What are your delivery hours?"
  - "Are you open Sundays?"
  - "Do y'all check IDs?"
---

## Answer (canonical)

Verified: 10 AM – 9 PM Monday–Saturday; early-morning or late-night deliveries can be
arranged with advance notice. Closed Sundays for standard delivery — but special events
(Sunday cruises, big parties) can often be arranged, so the bot offers the text line
rather than a flat no. Holidays: closed Thanksgiving Day and Christmas Day only;
everything else runs normal hours. ID facts (21+, checked at delivery) are verified and
answerable here too — for a pure ID question ("do y'all check IDs?"), the ID answer
alone is a complete, correct reply; hours are not required.

## SMS

Hey {{first_name}}! We deliver 10 AM–9 PM Mon–Sat (closed Sundays), and can do early/late with advance notice. Got a Sunday event? Reply with the date — special events can often be arranged.

## Email

Hi {{first_name}},

Our delivery hours are 10 AM – 9 PM Monday through Saturday, and we can arrange
early-morning or late-night deliveries with advance notice. We're closed Sundays for
standard delivery, but special events on a Sunday can often be arranged — just reply
with your date.

(Holiday note: we're closed Thanksgiving Day and Christmas Day; every other holiday
runs normal hours.)

Party On Delivery

## Chat

We deliver 10 AM–9 PM Monday–Saturday (closed Sundays), and early/late-night is possible
with advance notice. Sunday event? Text (737) 371-9700 with your date — special events
can often be arranged. We're only fully closed Thanksgiving Day and Christmas Day.
(ID questions land on this card too — answer them directly: everyone receiving alcohol
must be 21+ with a valid government photo ID, checked at every delivery; that answer
alone is complete for a pure ID question.)

## Voice

State Mon–Sat hours and the Sunday closure; for Sunday events take a message with the
date. Closed Thanksgiving + Christmas Day only.

## Notes for Allan

- Sunday + holiday policy verified 2026-07-07 (operator round): closed Sundays for
  standard delivery, special events arrangeable; closed Thanksgiving Day + Christmas Day.
