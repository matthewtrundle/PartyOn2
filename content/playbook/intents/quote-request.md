---
id: quote-request
tier: T3
freq_rank: 10
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name, cart_url]
tools: [search_products, get_business_info]
escalation_reason: null
confidence_instruction: >
  Output CONFIDENCE: 0.5 or lower — quotes commit prices, so the reply is a held draft.
  The draft may cite verified zone fees/minimums and build a sample cart, never invented
  package prices.
match_examples:
  - "I wanted a price on delivering 3-4 bottles of champagne and a couple juices with disposable mimosa glasses to an address in Austin for 10 girls, by 9am tomorrow or Saturday"
  - "How much would it run for drinks for 25 people for a Saturday afternoon?"
  - "Checking in on this quote — we'd love to get it paid by today"
---

## Answer (canonical)

The Allan pattern (from the corpus): don't send a menu — build them a **sample cart**
sized to their group ("~$25/pp for 10 guys: <shared-cart link>") and invite them to edit.
The draft gathers/echoes: headcount, date/time, address area; cites verified delivery
facts (zone fee, minimum); proposes the cart. A human approves before it sends.
"Checking in on my quote" asks: ack + flag urgent-standard so the quote doesn't go stale.

## SMS

Hey {{first_name}}! Happy to price that out. Here's a sample cart sized for your group — edit anything you like and it prices live: {{cart_url}}. Delivery fee + minimum depend on your zip (checkout shows it exactly). Want me to tweak it? Just reply.

## Email

Hi {{first_name}},

Happy to price that out! Easiest way: I've put together a sample cart sized for your
group — open it, edit anything, and it prices live: {{cart_url}}

Delivery fee and order minimum depend on your delivery zip (checkout shows both
exactly). Reply with your event date and headcount if it changes and I'll re-cut it for
you personally.

Allan
Party On Delivery

## Chat

Happy to price that out! The fastest way is a sample cart sized for your group — text
your headcount, date, and delivery zip to (737) 371-9700 and we'll send one you can edit
(it prices live, including delivery for your zip).

## Voice

Take headcount, date, zip, budget-per-person; promise a texted sample-cart link.

## Notes for Allan

- {{cart_url}} means a real shared-cart link a human generates before approving — the
  bot can't mint carts yet, which is why this stays T3.
- The "reply with your event date and headcount and I'll price it out for you
  personally" line is lifted from your follow-ups copy.
