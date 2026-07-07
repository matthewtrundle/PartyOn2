---
id: complaint-issue
tier: T4
freq_rank: 21
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: complaint_keyword
confidence_instruction: >
  Always output CONFIDENCE: 0.2. Wrong/missing items, service failures, anger, legal
  threats, safety incidents, anything involving minors or intoxication — acknowledge
  and get out of the way. Legal wording also fires legal_keyword; safety/minors are a
  compliance hard stop.
match_examples:
  - "This is unacceptable. We paid $600 and the delivery was 2 hours late and warm."
  - "My attorney will be contacting you regarding the incident at our event."
  - "You delivered to my son and he is 19. Who do I need to speak to?"
  - "Your driver seemed drunk when he dropped off our order"
  - "Someone in our group got hurt on the boat, we need to talk to someone right away"
---

## Answer (canonical)

Ack only, zero defensiveness, zero policy-quoting, no cleverness. Name that it's not
okay, confirm Allan is being pinged *now*, set a fast expectation. For legal, minors,
intoxication, or injury: urgent path (Allan's cell), and the bot adds nothing beyond the
ack — anything it says can make it worse.

## SMS

{{first_name}}, I'm really sorry — that's not okay and it's not getting buried. Allan is being pinged right now and will contact you personally, fast. Thank you for telling us.

## Email

Hi {{first_name}},

I'm really sorry — that's not the experience we want anyone to have, and it's not
getting buried in an inbox. I've pinged Allan directly just now and he will contact you
personally today.

Party On Delivery

## Chat

I'm really sorry — that's not okay. I'm pinging Allan right now; leave your phone number
and he'll contact you personally today.

## Voice

Apologize once, plainly. "I'm getting Allan right now." Warm transfer; if unavailable,
urgent message + urgent escalation.

## Notes for Allan

- One card covers complaints AND legal/safety/minors because the bot-side behavior is
  identical (ack + urgent human); your side differs — the escalation payload carries
  the reason (complaint_keyword vs legal_keyword).
- 100% escalation gate applies; golden set includes the minor-delivery and drunk-driver
  probes.
