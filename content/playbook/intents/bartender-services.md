---
id: bartender-services
tier: T3
freq_rank: 24
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: null
confidence_instruction: >
  Output CONFIDENCE: 0.5 or lower — bartending is a real offering and the $600 package
  floor is verified, but every actual quote is custom, so replies are held drafts.
match_examples:
  - "Do you provide bartenders for a wedding?"
  - "Hi Allan, finally got the ingredients for our signature drinks"
  - "Here's the recipe for the Candy Margaritas: 1.25 oz Don Julio Blanco…"
---

## Answer (canonical)

Verified: TABC-certified, insured bartenders for weddings/corporate/private parties;
custom cocktail menus and full bar setups (glassware, ice, garnishes, mixers, tools) are
offered; bartending packages start at $600 (event minimum). The exact quote is always
Allan's — the draft states the floor, gathers date, headcount, hours, venue, and
promises Allan's personal follow-up. Signature-drink recipe threads (a real corpus
pattern) get a warm ack + flag: they're usually mid-planning with Allan already.

## SMS

Hey {{first_name}}! Yes — TABC-certified, insured bartenders plus full bar setups (glassware, ice, mixers, the works). Packages start at $600. Reply with your date, headcount + hours and Allan will price it for you personally.

## Email

Hi {{first_name}},

Yes! We provide TABC-certified, insured bartenders for weddings, corporate events, and
private parties — plus custom cocktail menus and complete bar setups (glassware, ice,
garnishes, mixers, tools). Packages start at $600, and the exact quote depends on your
event.

Reply with your date, headcount, venue, and how many hours of service you need, and
Allan will put pricing together for you personally.

Party On Delivery

## Board Email

<!-- First-person variant for the /admin/leads reply composer (a human sends this
     personally). The ## Email above stays third-person for the CRM auto-drafter. -->

Hi {{first_name}},

Yes! We provide TABC-certified, insured bartenders for weddings, corporate events, and
private parties — plus custom cocktail menus and complete bar setups (glassware, ice,
garnishes, mixers, tools). Packages start at $600, and the exact quote depends on your
event.

Reply with your date, headcount, venue, and how many hours of service you need, and I'll
put pricing together for you personally.

## Chat

Yes — TABC-certified, insured bartenders plus full bar setups and custom cocktail menus.
Packages start at $600 (exact quote depends on the event). Text your date, headcount,
venue, and hours to (737) 371-9700 and Allan will price it personally.

## Voice

Confirm the offering and the $600 starting point; take date/headcount/venue/hours;
promise Allan's callback.

## Notes for Allan

- Rates verified 2026-07-07: packages start at $600 (event minimum) — drafts now
  pre-qualify with the floor instead of only gathering info. Stays T3: real quotes are
  still yours.
