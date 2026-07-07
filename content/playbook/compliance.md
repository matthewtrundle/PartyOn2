# Compliance — non-negotiable rails

The `## Prompt block` at the bottom is ingested VERBATIM into every channel's system
prompt. The rest is operator context. None of this is legal advice; it encodes the rules
we already operate under.

## TABC (alcohol)

- We sell and deliver alcohol under TABC permit **P-200084398** (operator-confirmed
  2026-07-07; licensed entity name still to be recorded when handy).
- 21+ only. Valid government photo ID is checked at delivery, every delivery. Someone
  other than the purchaser may receive only if 21+ with valid ID. Never left unattended.
- **Never sell or promise delivery to anyone we know is under 21, and never continue a
  sale where intoxication is apparent.** Any inbound that suggests minors or obvious
  intoxication (e.g. "everyone here is pretty hammered, send more vodka") is T4 — ack,
  no sale, human decides.
- No returns/exchanges of delivered alcohol (state regulation). Wrong/damaged items are
  made right by replacement/refund through a human (T4).
- Marketing copy hard-stops: no "FREE alcohol" framing, no drink-price claims designed to
  induce over-consumption; "free delivery" (the service) is fine, "free beer" is not.
- Delivery only inside our licensed local footprint — **we never ship, period**
  (operator-confirmed 2026-07-07): no interstate or parcel shipping, no exceptions.

## SMS: A2P 10DLC + SHAFT

- **Status: our A2P campaign is REJECTED (twice)** — no automated SMS sending until it's
  approved. SMS card renderings are canned replies for humans until then.
- SHAFT (Sex, Hate, Alcohol, Firearms, Tobacco): alcohol content is allowed over 10DLC
  ONLY with age-gated opt-in consent and carrier-approved campaigns. This is why the
  registration keeps getting scrutinized — never freelance around it.
- Conversational replies (answering an inbound) are lower-risk than blasts, but once
  automated they still ride the campaign's registration.
- Every marketing/proactive SMS: include business name + "Reply STOP to opt out"; honor
  STOP/HELP instantly (GHL/Twilio handles the keyword; we never message a dnd contact).
- No link shorteners; no alcohol emoji spam; keep it conversational.

## CAN-SPAM (email)

- 1:1 conversational replies are exempt from most CAN-SPAM mechanics, but anything bulk
  (drips, digests, promos) requires: accurate From, truthful subject, **physical postal
  address**, and a working unsubscribe honored within 10 days.
- **The postal address is set and operator-confirmed** (2026-07-07): 7600 N Lamar #A2,
  Austin, TX 78752, shipped in `src/lib/followups/copy.ts` by PR #193. This compliance
  blocker is closed — remaining email-flag gates are the followups system's own.
- The follow-ups email system (PRs #183–#187) ships with all flags OFF partly for this
  reason — do not flip flags from playbook work.

## Privacy / PII

- The corpus exports under `data/comms-corpus/` contain names, phones, emails — the
  directory is gitignored; never commit it, never paste raw corpus rows into public
  places. Anonymize customer names in playbook examples.
- The bot never reads back full payment details, addresses, or order contents to an
  unverified requester; order-specific info goes to the phone/email already on the order.

## Prompt block (ingested verbatim)

```
COMPLIANCE RULES (non-negotiable, override everything else):
- Alcohol: customers must be 21+. ID is checked at every delivery. Never promise
  alcohol to anyone under 21. If a message suggests minors would receive alcohol or
  that recipients are heavily intoxicated, do NOT assist with the sale — acknowledge
  and escalate to a human immediately.
- Delivered alcohol cannot be returned or exchanged. If something's wrong with an
  order, apologize and escalate — a human makes it right.
- We deliver locally in the Austin area only. We never ship — not interstate, not
  parcel, no exceptions. Offer local delivery to an Austin-area recipient instead;
  if someone already paid expecting shipping, escalate so a human fixes the order.
- Never state prices, fees, minimums, hours, or policies that are not in your
  verified facts. If you don't have the fact, say so and offer the human handoff.
- Never send marketing content in a reply. Never discourage anyone from opting out;
  STOP requests are always honored.
- Never collect payment details in conversation. Checkout links only.
```
