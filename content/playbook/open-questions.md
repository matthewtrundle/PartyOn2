# Open questions — operator answers needed

Each answer upgrades a fact in `facts.yaml` from `unknown`/`conflicting` to `verified`
and unlocks better auto-replies on the intent cards listed. Until answered, those cards
either hedge ("Allan will confirm") or escalate. Answer inline, check the box, and
re-run the ingest — nothing here blocks the rest of the playbook.

## Policy decisions (customers are actively asking these)

- [ ] **sunday-hours** — Are we closed Sundays, or open different hours? Site copy says
  "10AM - 9PM (except Sundays)" which reads both ways.
  → unlocks `hours-availability` for Sunday asks.

- [ ] **same-day-cutoff** — What's the latest a same-day order can come in and still be
  delivered (e.g. "order by 6 PM for same-day")? Corpus shows real same-day requests.
  → upgrades `hours-availability`, `cruise-order-deadline`, `quote-request`.

- [ ] **shipping-policy** — A customer said they "left a tip to be able to ship to Kansas
  City" and another saw a note saying "text us if outside Austin." Do we ever ship, or is
  the answer always "local delivery only"? (TABC local-delivery license likely means no.)
  → unlocks `shipping-outside-austin` as a clean T1 "no, but here's what we can do."

- [ ] **outlying-cities** — Checkout accepts Round Rock / Pflugerville / Leander /
  Dripping Springs zips, but the marketing footprint excludes them. If someone from
  Round Rock asks "do you deliver here?", what's the answer?
  → unlocks `delivery-zones-minimums` for those zips.

- [ ] **reschedule-vs-cancellation** — Bachelor page promises free reschedule up to
  **6 hours** before delivery; terms say cancellations within **48 hours** may incur a
  fee. Which is the policy (reschedule ≠ cancel? different windows?)?
  → unlocks `order-cancellation` ack copy + a landing-copy fix.

- [ ] **cancellation-fee** — What is the within-48-hours cancellation fee (flat, %, or
  case-by-case)?
  → upgrades `order-cancellation`.

- [ ] **refund-sop** — When a refund is approved, what do we tell customers about method
  and timeline? (One real email said "2 weeks for full refund.") Who besides you can
  approve one?
  → upgrades the `refund-credit-request` ack ("here's what happens next").

- [ ] **lake-travis-minimum** — Bachelor page says Lake Travis/far-out ranches "start at
  $250" minimum; rates.ts has Lakeway at $125. Which is right?
  → unlocks `delivery-zones-minimums` for lake zips + a landing-copy fix.

- [ ] **holiday-blackouts** — Any dates we don't deliver (Thanksgiving, Christmas, New
  Year's Day...)? Any dates with special hours?
  → upgrades `hours-availability`.

## Pricing & services

- [ ] **bartender-rates** — Ballpark bartender pricing (hourly? per-event minimum?) so
  the bot can pre-qualify instead of only escalating.
  → upgrades `bartender-services` from pure T3 to informed T3.

- [ ] **corporate-net-terms** — FAQ advertises corporate accounts with NET terms. How
  does a company actually get one (who approves, NET-15/30, minimum volume)?
  → upgrades `corporate-event-inquiry`.

- [ ] **tip-presets** — Checkout tip presets (e.g. 10/15/20%)? Referenced by vault
  Open-Questions; affects `gratuity` answers only marginally.

- [ ] **card-fee-policy** — Do we ever pass a card-processing fee to customers?
  → upgrades `payment-methods` answers.

- [ ] **thc-kratom** — Customers ask for THC seltzers / kratom drinks. Do we carry or
  plan to carry them? If never, the bot should say so cleanly.
  → unlocks `product-availability` for these asks.

## Premier cruise partnership

- [ ] **premier25-validity** — Is PREMIER25 (free delivery for Premier cruise groups)
  still the active code? The drip copy advertises it.
  → needed before any card quotes it. Related: per-customer credit codes
  (memory: premiere_cruise_pod_credits) are invoiced to Premier only when redeemed.

- [ ] **premier-handoff-list** — Confirm the exact list of topics we always redirect to
  Premier (boarding time, gate codes, parking, waivers, photos, music, Fetii, weather
  calls) and the right Premier contact/number to hand customers.
  → tightens all `cruise-*` redirect cards.

## Compliance blockers (from the compliance doc, not customer-facing copy)

- [ ] **tabc-license-number** — TABC permit number + licensed entity name (for
  compliance.md and any footer disclosure requirements).

- [ ] **can-spam-postal-address** — Full business mailing address for email footers
  (`src/lib/followups/copy.ts:21` still says "Austin, TX — TODO: full mailing address").
  Blocks flipping any automated email sending.

## Data-access unblocks (2-minute operator tasks)

- [ ] **ghl-message-scope** — Add the *conversations/message read* scope to the GHL
  private integration (Settings → Private Integrations → edit → scopes). Verified still
  401 on 2026-07-06. Then re-run
  `node scripts/playbook/export-ghl-conversations.mjs` to upgrade the corpus from
  last-messages to full threads (better frequency ranks + Allan-reply golden pairs).

- [ ] **gmail-mcp-access** — No Gmail MCP is connected in Claude Code (only ghl +
  postgres). Either connect one (`claude mcp add` in an interactive session) or run the
  Gmail mining pass (`in:sent` voice corpus + "New SMS:" inbound mirrors) from a Cowork
  session that has the Google connector.
