# Full Moon Party — Handoff

Working state for the Lake Travis Full Moon Party landing page + ticketing.
Pick up here in a new session. Last updated 2026-07-08.

## Where it lives
- **Branch**: `feat/full-moon-party` (pushed to origin; NOT merged — preview-first).
  ⚠️ The branch has hopped worktrees before (another session hijacked the old
  `vigorous-shaw-12b70c` checkout). Always `git worktree list | grep full-moon`
  first; if it's not checked out anywhere, claim it in your own worktree before editing.
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

## Round 5 (2026-07-08) — done this session
- **Headline per-line color**: "FULL MOON" solid moonlight, "ON THE WATER" solid lake-cyan,
  "DANCE PARTY"/"Y'ALL" keep the animated rainbow (event.ts `HeadlineLine.tone` → Hero `TONE_CLASS`).
- **Location** moved into its own glass pill (`whereBox`) matching the datestamp timing box.
- **Removed the sticky nav header + top logo** entirely (deleted `FullMoonNav.tsx`).
- **Drinks/POD tile**: brighter photo (lighter overlay + `brightness()`) + a giant corner logo.
- **Ticketing go-live prep**: guest-list moderation (`src/lib/full-moon/guest-moderation.ts` —
  profanity denylist + `FULL_MOON_GUEST_HIDE` operator override; catches letter-spaced profanity;
  no false-positives on legit names) wired into `/guests`; `OrderItem @@index([productId])` migration
  **applied to prod** (verified present); DRAFT $59 ticket product **created in prod** (id
  `49eda525-3b1f-464c-a8fc-741a2c182801`, hidden, purchasable by handle); fixed stale customer-facing
  copy (Stripe line-item "taco bar included" → BYOB; $69 → $59). Third security review **passed**
  (0 crit/high/med; 2 LOWs addressed). Commits `cd5f9bc5`, `d44a92f0`, `c63dea3d`.

## What's built
- Full immersive dark page: fixed sunset→moonrise sky/sun/moon/stars (scroll-driven, no in-hero
  parallax), **no top nav/logo**, hero (per-line-colored headline + datestamp + location pill +
  logo-by-CTA + carousel), quick facts, "Bring your people" (share, partygoers bg), one-tile "What's on board"
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
tsc 0, lint clean, `npm run test:run` **613/613** (incl. 7 guest-moderation tests). Deployed checks
on the preview: page 200; `/count` → `{"sold":0,"minimum":32,"capacity":50}` (now resolves the real
product); `/ticket` POST → 403 (fails closed); `/guests` → `{"guests":[]}`. Nav removal confirmed in
served HTML (0 `<header>` tags, 0 section-anchor nav links, 2 logos = hero CTA + drinks corner).
Three security reviews passed (ticketing + guest list + round-5 delta), all findings addressed.
Prod: `OrderItem.order_items_product_id_idx` present; DRAFT ticket product exists.

## NOT verified
- Visual appearance / mobile layout — **colors + brightness are for Allan's eyes on the preview**
  (CLAUDE.md forbids screenshots). Structural changes confirmed via served HTML.
- The **real paid purchase end-to-end** (live Stripe keys — that's the controlled go-live test).

## Open decisions (Allan's call — STILL OPEN, gate go-live)
- **Date**: Aug 1 vs. the real Aug full moon (**Aug 28**). Aug 1 moon is ~88% and rises ~11 PM.
- **Light bites**: dropped in round 4 to match the new list — restore if wanted.
- **Marina exact street number** (used the disco-cruise address 13993 FM 2769).
- **Google Drive images**: Allan to share a folder; approach is "propose a mapping first" then apply.

## Go-live checklist (ticketing)
1. ✅ DRAFT $59 ticket product created in prod (`upsert-ticket-product.mjs --apply`).
2. ⏳ Set `FULL_MOON_TICKETS_LIVE=1` in Vercel env (Allan — I can't set Vercel env from here).
3. ⏳ **Controlled live test** (Allan): buy 1 ticket with a real card → confirm Order + email + GHL +
   count increments + guest list shows the name + success/share modal → **refund it in Stripe**.
4. ✅ `OrderItem.@@index([productId])` applied to prod (verified). ✅ Guest-list **moderation** shipped
   (denylist + `FULL_MOON_GUEST_HIDE` env override). Remaining moderation option (nice-to-have): an
   admin "hide from guest list" toggle instead of the env var.
5. ⏳ Deferred **landing-page-launch** items (NOT done — analytics niceties, not functional gates):
   registry entry in `src/lib/analytics/landing-pages.ts`; CTA instrumentation (`trackCTAClick` +
   `trackPodEvent`); OG image regen; optional A/B + analytics-hub tab; post-launch re-measure task.
6. ⏳ Verify marina address; confirm the date (Aug 1 vs Aug 28); decide light bites.
7. ⏳ **merge via the `ship` skill** (never merge outside ship; mandatory post-merge verification).
   `/code-review` on the round-5 delta done. Manual refund for the <32 roll-forward (no auto-refund).

## Gotchas
- **Worktree**: `node_modules` + `.env.local` are symlinked from the main checkout (fine for
  tsc/lint/test; per memory `worktree_npm_run_dev`, `node_modules` must be **copied** for Turbopack dev).
- **Tailwind comma-in-arbitrary-value trap** → fluid type uses inline `clamp()` styles, not
  `text-[clamp(...)]`.
- **Stripe is on live keys** → nothing purchasable until the flag is on; test only with a real card
  you then refund.
- Gates only: `npx tsc --noEmit`, `npm run lint`, `npm run test:run` (never `next build`, Playwright,
  or screenshots). Visual review happens on the Vercel preview.
