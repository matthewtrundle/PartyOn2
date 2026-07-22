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
  High confidence. Two lanes: (1) POD ANSWERS directly — music (DJ on disco cruises,
  Bluetooth speakers on private cruises) and group transport (Fetii, code PARTYON for
  25% off, schedulable only within 48 hours of pickup). (2) REDIRECT to Premier —
  boat photos, which-boat/fleet questions, captain contact, boat amenity specifics.
  Redirect warmly without dropping the customer.
match_examples:
  - "Hi, we went on the boat on Saturday April 12 — are the photos ready yet?"
  - "When/where will we be able to access pictures from the boat day?"
  - "Can we request music on this ride? I really want to hear Cool for the Summer"
  - "I remember seeing something about a shuttle that could pick us up? Fetii ride? How do I set this up?"
---

## Answer (canonical)

Split by topic (verified 2026-07-07, operator round). POD answers directly:
**music** — disco cruises come with a DJ (song requests go to the DJ on board); private
cruises have Bluetooth speakers, bring your playlist. **Getting there** — we recommend
Fetii group rideshare, code PARTYON gets 25% off; Fetii rides can only be scheduled
starting 48 hours before pickup; free parking on site too. Still Premier's domain:
boat photos, which-boat/fleet questions, captain contact, amenity specifics — be honest
that POD is "just the drinks," and point them to Premier directly: text Premier at
512-488-5892 for photos, which-boat/fleet, and boat amenities. Never guess Premier's
policies.

## SMS

Hey {{first_name}}! Music: disco cruises have a DJ, private cruises have Bluetooth — bring your playlist! Rides: we recommend Fetii — code PARTYON = 25% off (schedulable 48 hrs out). Photos/boat questions are Premier's — text them directly at 512-488-5892.

## Email

Hi {{first_name}},

Happy to help with the boat-day details we know:

- Music: disco cruises come with a DJ (make requests on board); private cruises have
  Bluetooth speakers — bring your playlist.
- Getting there: we recommend Fetii group rideshare — code PARTYON gets 25% off. One
  heads-up: Fetii rides can only be scheduled starting 48 hours before pickup. There's
  also a free parking lot at the marina.

Boat photos, which boat you'll be on, and boat-specific amenities are run by Premier
Party Cruises — text them directly at 512-488-5892 and they'll get you sorted.

Party On Delivery

## Chat

Music: disco cruises have a DJ on board; private cruises have Bluetooth speakers (bring
your playlist). Rides: we recommend Fetii — code PARTYON gets 25% off, and rides can be
scheduled starting 48 hours before pickup. Boat photos and which-boat questions are
Premier's — text Premier directly at 512-488-5892 (they run the boat side).

## Voice

Answer music + Fetii directly; for photos/boat specifics say "that's handled by Premier
Party Cruises — we do the drink deliveries" and give Premier's number, 512-488-5892.

## Notes for Allan

- Merged card: photos + Fetii + music + misc boat ops (separate labels in the corpus,
  identical behavior). Music + transport answers verified 2026-07-07 (operator round);
  photos/fleet/amenities stay redirects per the same round.
- The Fetii PARTYON code + 48-hour scheduling rule came from you directly — if the
  Fetii deal changes, update fact `fetii-discount`.
- Photos/boat-ops now route to Premier's number 512-488-5892 (operator, 2026-07-07),
  not the POD line — see fact `premier-phone`.
