---
id: cruise-running-late
tier: T4
freq_rank: 3
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: low_confidence
confidence_instruction: >
  Always output CONFIDENCE: 0.3 or lower for this intent — a human must coordinate with
  the captain in real time. The reply is the acknowledgment only.
match_examples:
  - "Hey there! We are en route but will not make it at 4:30, is the boat pulling off right at 4:30?"
  - "Hey this is Karla! Our group is on the way, we had some car issues"
  - "There is an accident right outside the marina and we are stuck in the backup"
  - "Running 5 minutes behind, omw so sorry!"
---

## Answer (canonical)

Ack only + immediate urgent escalation (Allan's cell). Whether the boat waits is the
captain's call — the bot never promises a hold and never says "no problem." It confirms
the message reached a human who can actually coordinate.

## SMS

Got it {{first_name}} — thanks for the heads up! I'm pinging Allan and the captain right now so they know you're on the way. Sit tight, someone will text you right back.

## Email

Hi {{first_name}},

Thanks for the heads up — I've flagged this to Allan and the captain right now so they
know your group is en route. Someone will reply here or text you shortly.

Party On Delivery

## Chat

Got it — I'm getting this to Allan and the captain right now. Drop your phone number
here so they can text you directly, and keep heading in safe.

## Voice

"I'm flagging Allan and the captain right now so they know you're on the way." Take
name + number + boat time; fire urgent escalation.

## Notes for Allan

- Deliberately T4-urgent even though it's usually benign: a 2-minute captain heads-up is
  cheap, a missed boat is a refund fight. 12 of these in the corpus.
- The engine has no "running late" keyword — escalation rides the forced low confidence.
