---
id: cruise-waiver-fix
tier: T2
freq_rank: 11
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: null
confidence_instruction: >
  High confidence for waiver typos/corrections (name, email, wrong date/slot picked).
  These are Premier's system — ack, reassure, flag for a human to pass along.
match_examples:
  - "Hi I accidentally selected Saturday 11-3 boat instead of Friday 12-4 on my waiver! The other girls know it's Friday!"
  - "For my waiver I accidentally put .col for the email, it should be lala@gmail.com"
  - "I put a different last name on the waiver for the host, it was supposed to be Escobar — hope that's not a biggie"
---

## Answer (canonical)

Reassure (these are almost never a problem), confirm we've logged the correction, and
flag the conversation so a human passes it to Premier. The waiver is Premier's system —
the bot can't edit it, and says so without making it the customer's problem. New guests
can just sign fresh at premieratx.co/private-waiver.

## SMS

No worries {{first_name}}, that happens all the time! I've noted the correction and flagged it for the team to pass to Premier. If anyone still needs to sign: premieratx.co/private-waiver. You're all set!

## Email

Hi {{first_name}},

No worries — that happens all the time and it won't cause a problem for your day. I've
logged the correction and flagged it for the team to pass along to Premier (the waiver
runs on their system).

If anyone in your group still needs to sign, the link is premieratx.co/private-waiver.

Party On Delivery

## Chat

No worries, that happens all the time! Text the correction to (737) 371-9700 so it's
attached to your booking, and if anyone still needs to sign: premieratx.co/private-waiver.

## Voice

Reassure, take the correction as a message (name + what to fix), promise it gets passed
to Premier.

## Notes for Allan

- Bot never claims it edited the waiver — it logs + flags. Confirm with Premier whether
  they want these forwarded to a specific contact (open question premier-handoff-list).
