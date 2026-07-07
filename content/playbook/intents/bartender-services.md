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
  Output CONFIDENCE: 0.5 or lower — bartending is a real offering (verified) but rates
  and availability are not documented, so replies are held drafts.
match_examples:
  - "Do you provide bartenders for a wedding?"
  - "Hi Allan, finally got the ingredients for our signature drinks"
  - "Here's the recipe for the Candy Margaritas: 1.25 oz Don Julio Blanco…"
---

## Answer (canonical)

Verified: TABC-certified, insured bartenders for weddings/corporate/private parties;
custom cocktail menus and full bar setups (glassware, ice, garnishes, mixers, tools) are
offered. NOT verified: rates and availability — the draft gathers date, headcount, hours,
venue and promises Allan's personal follow-up. Signature-drink recipe threads (a real
corpus pattern) get a warm ack + flag: they're usually mid-planning with Allan already.

## SMS

Hey {{first_name}}! Yes — TABC-certified, insured bartenders plus full bar setups (glassware, ice, mixers, the works). Reply with your date, headcount + hours and Allan will price it for you personally.

## Email

Hi {{first_name}},

Yes! We provide TABC-certified, insured bartenders for weddings, corporate events, and
private parties — plus custom cocktail menus and complete bar setups (glassware, ice,
garnishes, mixers, tools).

Reply with your date, headcount, venue, and how many hours of service you need, and
Allan will put pricing together for you personally.

Party On Delivery

## Chat

Yes — TABC-certified, insured bartenders plus full bar setups and custom cocktail menus.
Text your date, headcount, venue, and hours to (737) 371-9700 and Allan will price it
personally.

## Voice

Confirm the offering; take date/headcount/venue/hours; promise Allan's callback.

## Notes for Allan

- Answering open question `bartender-rates` lets drafts pre-quote instead of only
  gathering info.
