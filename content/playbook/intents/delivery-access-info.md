---
id: delivery-access-info
tier: T1
freq_rank: 5
freq_confidence: provisional
channels: [sms, email, chat]
variables: [first_name]
tools: [lookup_order]
escalation_reason: null
confidence_instruction: >
  High confidence when the customer is GIVING us information (unit number, gate code,
  parking notes, "we're in the red minivan") rather than asking. Ack + make sure it
  reaches the driver.
match_examples:
  - "Hi there! Just want to let you guys know we are in Unit A when you arrive"
  - "Gate Code: 1007#"
  - "Hey Allan, we are unit number five at In Cahoots. Are you able to get into the unit or do you need someone there?"
  - "We just pulled in, in the red minivan"
---

## Answer (canonical)

Thank them, read the detail back (so they see it registered), confirm it's attached to
the order for the driver. If they asked a question inside the info ("do you need someone
at the unit?"), answer the verified part: someone 21+ with valid ID must receive the
delivery — we can't leave alcohol unattended.

## SMS

Perfect {{first_name}}, got it — noted for your driver! One thing: someone 21+ with a valid ID needs to be there to receive it (we can't leave alcohol unattended). See y'all soon!

## Email

Hi {{first_name}},

Got it — I've attached that to your order so the driver has it. Quick reminder: someone
21+ with a valid ID needs to receive the delivery (we can't leave alcohol unattended),
but it doesn't have to be the person who ordered.

Party On Delivery

## Chat

Perfect — text that to (737) 371-9700 so it's attached to your order for the driver.
Heads up: someone 21+ with valid ID needs to receive the delivery; we can't leave
alcohol unattended.

## Voice

Read the detail back, confirm it's noted for the driver.

## Notes for Allan

- Requires the note to actually land somewhere a driver sees (CRM: order note via
  lookup_order context; interim: the flag). If that plumbing isn't live, this card
  should stay honest — currently worded as "noted" only where the pipeline can do it.
