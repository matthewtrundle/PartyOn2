# Buckaroo Rodeo — Event Order Landing Page Spec

> **Hand-off target:** Claude Design (visual design within the PartyOn design system)
> **Event:** Buckaroo Rodeo · **Sunday, July 12, 2026** · aboard Premier Party Cruises (Brian's boats), Lake Travis
> **Page job:** get each group on the boat to **start a drink order** that lands them in their own dashboard.

A one-off, Western-flavored event invite page built on the **Dad's Gone Wild** structure (sticky event nav → cinematic hero → marquee ticker → detail cards → content → closing CTA → footer). The single job of the page is conversion to **Start your order**.

---

## Decisions locked

| Decision | Choice |
|---|---|
| Primary action | **Order drinks** (no RSVP form) |
| Order model | **Disco-cruise style** — multiple groups; each group starts/shares its own order; pooled into individual coolers |
| Theme | **Western flavor, on brand colors** (blue / yellow / gold + Barlow Condensed) |
| Co-branding | **Premier Party Cruises** (Brian's boats). No Boatsetter. |
| Date | **Sunday, July 12, 2026** (confirmed a Sunday) |
| Order-by deadline | **24 hours in advance — Saturday, July 11** |

---

## The order mechanics (what the CTA actually does)

Every "Start your order" button points to **one URL**:

```
/order?ref=PREMIER&p=boat&d=boat
```

When tapped, the existing system (no new backend required) automatically:

- Attributes the order to the **Premier** affiliate (`PREMIER`, id `d21bac1a-…`) → Brian gets credit
- Sets party type **Boat** and delivery context **Boat** → skips the party-type chooser entirely
- Pre-fills the marina delivery tab **"Marina Delivery"** at `13993 FM 2769, Leander TX 78641`
- Generates a 6-char code and drops the group into their own dashboard at `/dashboard/[code]`

So **one tap = one group's private order page (one cooler).** Inside that dashboard the group adds drinks and uses the built-in **Share** button to pull the rest of their crew in. A different group taps the same CTA and gets their *own* dashboard/cooler. That's the "multiple groups, pooled into individual coolers" model with zero new plumbing.

**Order rules to surface on the page** (Leander / Lake Travis delivery zone):

- **$150 minimum** per group
- **$40 delivery**, **free over $400**
- **Order by 24 hours in advance — Saturday, July 11**

---

## Wireframe (top → bottom)

```
┌──────────────────────────────────────────────────────────────┐
│ STICKY EVENT NAV  (full-bleed, transparent over hero)          │
│  BUCKAROO RODEO ⬥ wordmark            [ Start Your Order ] ←CTA │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ ░░░ HERO — full-bleed Western + Lake Travis boat image ░░░     │
│ ░░░ dark gradient overlay ░░░                                  │
│                                                                │
│        ◆ PREMIER PARTY CRUISES · SUN · JULY 12 ◆   (eyebrow)   │
│                                                                │
│             B U C K A R O O   R O D E O          (H1, huge)    │
│        Saddle up — we'll wrangle the drinks.      (subhead)    │
│                                                                │
│     [ 📅 Sun Jul 12 ]  [ ⏱ Boarding TBD ]  [ ⚓ Lake Travis ] │
│                                                                │
│              ▐▐  START YOUR ORDER  ▶  ▐▐         (yellow CTA)  │
│                  Aboard Premier Party Cruises                  │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ ◀ MARQUEE TICKER (dark) — ICE COLD ✦ BOOTS OPTIONAL ✦ RANCH    │
│   WATER ON DECK ✦ DELIVERED TO THE DOCK ✦ NO COOLER LEFT… ◀    │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ HOW IT WORKS  (light bg, 3 steps)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ 01          │  │ 02          │  │ 03          │            │
│  │ Start your  │  │ Load the    │  │ We deliver  │            │
│  │ crew's order│  │ cooler      │  │ to the dock │            │
│  │ private page│  │ add or share│  │ iced, your  │            │
│  │ for your grp│  │ the link    │  │ cooler,boards│           │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ THE DETAILS  (light bg, numbered cards 2-col on desktop)       │
│  01 WHEN     Sunday, July 12 · [boarding time]                 │
│  02 WHERE    [Marina], Lake Travis        → [ Open in Maps ]   │
│  03 DELIVERY To the dock before boarding · order by Sat Jul 11 │
│  04 GOOD TO KNOW  $150 min / group · free delivery over $400   │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ CROWD-PLEASERS  (optional, light bg) — category tiles that     │
│  link into the order: Ranch Water · Beer · Seltzers · Tequila  │
│  · Margs · Water/Mixers          [ Build my order → ]          │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ CLOSING CTA BAND  (dark / brand-blue, full-bleed)              │
│            READY TO RIDE?                                      │
│        Get your crew's cooler stocked.                         │
│              ▐▐  START YOUR ORDER  ▶  ▐▐                       │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ FAQ  (light bg, 4–5 short Q&A — accordion or 2-col)            │
│  • Must be 21+ (verified at checkout)                          │
│  • How does sharing within my group work?                      │
│  • What's the minimum? When do I order by?                     │
│  • Not sure what to get? (recs live in the dashboard)          │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ FOOTER  (dark) — Party On Delivery × Premier Party Cruises ·   │
│  info@partyondelivery.com · 21+ / drink responsibly            │
└──────────────────────────────────────────────────────────────┘
```

**Mobile:** everything stacks single-column. Hero compresses to ~`h-[80vh]` with the image full-bleed or as a contained card; detail cards and how-it-works steps go 1-up; sticky nav keeps the wordmark + a compact "Order" button. Keep the primary CTA reachable without scrolling and repeat it in the closing band.

---

## Section-by-section: copy + design tokens

**Mandatory:** use the existing design system — `memory/design-system.md`, `src/app/globals.css`, and the hero rules in `CLAUDE.md`. Tokens below are the guardrails.

### 0 · Sticky event nav
- Custom full-bleed nav (like Dad's Gone Wild), transparent over the hero, solidifies on scroll. Left: `BUCKAROO RODEO` wordmark in `font-heading tracking-[0.1em]`. Right: `.btn-cart` "Start Your Order".
- **Build note:** this page renders its own event nav — coordinate with the global `Navigation` so they don't double-stack (hide the global nav on this route, or add the route to `NAV_TRANSPARENT_ROUTES`).

### 1 · Hero
- Layout: `relative h-[80vh] min-h-[560px] flex items-center justify-center overflow-hidden` (full-bleed behind the transparent nav). Image `fill object-cover priority` + overlay `bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/70`. Content `relative z-10 text-center text-white`.
- Eyebrow chip: `PREMIER PARTY CRUISES · SUN · JULY 12` — small caps, **gold (`#D4AF37`) allowed here (dark bg)**.
- H1: `BUCKAROO RODEO` — `font-heading tracking-[0.1em] text-4xl md:text-5xl lg:text-6xl`, white.
- Subhead: *"Saddle up — we'll wrangle the drinks. Brian's boats, Lake Travis, everything ice-cold and delivered to the dock."* — `text-base md:text-lg`.
- Detail chips: date / boarding time / Lake Travis.
- CTA: `.btn-cart` (yellow, black text, `rounded-lg`) → `/order?ref=PREMIER&p=boat&d=boat`. Label "Start Your Order".
- Credit line under CTA: "Aboard Premier Party Cruises."

### 2 · Marquee ticker
- Full-bleed dark/navy band, `py-3`, repeating phrases with ✦ / spur separators. **Gold or brand-yellow text on dark.** Western copy: `ICE COLD · BOOTS OPTIONAL · RANCH WATER ON DECK · DELIVERED TO THE DOCK · NO COOLER LEFT BEHIND · YEEHAW`.

### 3 · How it works (the group / cooler explainer)
- Light bg (`bg-white` / `bg-gray-50`), `.section-padding`, `.container-custom`. Three `.card`s, numbered `01/02/03`.
- **On light bg, accents are `brand-blue` — never yellow/gold text.** Headings `gray-900`, body `gray-700` (≥ `text-sm`).
- 01 **Start your crew's order** — "Tap below and we'll spin up a private order page just for your group."
- 02 **Load the cooler** — "Add your drinks, or share your group's link so everyone chips in their picks."
- 03 **We deliver to the dock** — "Iced down in your group's own cooler, dropped at the marina before you board."

### 4 · The Details
- Light bg, numbered cards (Dad's Gone Wild 01/02/03 pattern), 2-col on `md+`. Labels in `brand-blue`, values `gray-900`.
- **WHEN** · **WHERE** (with **Open in Maps** link) · **DELIVERY** (to dock before boarding · **order by Saturday, July 11**) · **GOOD TO KNOW** (`$150 min per group · free delivery over $400`).

### 5 · Crowd-pleasers *(optional)*
- Light bg. 5–6 category tiles (Ranch Water, Beer, Seltzers, Tequila, Margs, Water/Mixers) — each links into `/order?ref=PREMIER&p=boat&d=boat`. Secondary CTA `.btn-secondary` "Build my order". Drop this section if you want the page leaner.

### 6 · Closing CTA band
- Full-bleed dark or `brand-blue`, white text, gold accent. H2 `READY TO RIDE?`, subline "Get your crew's cooler stocked," `.btn-cart` repeating the order link.

### 7 · FAQ
- Light bg, 4–5 concise Q&A (accordion or 2-col). Must include the **21+ / age-verification** note (alcohol business rule) and the **order-by Saturday, July 11** deadline. Body ≥ `text-sm`, labels ≥ `text-base`.

### 8 · Footer
- Dark. "Party On Delivery × Premier Party Cruises," `info@partyondelivery.com`, 21+ / drink-responsibly line. Gold accent OK on dark.

---

## Design-system guardrails (read before designing)

- **3 colors only:** `brand-blue #0B74B8`, `brand-yellow #F2D34F`, `gold #D4AF37`. **Gold/yellow text on DARK backgrounds only.** Light sections use `gray-900` / `gray-700` text with `brand-blue` accents. Yellow buttons always get **black** text.
- **Buttons:** `.btn-cart` for the order CTAs, `.btn-secondary` for secondary. **All `rounded-lg` — never `rounded-full`.**
- **Type:** headings `font-heading` (Barlow Condensed) `tracking-[0.1em]`; body Inter. Min sizes: body `text-sm`, labels/inputs `text-base`, badges `text-xs` (badges only).
- **Hero — do NOT** use `h-[100vh] pt-32` or `h-screen` unadjusted. Full-bleed hero behind a transparent custom nav, or fall back to the standard `h-[70vh] md:h-[80vh] mt-24` pattern with the global nav.
- **Western flavor = copy + imagery + gold-on-dark accents.** No new palette, no novelty display fonts.

---

## Out of scope

- ❌ RSVP / headcount form
- ❌ Boatsetter mention
- ❌ New backend (the order flow + Premier attribution already exist)
- ❌ Individual-vs-shared toggle (sharing is handled inside the dashboard)

---

## Confirm before/at design time (sensible defaults in place)

1. **Boarding time** on July 12 — hero chip + Details card (placeholder until provided).
2. **Marina / boarding location** — default is Premier's Leander dock (`13993 FM 2769, Leander TX 78641`). Confirm Buckaroo Rodeo launches from there or name the actual marina.
3. **Hero imagery** — Western + boat/lake shot, or point to an existing asset / placeholder.
4. **Premier perks** ($300 free-delivery / mocktail unlock) only render on a *house* tab today, so they **won't show on the boat-only flow.** Leave off, or call the value out on the landing page?
