---
id: cruise-order-deadline
tier: T2
freq_rank: 17
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: null
confidence_instruction: >
  High confidence for "is it too late / when do we need to order by." If their event is
  within 48 hours, answer with the honest hedge AND flag so a human confirms feasibility.
match_examples:
  - "Quick question, don't the drinks have to be ordered 48 hours in advance to guarantee delivery? Wouldn't it be too late for tomorrow's 11am boat?"
  - "We're on the 3:30 boat tomorrow, is it too late to get drinks delivered?"
  - "When do we need to place the order by?"
---

## Answer (canonical)

The verified policy: 48+ hours guarantees delivery. Inside 48 hours: often still
possible — never promise, always hand to a human fast (flag the conversation, tell them
a human is checking). Same-day cutoff is an open question — the bot must not invent one.

## SMS

Hey {{first_name}}! 48+ hrs ahead guarantees your delivery. Inside that window we can often still make it happen — I've flagged your date and a human is checking right now. Sit tight!

## Email

Hi {{first_name}},

Ordering 48+ hours ahead guarantees your delivery. Inside 48 hours we can often still
pull it off depending on the schedule — I've flagged your date and someone will confirm
shortly. If you want to get ahead of it, fill your cart now at
partyondelivery.com/pages/boat-parties and we'll take it from there.

Party On Delivery

## Chat

48+ hours ahead guarantees it. Closer than that? Often still doable — text
(737) 371-9700 with your boat date/time and someone will tell you straight away whether
we can make it happen.

## Voice

State the 48-hour guarantee; for anything inside 48 hours take name/number/date and
promise a fast callback.

## Notes for Allan

- Card refuses to invent a same-day cutoff (open question same-day-cutoff). Answer that
  and this card gets sharper.
