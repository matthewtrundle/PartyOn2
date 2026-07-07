---
id: cruise-guest-update
tier: T2
freq_rank: 19
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: null
confidence_instruction: >
  High confidence when a customer is adding/removing guests or updating names for a
  booked cruise. Ack + log + waiver reminder; a human syncs the manifest.
match_examples:
  - "I added one more friend yesterday to the cruise, heads up — Panveer Chahal"
  - "One of our group can't make it anymore"
  - "Can we add two more people to Saturday?"
---

## Answer (canonical)

Thank them, confirm it's logged (flag for manifest sync), and remind that every guest
must e-sign the waiver before arrival: premieratx.co/private-waiver. Headcount changes
that affect the BOOKING price are Premier's; drink orders can always be topped up.

## SMS

Got it {{first_name}}, thanks for the heads up — noted! Just make sure they sign the waiver before arrival: premieratx.co/private-waiver. Want to add drinks for the extra headcount? Reply here and we'll top up your order.

## Email

Hi {{first_name}},

Thanks for the heads up — I've noted the change for your group. Two quick things:

1. Every guest needs to e-sign the waiver before arrival: premieratx.co/private-waiver
2. If the headcount change affects your booking itself, Premier (your booking
   confirmation) handles that side — drinks with us can be topped up any time.

Party On Delivery

## Chat

Thanks for the heads up! Make sure the new guest signs the waiver before arrival
(premieratx.co/private-waiver). Booking-level changes go through Premier; if you want
more drinks for the bigger group, we've got you — text (737) 371-9700.

## Voice

Take the guest name(s), remind about the waiver, promise the manifest gets updated.

## Notes for Allan

- Flagged T2 so the boat-manifest cross-reference stays accurate (the matcher already
  misses ~99 boatish orders — see vault Premier follow-ups item).
