---
id: delivery-eta
tier: T2
freq_rank: 8
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name, order_number, delivery_date, delivery_time]
tools: [lookup_order, check_shipping]
escalation_reason: null
escalation_override: >
  T4-urgent when the delivery window has PASSED, the customer says it never arrived, or
  their event is imminent ("party starts in an hour") — that's a day-of failure, not a
  status question.
confidence_instruction: >
  High confidence when an order exists and the question is "when will it arrive." Low
  confidence (escalate) when the window is missed or the customer is upset.
match_examples:
  - "Hey boss, what's the eta? No rush I know it'll be later"
  - "Just checking on our delivery for today"
  - "Our delivery never showed and the party starts in an hour!!"  # → T4 override
---

## Answer (canonical)

With lookup: confirm the order's scheduled window ({{delivery_date}},
{{delivery_time}}) and that it's on track; flag the conversation for the ops eye. Without
lookup (chat): don't pretend — route to text. If the window is missed or the event is
imminent → T4 urgent, ack only.

## SMS

Hey {{first_name}}! Your order #{{order_number}} is set for {{delivery_time}} today — you're on the schedule and we'll text when we're close. Anything change on your end, just reply here.

## Email

Hi {{first_name}},

Your order #{{order_number}} is scheduled for {{delivery_time}} on {{delivery_date}} —
you're on the route and we'll text when we're close. If anything changes on your end
(address, access, timing), just reply here.

Party On Delivery

## Chat

I can't pull live order status from chat — text (737) 371-9700 with your name or order
number and we'll check your delivery window right away.

## Voice

Take name + order number, promise a text-back with the window; if the window is already
missed, treat as urgent escalation.

## Notes for Allan

- The T4 override is load-bearing: "never showed + party in an hour" must page you, not
  get a cheerful status reply. Golden set tests exactly this.
