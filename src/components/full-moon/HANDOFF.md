# Full Moon Party — Handoff

Working state for the Lake Travis Full Moon Party landing page + ticketing.
Pick up here in a new session. Last updated 2026-07-08.

## Where it lives
- **Branch**: `feat/full-moon-party` (pushed to origin; NOT merged — preview-first).
- **Preview** (hard-refresh): https://party-on2-git-feat-full-moon-party-infinite-burn-rate.vercel.app/full-moon
- **Route**: `src/app/full-moon/page.tsx` — `robots: noindex` (unlaunched).
- **Components**: `src/components/full-moon/` (~26 files). Composition shell: `FullMoonParty.tsx`.
- **Copy source of truth**: `src/components/full-moon/event.ts` — change event facts/copy here.
- **APIs**: `src/app/api/v1/full-moon/{ticket,count,guests}/route.ts`.
- **Ticket lib + test**: `src/lib/full-moon/ticket.ts` (+ `__tests__/ticket.test.ts`).
- **Webhook edit**: `src/lib/stripe/webhooks.ts` — skips the delivery task for event tickets (`isEventTicketSession`, keyed on Stripe metadata `eventTicket=1`).
- **Chat hidden on this route**: `src/components/chat/PartyChatMount.tsx` (added `/full-moon`).
- **Product script**: `scripts/full-moon/upsert-ticket-product.mjs` (DRAFT ticket product, operator-gated, **dry-run default**, `--apply` to write).
- **Feature flag**: `FULL_MOON_TICKETS_LIVE` — fails closed; nothing purchasable until set to `1`.

## Current event facts (event.ts)
Sat **Aug 1, 2026**, **8:00–11:30 PM** (3.5-hr cruise), **$59**, cap **50**, min **32**,
**Anderson Mill Marina · 13993 FM 2769, Leander, TX 78641** (⚠️ verify street number),
**60-foot** party boat, **adults 25+**, **BYOB** (drinks via POD, iced cooler on board),
**DJ Trey**, water/ice/cups, life jackets. **No food** (light bites were dropped in round 4).
Fetii ride discount code **PartyOn** (25% off). Co-brand: Premier Party Cruises.

## What's built
- Full immersive dark page: fixed sunset→moonrise sky/sun/moon/stars (scroll-driven, no in-hero
  parallax), slim nav, hero (rainbow-gradient headline + datestamp + location + logo-by-CTA +
  carousel), quick facts, "Bring your people" (share, partygoers bg), one-tile "What's on board"
  (included + what-to-bring), schedule timeline, drinks-via-POD (bar bg), 3-state ticket-threshold
  widget (big animated status + **See guest list**), "Very important" safety/Fetii note, gallery +
  lightbox, FAQ, footer. Overlays: share sheet, success modal, toast, floating share FAB.
  Reduced-motion honored. Built with POD components (Button, Fraunces, framer-motion, ScrollReveal)
  + a scoped CSS module (`full-moon.module.css` + `full-moon-overlays.module.css`).
- **Ticketing (flagged OFF)**: `$59×qty` sold via a zeroed DraftOrder → existing Stripe
  `draft_order_invoice` webhook → Order + confirmation email + GHL. TicketModal (name/email/phone/
  qty 1–8/25+). Returns to `/full-moon?ticket=success` → success/share modal.
- **Live count** + **guest list** (first name + last initial of paid buyers) endpoints.

## Verified
tsc 0, lint clean, `npm run test:run` 606/606 (incl. 16 ticket/guest unit tests). Vercel build
READY each round. Deployed checks: page 200; `/count` → `{"sold":0,"minimum":32,"capacity":50}`;
`/ticket` POST → 403 (fails closed); `/guests` → `{"guests":[]}`. Two security reviews passed
(ticketing + guest list), all findings addressed.

## NOT verified
- Visual appearance / mobile layout (CLAUDE.md forbids screenshots — review on the Vercel preview).
- The **real paid purchase end-to-end** (live Stripe keys — that's the controlled go-live test).
- The DRAFT product is **not created** yet (only dry-ran the script).

## Open decisions (Allan's call)
- **Date**: Aug 1 vs. the real Aug full moon (**Aug 28**). Aug 1 moon is ~88% and rises ~11 PM.
- **Light bites**: dropped in round 4 to match the new list — restore if wanted.
- **Marina exact street number** (used the disco-cruise address 13993 FM 2769).
- **Logo on the dark scrolled nav** — confirm it's visible (true colors now; add a backing/light
  version if it disappears).
- Any new edits Allan wants (this handoff exists because more edits are coming).

## Go-live checklist (ticketing)
1. `node scripts/full-moon/upsert-ticket-product.mjs --apply` (source `.env.local` first) → creates
   the DRAFT $59 ticket product in the "Events" category.
2. Set `FULL_MOON_TICKETS_LIVE=1` in Vercel env.
3. **Controlled live test**: buy 1 ticket with a real card → confirm Order + email + GHL + count
   increments + guest list shows the name + success/share modal → **refund it in Stripe**.
4. Guest-list follow-ups (from security review): add `OrderItem.@@index([productId])` via the
   **db-migration** skill; decide **moderation** (denylist or an admin "hide from guest list" toggle).
5. Deferred **landing-page-launch** checklist items: registry entry in
   `src/lib/analytics/landing-pages.ts`; age-gate exemption (harmless — no global gate is mounted);
   CTA instrumentation (`trackCTAClick` + `trackPodEvent`); OG image regen; optional A/B + analytics-
   hub tab; post-launch re-measure task.
6. Verify marina address; confirm the date.
7. **`/code-review` + merge via the `ship` skill** (never merge outside ship; mandatory post-merge
   verification). Manual refund process for the <32 roll-forward (no auto-refund built).

## Gotchas
- **Worktree**: `node_modules` + `.env.local` are symlinked from the main checkout (fine for
  tsc/lint/test; per memory `worktree_npm_run_dev`, `node_modules` must be **copied** for Turbopack dev).
- **Tailwind comma-in-arbitrary-value trap** → fluid type uses inline `clamp()` styles, not
  `text-[clamp(...)]`.
- **Stripe is on live keys** → nothing purchasable until the flag is on; test only with a real card
  you then refund.
- Gates only: `npx tsc --noEmit`, `npm run lint`, `npm run test:run` (never `next build`, Playwright,
  or screenshots). Visual review happens on the Vercel preview.
