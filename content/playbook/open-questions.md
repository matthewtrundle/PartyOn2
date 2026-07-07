# Open questions — operator answers needed

Each answer upgrades a fact in `facts.yaml` from `unknown`/`conflicting` to `verified`
and unlocks better auto-replies on the intent cards listed. Until answered, those cards
either hedge ("Allan will confirm") or escalate. Answer inline, check the box, and
re-run the ingest — nothing here blocks the rest of the playbook.

**2026-07-07: ALL 18 ANSWERED** in the operator review round (this session). Every fact
below is now `verified` in facts.yaml and the named cards are updated. Answers recorded
inline for the audit trail.

## Policy decisions (customers are actively asking these)

- [x] **sunday-hours** — ANSWERED 2026-07-07: **Closed Sundays** for standard delivery.
  Special events (Sunday cruises, big parties) can be arranged — bot offers the text
  line. Site "(except Sundays)" copy clarified to "closed Sundays" the same day.
  → `hours-availability` updated.

- [x] **same-day-cutoff** — ANSWERED 2026-07-07: **No hard cutoff — case-by-case by
  design.** Bot never promises same-day and never invents a cutoff; it routes to text
  (737) 371-9700 to confirm before paying.
  → `hours-availability`, `cruise-order-deadline`, `quote-request` updated.

- [x] **shipping-policy** — ANSWERED 2026-07-07: **Never ship — local delivery only**
  (TABC local-delivery license, no exceptions). Card upgraded to clean T1 "no, but we
  can deliver to a local recipient." Residual: find + kill the "text us if outside
  Austin" note wherever it lives; the Kansas City tipper's order was a one-off to fix.
  → `shipping-outside-austin` upgraded T3 → T1.

- [x] **outlying-cities** — ANSWERED 2026-07-07: **Case-by-case — text us.** Bot
  neither confirms nor denies Round Rock / Pflugerville / Leander / Dripping Springs;
  routes to the text line and Allan decides per order. Footprint rule (never advertise
  there) unchanged.
  → `delivery-zones-minimums` updated.

- [x] **reschedule-vs-cancellation** — ANSWERED 2026-07-07: **Both are real — they're
  different things.** Reschedule (move the date/time) = free up to 6 hours before
  delivery. Cancel (money back) = 48-hour policy. No landing-copy fix needed.
  → `order-cancellation` updated (now offers the reschedule alternative).

- [x] **cancellation-fee** — ANSWERED 2026-07-07: **Case-by-case, usually waived.**
  No fixed amount exists; bot says a fee "may apply" and never quotes a number.
  → `order-cancellation` updated.

- [x] **refund-sop** — ANSWERED 2026-07-07: **Original card via Stripe, 5–10 business
  days, only Allan approves.** Bot states the mechanics but never promises approval,
  amount, or eligibility.
  → `refund-credit-request` ack upgraded.

- [x] **lake-travis-minimum** — ANSWERED 2026-07-07: **Both numbers are real and
  different.** Checkout zone minimum (Lakeway $125) applies to address delivery;
  the $250 is a real event-logistics minimum for Lake Travis boat/ranch EVENT
  deliveries. Bachelor-page copy stays.
  → `delivery-zones-minimums` updated.

- [x] **holiday-blackouts** — ANSWERED 2026-07-07: **Closed Thanksgiving Day and
  Christmas Day only.** Every other holiday runs normal hours.
  → `hours-availability` updated.

## Pricing & services

- [x] **bartender-rates** — ANSWERED 2026-07-07: **Packages start at $600 (event
  minimum).** Exact quote stays Allan's — card pre-qualifies with the floor, stays T3.
  → `bartender-services` updated.

- [x] **corporate-net-terms** — ANSWERED 2026-07-07: **NET terms are NOT offered —
  remove every mention.** Invoices are paid before the event (corporate card / ACH /
  wire). FAQ copy + landing-pages directory description fixed the same day.
  → `corporate-event-inquiry` updated.

- [x] **tip-presets** — ANSWERED 2026-07-07: **5% / 10% / 20%** (confirmed from
  DashboardCheckoutModal; operator keeps them).
  → fact `tip-presets` verified.

- [x] **card-fee-policy** — ANSWERED 2026-07-07: **Never — no card or processing fees
  passed to customers.** The price shown is the price (plus tax/delivery/optional tip).
  → fact `card-processing-fee` verified.

- [x] **thc-kratom** — ANSWERED 2026-07-07: **THC seltzers coming soon** (not yet
  orderable — bot says so + captures contact info to notify at launch). **Kratom: no,
  and no plans.** Flip the THC line to a catalog answer once products land.
  → `product-availability` updated.

## Premier cruise partnership

- [x] **premier25-validity** — ANSWERED 2026-07-07: **Retired.** Premier guests now get
  per-customer credit codes by text/email (invoiced to Premier only when redeemed —
  memory: premiere_cruise_pod_credits). Bot never quotes any code; missing-code asks
  escalate for a re-send.
  → fact `premier25-code` verified as retired.

- [x] **premier-handoff-list** — ANSWERED 2026-07-07 topic-by-topic:
  - **POD answers directly now:** arrival time (30 min before departure — supersedes
    the 15-min line), parking (free on-site lot), waivers (everyone signs; Premier
    sends by text/email; premieratx.co/private-waiver), music (disco cruise = DJ;
    private cruise = Bluetooth, bring playlist), transport (Fetii, code PARTYON = 25%
    off, schedulable only within 48 hrs of pickup), weather policy (Premier + captain
    call it, usually rain or shine; drinks move free on a Premier reschedule).
  - **Still redirect to Premier:** boat photos, which-boat/fleet questions, captain
    contact, amenity specifics, gate codes (Premier texts the booking contact).
  → `cruise-day-logistics`, `cruise-premier-redirect`, `cruise-waiver-fix`,
  `cruise-weather-reschedule` updated.

## Compliance blockers (from the compliance doc, not customer-facing copy)

- [x] **tabc-license-number** — ANSWERED 2026-07-07: **TABC permit P-200084398.**
  (Licensed entity name still not captured — record it when handy; nothing
  customer-facing blocks on it.)
  → compliance.md updated.

- [x] **can-spam-postal-address** — RESOLVED 2026-07-07: **7600 N Lamar #A2, Austin,
  TX 78752** — already shipped in `src/lib/followups/copy.ts` by PR #193; operator
  confirmed it's correct this round.
  → fact `business-mailing-address` added.

## Data-access unblocks (2-minute operator tasks)

- [x] **ghl-message-scope** — DONE 2026-07-06 ~21:35 UTC (Allan added "View Conversation
  Messages" to the Claude private integration). Full-thread corpus exported same day:
  15,401 messages across 1,826 dialogue conversations
  (`data/comms-corpus/ghl/messages-*.jsonl`). Re-run
  `node scripts/playbook/export-ghl-conversations.mjs` any time to refresh.

- [x] **gmail-mcp-access** — DONE 2026-07-06 (Gmail MCP connected to the session;
  verified: 201 "New SMS:" mirror threads searchable via `in:sent "New SMS:"`).
  The deep Gmail mining pass (in:sent voice corpus for email renderings) is still
  worth a future session — tracked as an upgrade, not a blocker.
