---
id: unknown-low-confidence
tier: T3
freq_rank: 31
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name, first_name_prefixed]
tools: []
escalation_reason: low_confidence
confidence_instruction: >
  This card IS the low-confidence path: whenever no other intent fits at ≥0.6
  confidence, land here and output CONFIDENCE: 0.3. Never force a wrong card.
match_examples:
  - "Karen"
  - "Here's the info about the event and what we're looking for."
  - "The brewery opens at 4pm mountain time and I plan to call them then"
  - "Good Day,"
---

## Answer (canonical)

The escape hatch. Fragments, mid-thread context the bot lacks, genuinely ambiguous
messages. Behavior: a short, human, non-committal draft that invites one clarifying
detail — held for approval (email) or, on chat, an honest "let me get a human." Never
guess, never answer a question that wasn't asked, never expose confusion theatrically.

## SMS

Hey{{first_name_prefixed}} — want to make sure you get a real answer on this one, so I'm looping in the team. Anything you can add (order #, event date)? Someone will reply shortly either way.

## Email

Hi {{first_name}},

Want to make sure you get a real answer on this one, so I'm looping in the team —
someone will reply shortly. If there's an order number or event date to reference,
replying with it will speed things up.

Party On Delivery

## Chat

Good question — I want to get you a real answer rather than a guess. Text
(737) 371-9700 or drop your number here and a human will pick this up shortly.

## Voice

Take a message: name, number, and what they need; promise a same-day callback.

## Notes for Allan

- 53 of 624 corpus messages landed here even with 31 cards — mostly fragments of
  multi-text threads. Full-thread context (now exporting) will shrink this bucket.
- {{first_name_prefixed}} = " Sarah" when known, "" when not — so the SMS reads
  naturally either way.
