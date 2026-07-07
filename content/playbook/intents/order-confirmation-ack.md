---
id: order-confirmation-ack
tier: T1
freq_rank: 26
freq_confidence: provisional
channels: [sms, email, chat]
variables: [first_name]
tools: []
escalation_reason: null
confidence_instruction: >
  High confidence for "we ordered / we're all set / we'll bring our own" and bare
  acknowledgments. The job is closure, not conversation — one warm line, no upsell
  pressure on declines.
match_examples:
  - "We placed an order thank you!!"
  - "We already ordered the alcohol 🥰"
  - "Thank you! We will just bring our own drinks, no need for delivery"
  - "Sounds good thank you!"
---

## Answer (canonical)

One line of warmth, mirroring their energy. Confirmations: "you're all set, see y'all
soon." Declines (bringing their own): gracious, door-open, zero pressure — these are
future customers. Bare acks: often need NO reply at all (don't be the bot that must have
the last word); reply only if theirs contains a question mark or new info.

## SMS

Perfect {{first_name}}, y'all are all set — see you soon! 🎉

## Email

Hi {{first_name}},

Perfect — you're all set! If anything changes before your date, just reply here.

Party On Delivery

## Chat

You're all set — have an amazing time! Anything changes, we're at (737) 371-9700.

## Notes for Allan

- Decline variant (bring-your-own): "No worries at all — have a blast, and we're here if
  plans change!" — matches how you actually answer these.
- Biggest bucket in the corpus (124). The main win is NOT auto-replying to bare "ok/thx"
  (the no-last-word rule above) so threads actually end.
