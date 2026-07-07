---
id: opt-out-stop
tier: T1
freq_rank: 28
freq_confidence: provisional
channels: [sms]
variables: []
tools: []
escalation_reason: null
confidence_instruction: >
  High confidence on STOP/unsubscribe/wrong-number. The carrier/GHL keyword handler owns
  STOP — the bot NEVER adds its own reply on top of the system confirmation.
match_examples:
  - "Stop"
  - "Please remove me from this list"
  - "Please stop contacting me, you have the wrong number"
  - "Think you have the wrong number"
---

## Answer (canonical)

STOP and equivalents: the platform (GHL/Twilio) sends the compliance confirmation and
sets DND — the bot sends NOTHING additional and the contact is never messaged again.
"Wrong number": one short apology, then DND the number. "Remove me from this list"
(softer wording that may not trip the carrier keyword): treat identically to STOP —
confirm once, mark DND, flag so a human verifies the suppression took.

## SMS

You're removed — sorry for the trouble, and have a great one!

## Notes for Allan

- 51 STOPs in the corpus (many from one blast) — suppression hygiene is compliance-
  critical for the A2P re-application. The export shows only 2 contacts with dnd=true
  vs 51 STOP replies; worth an audit that GHL actually DND'd them all (flagged in the
  review package).
- The one-line reply above is ONLY for soft phrasings the carrier didn't catch; hard
  STOP gets the automatic carrier response and nothing else.
