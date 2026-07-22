# Customer Communication Playbook

One brain for every channel: this directory governs how Party On Delivery automatically
answers inbound customer **SMS, email, and web chat** — and, later, how the Phase-5 voice
receptionist talks. Canned answers for the easy stuff, explicit thresholds for pulling in
a human, and a hard rule that the bot never states a fact this playbook can't back.

## What consumes this

| Consumer | How | Status |
|---|---|---|
| PartyChat (site chat) | `scripts/playbook/build-chat-prompt.ts` regenerates the `<!-- PLAYBOOK:BEGIN -->` block in `src/prompts/reginald.md` | live |
| CRM email AI-inbox (info@) | `partyon-crm/scripts/ingest-playbook.ts` → `ai_inboxes.system_prompt` + `knowledge_base` | after Supabase deploy; starts in `auto_reply_mode='draft'` |
| CRM chat widget | same ingest → `knowledge_base_docs` rows | after Supabase deploy |
| SMS auto-reply | same ingest → `sms_templates` (from each card's `## SMS` block) | blocked on A2P approval |
| Voice receptionist | each card's `## Voice` notes | Phase 5, script guidance only |

## The four tiers (full semantics in playbook.yaml)

- **T1 auto-answer** — verified facts + tool-backed lookups. No review.
- **T2 auto-answer + flag** — answer now, human sees it same-day (day-of logistics, Premier redirects).
- **T3 draft-and-hold** — never auto-sends; human approves the draft (quotes, order changes, partners, anything touching an `unknown`/`conflicting` fact).
- **T4 escalate, ack only** — the customer gets an acknowledgment and a human gets pinged; the bot never answers substantively. Refunds, cancellations, complaints, legal/fraud, intoxication/minors, day-of failures. **100% T4 escalation is a release gate** (see `scripts/playbook/replay-golden-set.ts`).

Interim escalation destinations: urgent → Allan's cell (512-576-7975); everything else →
info@partyondelivery.com. Swaps to the CRM `escalations` queue when deployed.

## Editing rules

1. **Facts**: an auto-reply may only state facts present in `facts.yaml` or
   `facts-generated.yaml` with `status: verified`. `unknown`/`conflicting` facts are never
   ingested — answer the associated `open-questions.md` entry to unlock them.
2. **`facts-generated.yaml` is generated** — edit `src/lib/delivery/rates.ts` (etc.) and
   re-run `npx tsx scripts/playbook/extract-code-facts.ts`. Site copy that disagrees with
   it is stale copy.
3. **Intent cards** (`intents/*.md`): frontmatter schema is enforced by the ingest lint
   (`partyon-crm/scripts/ingest-playbook.ts --lint`). The `## SMS` block IS the SMS
   template — ≤320 chars, `{{var}}` interpolation, no separate template library.
4. Every card must be registered in `playbook.yaml` `intents:`; every T4 card must name a
   valid `escalation_reason`.
5. After editing anything here: re-run the lint, re-run
   `npx tsx scripts/playbook/build-chat-prompt.ts`, and re-ingest the CRM (when live).
6. Keep Allan's voice (`voice-guide.md`) — warm, short, first-name, "-Allan".

## Intent inventory (31 cards)

Frequency source: 2026-07-06 GHL export — 13,600 conversations, 624 inbound
last-messages labeled (heuristics + model pass). Ranks are **provisional**: last-message
sampling under-counts question intents that got answered mid-thread (full-thread relabel
is queued behind the corpus upgrade). 258 inbound phone calls with no text body are the
volume case for the Phase-5 receptionist.

| # | Intent | Tier | Corpus n | Notes |
|---|---|---|---|---|
| 1 | cruise-drink-setup | T1 | 10* | *Known #1 by full-thread volume; drip replies land here all season |
| 2 | cruise-day-logistics | T2 | 15 | address/boarding/parking/gate → generic marina facts + Premier redirect |
| 3 | cruise-running-late | T2 | 12 | urgent: → Premier's # (2026-07-07, captain's line) |
| 4 | post-event-thanks | T1 | 12 | warm reply + review link |
| 5 | delivery-access-info | T1 | 8 | customer gives gate code/unit → ack + log for driver |
| 6 | cruise-whats-allowed | T2 | 7 | glass/BYO/cups/ice |
| 7 | refund-credit-request | T4 | 5 | |
| 8 | delivery-eta | T2 | 5 | T4 override if delivery has failed / party imminent |
| 9 | order-change-add | T3 | 4 | money-touching |
| 10 | quote-request | T3 | 4 | |
| 11 | cruise-waiver-fix | T2 | 4 | Premier redirect + flag |
| 12 | pickup-request | T2 | 4 | pickup exists (PR #113); returns = policy no |
| 13 | partner-affiliate-inquiry | T3 | 17† | †includes B2B cruise-invite RSVPs; payout money-asks escalate |
| 14 | product-availability | T1 | 3 | tool-backed catalog lookup |
| 15 | shipping-outside-austin | T1 | 3 | verified 2026-07-07: never ship — clean no + local alternative |
| 16 | cruise-premier-redirect | T2 | 6 | music + Fetii answered directly (2026-07-07); photos/fleet stay redirects |
| 17 | cruise-order-deadline | T2 | 2 | 48h fact; near-cutoff → flag |
| 18 | cruise-weather-reschedule | T2 | 2 | weather/go-no-go → Premier's # (2026-07-07); rain-out refunds still escalate to Allan |
| 19 | cruise-guest-update | T2 | 2 | manifest changes → log + Premier |
| 20 | order-cancellation | T4 | 0‡ | ‡no clean last-message sample; real threads exist |
| 21 | complaint-issue | T4 | 2 | |
| 22 | hours-availability | T1 | 2 | fully verified: closed Sundays + Thanksgiving/Christmas |
| 23 | delivery-zones-minimums | T1 | 1 | facts-generated.yaml |
| 24 | bartender-services | T3 | 2 | $600 package floor verified; quotes stay Allan's |
| 25 | corporate-event-inquiry | T3 | 1 | |
| 26 | order-confirmation-ack | T1 | 124 | biggest real bucket; includes declines ("we'll bring our own") |
| 27 | callback-request | T2 | ~3 | "call me back at…" → ack + notify |
| 28 | opt-out-stop | T1 | 51 | compliance-handled; includes wrong-number |
| 29 | spam-vendor | T1 | 69+ | never reply |
| 30 | internal-partner-ops | T4 | 29 | Premier/vendor/staff threads — no auto-reply, route |
| 31 | unknown-low-confidence | T3 | 53 | the classifier's escape hatch |

Excluded from cards (corpus noise, no reply behavior needed): `short-ack` (70),
`reaction-echo` (44), `premier-drip-echo`/own-outbound echoes (43), `url-only` (6),
`event-invite-echo` (3).

## Files

| File | Purpose |
|---|---|
| `playbook.yaml` | manifest: tiers, per-channel behavior, limits, destinations, card registry |
| `facts.yaml` | curated facts registry (verified / conflicting / unknown) |
| `facts-generated.yaml` | DO-NOT-EDIT code-extracted facts (zones, fees, tax) |
| `voice-guide.md` | Allan's voice — DO/DON'T pairs from real messages |
| `channels.md` | per-channel rendering rules (SMS/email/chat/voice) |
| `compliance.md` | SHAFT/A2P, CAN-SPAM, TABC — non-negotiable prompt block |
| `escalation.md` | escalation policy + mirror of the CRM keyword lists |
| `open-questions.md` | operator queue; each answer unlocks specific cards |
| `intents/*.md` | the 31 cards |

## Changelog

- **2026-07-07 v1.1** — operator review round: all 18 open questions answered and
  applied. Highlights: hours fully verified (closed Sundays; Thanksgiving + Christmas
  only blackouts), shipping = never (card T3→T1), reschedule≠cancel reconciled (free
  ≤6h reschedule / 48h refund window), refund SOP (original card, 5–10 business days,
  Allan-only), bartending $600 floor, NET terms removed everywhere, THC "coming soon",
  PREMIER25 retired, Premier handoff split (music/Fetii/parking/arrival/waiver/weather
  now POD-answered), TABC permit P-200084398 recorded.
- **2026-07-06 v1** — initial build from the 2026-07-06 GHL corpus export (13.6k
  conversations, full threads for dialogue subset), FAQ/terms/landing-config facts audit,
  and the fork's escalation engine. Author: Claude session for Allan; pending Allan's
  one-round review (P4).
