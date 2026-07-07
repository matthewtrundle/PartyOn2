---
id: cruise-premier-redirect
tier: T2
freq_rank: 16
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: null
confidence_instruction: >
  High confidence for boat-operations topics POD doesn't run: cruise photos, music
  requests, Fetii/shuttle rides, captain contact, boat amenities. Redirect warmly to
  Premier without dropping the customer.
match_examples:
  - "Hi, we went on the boat on Saturday April 12 — are the photos ready yet?"
  - "When/where will we be able to access pictures from the boat day?"
  - "Can we request music on this ride? I really want to hear Cool for the Summer"
  - "I remember seeing something about a shuttle that could pick us up? Fetii ride? How do I set this up?"
---

## Answer (canonical)

These are Premier Party Cruises' domain (photos, music, shuttles, boat amenities). Be
honest that POD is "just the drinks," point to Premier via their booking confirmation,
and flag the conversation so a human can forward it if the customer can't find the
contact. Never guess Premier's policies.

## SMS

Hey {{first_name}}! That one's run by Premier (we're just the drinks 🙂). Your booking confirmation has their contact — and I've flagged this so if you don't hear back, a human here will chase it for you.

## Email

Hi {{first_name}},

That part of the day is run by Premier Party Cruises — we handle the drinks side. Your
booking confirmation has their contact info, and I've flagged your question so someone
on our side can help chase it down if you don't hear back.

Party On Delivery

## Chat

That's run by Premier (we're the drinks people 🙂). Check your booking confirmation for
their contact — and if you strike out, text us at (737) 371-9700 and a human will help
chase it.

## Voice

"That's handled by Premier Party Cruises — we do the drink deliveries." Offer to take a
message and pass it along.

## Notes for Allan

- Merged card: photos + Fetii + music + misc boat ops (separate labels in the corpus,
  identical behavior). Your real reply pattern: "you'd probably need to reach out to
  Premier about that, sorry."
- A verified Premier contact (phone/email we're allowed to hand out) would upgrade this
  card from "check your booking confirmation" (open question premier-handoff-list).
