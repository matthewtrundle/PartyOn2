# Full Moon Party — Handoff

Working state for the Lake Travis Full Moon Party landing page + ticketing.
Last updated 2026-07-28 (Aug 28 reschedule).

## Current event — Fri Aug 28, 2026
**7:00–11:00 PM** (4-hr cruise), **$79**, cap **50** advertised / **60** hard, min **32**,
**Anderson Mill Marina · 13993 FM 2769, Leander, TX 78641** (⚠️ street number STILL unverified),
**60-foot** party boat, **adults 25+**, **taco bar INCLUDED**, **BYOB** (drinks via POD, iced cooler
on board), **DJ Trey**, water/ice/cups, life jackets. Fetii code **PartyOn** (25% off).
Co-brand: Premier Party Cruises. **Note: Aug 28 is a FRIDAY.**

Aug 28 is the *real* August full moon — it rises within ~30 min of sunset, so it comes up over the
water during the cruise. That's now the core pitch, and the schedule + FAQ lean on it.

## What happened to the Aug 1 attempt (read this before planning the next one)
**0 paid tickets. Postponed by the deadline cron 2026-07-25.** The only 3 "sales" were $0 comps
(Allan, Betsy, Brian) added to test the guest list. No refunds were needed — comps are skipped.

It was not a build failure: `FULL_MOON_TICKETS_LIVE=1` was set and checkout worked end to end.
It was a **distribution** failure. The page got **37 pageviews from 10 unique visitors, all direct**
(one referrer: our own `/ops/events`). It was never in the sitemap, never in the landing-page
registry, had no CTA instrumentation, and no email/SMS/social/paid push ever went out. The
"analytics niceties" deferred at Aug 1 go-live were, in hindsight, the launch itself.

**All of that wiring is now in place** (see "Launch wiring" below). The remaining lever is actually
pushing traffic at it — drafts are in `docs/marketing/full-moon-aug28-outreach.md`, unsent.

## Where it lives
- **Route**: `src/app/full-moon-aug28/page.tsx` — `robots: index` (live).
  `/full-moon` and `/full-moon-aug1` both **301** here (next.config.ts).
- **Components**: `src/components/full-moon/` (~26 files). Shell: `FullMoonParty.tsx`.
- **Copy source of truth**: `src/components/full-moon/event.ts` — change event facts/copy here.
- **APIs**: `src/app/api/v1/full-moon/{ticket,count,guests}/route.ts`.
- **Roster/refund/state**: `src/lib/full-moon/{roster,refund,event-state,guest-moderation}.ts`.
- **Ops**: `/ops/full-moon` (roster) and `/ops/events` (hub, `src/lib/events/ops-catalog.ts`).
- **Deadline cron**: `/api/cron/full-moon-deadline`, daily 15:00 UTC. Detect + alert ONLY —
  it flips the postponed flag and emails the operator, and **never** moves money.
- **Feature flag**: `FULL_MOON_TICKETS_LIVE` (Vercel env) — fails closed.
- **Scripts**: `scripts/full-moon/{upsert-ticket-product.mjs,comp-guest.mjs,batch-refund.ts}`.

## Rescheduling checklist (what changed this round — do all of it next time)
1. `event.ts`: `isoDate`, `dateLabel`, `shortDate`, `castOff`, `backAtDock`, `sunset`, `price`,
   `shareUrl`, **`TICKET_PRODUCT_HANDLE`**, SCHEDULE times, and any duration wording.
2. **New dated route dir**, delete the old one, add a 301 from it in `next.config.ts`.
3. `src/lib/events/ops-catalog.ts` — `key` + `publicPath`.
4. `src/app/sitemap.ts` — repoint the `/full-moon-*` entry.
5. `src/lib/analytics/landing-pages.ts` — repoint `canonicalPath`, push the old route to
   `aliasPaths`.
6. `scripts/full-moon/upsert-ticket-product.mjs` (handle/sku/price/description) and
   `comp-guest.mjs` (handle). Then run upsert with `--apply`.
7. `PartyChatMount.tsx` route regex.
8. **Do NOT** need to reset the postponed flag — it's date-scoped now (see below).

## Non-obvious things fixed this round (don't regress these)
- **Postponed flag is now DATE-SCOPED**: `full_moon_postponed_<isoDate>` via
  `fullMoonPostponedKey()` in `event-state.ts`. It used to be one global boolean, which meant a
  rescheduled event silently inherited the previous one's postponed state — the Aug 28 page would
  have launched reading POSTPONED off Aug 1's row. A fresh event now has no row, and no row = selling.
- **One ticket product per event**: `full-moon-party-ticket-aug28`. The roster, sold count, guest
  list and batch refund are all scoped by product handle, so reusing one product across events
  would blend two cruises' orders and make a batch refund dangerous.
- **Stripe return URLs derive from `EVENT.shareUrl`** (`EVENT_PATH` in the ticket route). They were
  hardcoded to `/full-moon-aug1` and would have bounced Aug 28 buyers through a redirect after paying.
- **`Button` now forwards `onClick` on the `href` branch.** It was dropped, so click-tracking on any
  navigating CTA silently did nothing. Verified no other caller passed both before changing it.

## Launch wiring (was missing at Aug 1 — now done)
- Registry entry in `src/lib/analytics/landing-pages.ts` (key `full-moon`, canonical
  `/full-moon-aug28`, aliases `/full-moon` + `/full-moon-aug1`) → gets an analytics-hub tab.
- Sitemap entry at priority 0.9.
- CTA instrumentation: `openTicket(section)` fires `trackCTAClick` — `hero` from the hero button,
  `final_cta` from the threshold widget, `services` from the Drinks-via-POD "Order Now".
- OG/link-preview image unchanged (`moonrise-dance-hero.webp`), still accurate.

## Verified this round
`npx tsc --noEmit` exit 0 · `npm run lint` exit 0 (only pre-existing `<img>` warnings elsewhere) ·
`npm run test:run` **1250/1250** (+3 new `fullMoonPostponedKey` cases).

## NOT verified
- **Visual appearance of the disco shimmer** — CLAUDE.md forbids screenshots; it's for Allan's eyes
  on the preview. The CSS follows the existing `.hlGroovy` pattern and honors reduced motion.
- **Sunset time 7:55 PM** for Aug 28 — derived, not looked up. It drives the schedule timeline.
- **Marina street number** — carried over from the disco-cruise address, never confirmed.
- A **real paid purchase end-to-end** on live Stripe keys (operator-only test).

## Open decisions / operator actions
- ⏳ Verify the marina street number.
- ⏳ Confirm the taco-bar caterer + per-head cost (the $79 price assumes ~$15–18/head).
- ⏳ Push actual traffic: drafts sit unsent in `docs/marketing/full-moon-aug28-outreach.md`.
  Per memory, the email list has an unresolved consent problem that blocks cold sends.

## Gotchas
- **Tailwind comma-in-arbitrary-value trap** → fluid type uses inline `clamp()` styles.
- **Stripe is on LIVE keys** — test only with a real card you then refund.
- Gates only: `npx tsc --noEmit`, `npm run lint`, `npm run test:run`. Never `next build`,
  Playwright, or screenshots. Visual review happens on the Vercel preview.
- Merges go through the `ship` skill (mandatory post-merge verification).
