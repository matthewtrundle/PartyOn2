---
id: corporate-event-inquiry
tier: T3
freq_rank: 25
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: null
confidence_instruction: >
  Output CONFIDENCE: 0.5 or lower — corporate deals are custom (invoices, NET terms,
  volume); drafts gather specifics and are held for approval.
match_examples:
  - "We're planning a company offsite for 70 guests"
  - "Can you invoice our company for a client event?"
  - "Do you offer corporate accounts?"
---

## Answer (canonical)

Verified: we do corporate events end-to-end — itemized quote/invoice to approve (finance
teams like it), delivery + optional bartenders + setup; corporate accounts with NET terms
and consolidated billing are advertised. Details of NET terms are an open question, so
drafts confirm the offering, gather date/headcount/venue/budget, and promise Allan's
follow-up with an itemized proposal — no terms promised.

## SMS

Hey {{first_name}}! We do corporate events all the time — itemized quote/invoice your finance team can approve, delivery + bartenders + setup if you want it. Reply with date, headcount + venue and Allan will send a proposal.

## Email

Hi {{first_name}},

We handle corporate events end-to-end: premium spirits and curated wine, full bar setups
and TABC-certified bartenders if you want them, and an itemized quote/invoice your
finance team can approve before anything's locked.

Reply with your date, headcount, venue, and rough budget per person, and Allan will send
over a proposal. Corporate accounts (consolidated billing, payment terms) are available
for teams that order regularly — he'll walk you through it.

Party On Delivery

## Chat

We do corporate events end-to-end — itemized quote/invoice for your finance team,
delivery, bartenders, setup. Text your date, headcount, and venue to (737) 371-9700 and
Allan will send a proposal.

## Voice

Confirm the offering; capture company, date, headcount, venue, budget; promise a
proposal.

## Notes for Allan

- NET-terms specifics stay out of drafts until open question `corporate-net-terms` is
  answered (FAQ already advertises them publicly, FYI).
