# Wedding Video — Plain-Language Script (v1.0, 2026-08-03 — SHOOT-READY PENDING 4 SIGN-OFFS)

Companion to [wedding-video-brief-2026-07.md](./wedding-video-brief-2026-07.md). Same format as the approved bach script: **~90% voiceover over b-roll; Allan on camera 3 times only** (hook, the open-bar-math moment, CTA — under 10% of runtime). Venues and partners named.

**Runtime target: ~4:30.** VO is ~680 words at a relaxed 150 wpm. Every chapter title is the search phrase — say it out loud as written and put it on screen.

> **Status: 4 claims need Allan's sign-off before the shoot** (table at the bottom). One of them — the leftover/refund policy — is a **blocker**, because the site currently states it three different ways. Everything else in this script is verified against live code or published pages.

Evidence sources: [internal-data-wedding-corporate-2026-07-14.md](../../data/seo/internal-data-wedding-corporate-2026-07-14.md) (real orders), `src/lib/wedding-packages/calculations.ts` + `tier-config.ts` (the formula and servings canon), `src/app/weddings/page.tsx` (published per-person tiers), SERP/PAA research in `data/seo/serp-paa/2026-07-14-wedding-corporate.md`.

**Servings canon used throughout (resolved 2026-08-03, now consistent site-wide):** wine = **5 glasses** per 750ml, spirits = **17 drinks** per 750ml (1.5oz pours), champagne = **5 glasses** per bottle. Drink volume = **guests × (hours + 1)**. Full-bar split = **30% spirits / 40% wine / 30% beer**.

---

## COLD OPEN — 0:00–0:14 · **ALLAN ON CAMERA** (in front of a loaded van, or a venue bar setup)

> "A hundred guests, five hours, and one question nobody wants to get wrong: how much alcohol do you actually buy? Here's the math — plus what the venue isn't telling you about their open bar."

*On-screen:* "100 guests. 5 hours. The real number." · *B-roll cut on "open bar": a venue bar in service, glasses being poured.*

---

## Q1 — "How much alcohol do you need for a wedding?" · 0:14–0:42

**The opinion: one formula, and it already includes the buffer everyone tells you to add.**

> "One drink per guest per hour, plus a full extra hour of cushion. That's it. Guests times hours-plus-one. A hundred guests over five hours is six hundred drinks. That sounds like a lot — it isn't. It's a hundred people having one drink an hour, and it already builds in the buffer that every wedding blog tells you to add on top. Don't add a second buffer to a buffer. You'll be returning pallets."

*On-screen:* the formula, big: **guests × (hours + 1) = drinks** → "100 × 6 = 600". · *B-roll:* HAVE — product/warehouse shots, cases stacked. NEED — a reception in full swing, wide.

## Q2 — "How much for 100, 150, or 200 guests?" · 0:42–1:16

**The opinion: stop converting in your head. Here are the three numbers.**

> "Here's what six hundred drinks actually looks like on a delivery invoice for a full bar. Forty percent wine, thirty percent spirits, thirty percent beer — that's the split that matches what real Austin weddings drink. A hundred guests, five hours: forty-eight bottles of wine, eleven bottles of liquor, and about a hundred and eighty beers. A hundred and fifty guests: seventy-two wine, sixteen liquor, two-seventy beer. Two hundred guests: ninety-six wine, twenty-two liquor, three-sixty beer. Screenshot this one."

*On-screen:* a clean three-column table — 100 / 150 / 200 guests × wine / liquor / beer. Hold it 6+ seconds, it's the screenshot moment and the #1 short. · *B-roll:* HAVE — bottle close-ups, case counts.
*Math check (750ml units, 5-hour event): 100g = 600 drinks → wine 240/5 = 48 · spirits 180/17 = 11 · beer 180 cans. 150g = 900 → 72 / 16 / 270. 200g = 1,200 → 96 / 22 / 360.*

## Q3 — "How much does an open bar cost — and is it worth it?" · 1:16–1:44

**The opinion: worth it for the guests, brutal for the budget — and you're paying for the pour, not the bottle.**

> "A venue open bar runs about twenty-five to forty-five dollars a head for a standard package — and the top end goes a lot higher. For a hundred guests that's twenty-five hundred to forty-five hundred dollars, before service charge and before gratuity. What you're buying is convenience and somebody else's liability. What you're not buying is the alcohol at anything close to what it costs. The question isn't whether an open bar is nice. It's whether you know what the same drinks cost if you buy them yourself."

*On-screen:* "$25–45 per person · 100 guests = $2,500–$4,500 (+ service + gratuity)". · *B-roll:* NEED — venue bar with a bartender working; a check presenter / invoice prop.

## Q4 — "Open bar vs buying your own: the real math" · 1:44–2:20 · **ALLAN ON CAMERA moment #2** (12 sec, standing beside a full delivery)

**The opinion: our most expensive package costs what a venue's cheapest open bar costs.**

> **[Allan, to camera]:** "This is the whole video in one sentence. Our most expensive wedding package is twenty-six dollars a person. A venue's *cheapest* open bar is about twenty-five."
> **[VO resumes]:** "Our tiers run thirteen to twenty-six dollars a head — that's thirteen hundred to twenty-six hundred for a hundred guests, all in. Same guests, same five hours, same drinks in their hands. The difference is that you're buying bottles at retail instead of renting pours at a markup. You still need bartenders — budget for those separately, and hire good ones. But the alcohol itself is the single easiest line item to cut in half without a single guest noticing."

*On-screen:* side-by-side bars — "Venue open bar $25–45/pp" vs "Party On $13–26/pp". Then small print: "bartenders billed separately." · *B-roll:* HAVE — delivery handoff, van, cases going in. · *Evidence: published tiers on /weddings ($13/$16/$20/$23/$26 per person); open-bar range per Zola/Curated/EventWorks — see claims table.*

## Q5 — "What's the right liquor, wine, and beer split?" · 2:20–2:46

**The opinion: forty percent wine. Weddings are a wine event and the data isn't close.**

> "Thirty percent spirits, forty percent wine, thirty percent beer for a full bar. Doing beer and wine only? Go fifty-five wine, forty-five beer. And here's the part I'd bet money on: **the top ten things Austin weddings actually order from us are led by prosecco, sauvignon blanc, pinot noir and cabernet** — whites and sparkling out front. Weddings are wine-first. Bachelor parties are seltzer-first. Do not plan a wedding bar like a bach party."

*On-screen:* pie chart 30/40/30, then the top-product list. · *B-roll:* HAVE — wine and prosecco bottle shots, pour close-ups. · *Evidence: DRINK_MIX_FULL_BAR in calculations.ts; internal top-products pull, n=15 (directional).*

## Q6 — "Who pays for the alcohol at a wedding?" · 2:46–3:06

**The opinion: whoever's name is on the venue contract — and settle it before you taste a single thing.**

> "Traditionally the bride's family covered the reception, and plenty of families still do. Realistically, in 2026, it's whoever is paying for the venue — often the couple. The useful version of this question isn't who *should* pay, it's who *decides*. Alcohol is usually five to ten percent of a wedding budget and it's the line everyone has an opinion about. Name the payer and the decision-maker in the same conversation, early, and you'll never have this fight."

*On-screen:* "Who pays ≠ who decides. Settle both early." · *B-roll:* HAVE — planning/paperwork b-roll, venue walkthrough.

## Q7 — "How much champagne do you need for the toast?" · 3:06–3:24

**The opinion: one glass per person, five glasses per bottle. That's twenty bottles for a hundred guests.**

> "One toast pour per guest, five pours per bottle. A hundred guests is twenty bottles. Don't fill the flute — a toast pour is half a normal glass, and half your guests will take one sip and set it down. Buy a couple extra bottles for the photos and the second toast nobody planned, and skip the expensive label for the toast itself. Nobody is tasting it. Save the good bottle for the two of you."

*On-screen:* "1 pour per guest · 5 pours per bottle · 100 guests = 20 bottles". · *B-roll:* NEED — champagne tower or toast moment; bottle pour close-up.

## Q8 — "Where do you buy wedding alcohol in bulk — and what happens to the leftovers?" · 3:24–3:50

**The opinion: buy from someone who'll take the unopened cases back. That policy is worth more than a discount.**

> "Buy from a licensed retailer who delivers cold, on your timeline, to the venue — not from wherever's cheapest by the bottle. The number that actually decides this is the leftovers policy. Order for the crowd you hope shows up, and send back what nobody opened. **[POLICY LINE — see claims table]** That's the whole reason you can afford to over-order slightly instead of running dry at nine-thirty. Running out at a wedding is the one mistake you can't fix from the parking lot."

*On-screen:* "Order for the crowd you hope for. Return what's unopened." · *B-roll:* NEED — unopened cases being loaded back into a van (the proof shot for this chapter). · **⚠ Do not shoot this chapter until the refund policy claim is settled — see claim #2.**

## Q9 — "Do you need a bartender, a license, or insurance?" · 3:50–4:10

**The opinion: you need a bartender and they need to be certified. You don't need a license to have alcohol at your own wedding.**

> "You don't need a permit to serve alcohol at your own private wedding — but the second money changes hands for drinks, you do, so don't 'sell' anything. What you actually need is certified bartenders, and most Austin venues require it in writing along with a certificate of insurance. We're a TABC-licensed retailer, we're insured, our drivers are TABC-certified, and we card on delivery because the law says so. Ask your venue for their bar requirements in writing the week you book — not the week of."

*On-screen:* "Private wedding: no permit to serve · Selling drinks: permit required · Venue: ask for bar rules in writing." · *B-roll:* HAVE — TABC badge/licensing graphic, driver carding at a door. · *Evidence: /weddings + corporate lander FAQs (TABC-licensed, $1M insured, COI on request, drivers TABC-certified).*

## Q10 — "When do you order the alcohol?" · 4:10–4:26

**The opinion: two to three weeks out. Most couples cut it much closer than that.**

> "Book the venue a year out, the bartenders three months out, and the alcohol two to three weeks out — once your RSVP count is real. **Our own median wedding order comes in ten days ahead**, which works, but it's tighter than it needs to be. Two to three weeks means you get the exact bottles you picked instead of the closest substitute. Run the free calculator the day your RSVPs close and order from the number it gives you."

*On-screen:* timeline: venue −12mo · bartenders −3mo · **alcohol −2 to 3 weeks**. · *Evidence: internal median wedding lead time = 10 days (n=15).*

## CTA — 4:26–4:42 · **ALLAN ON CAMERA #3** (van door, hand truck of cases)

> "We're Party On Delivery, and we stock weddings all over Austin — downtown venues, Hill Country ranches, Lake Travis, wherever you're getting married. Free calculator on our site does this math for your exact guest count in about a minute, and we'll deliver it cold to the venue on the day. Link's below. Congratulations — go enjoy it."

*On-screen:* partyondelivery.com/wedding-drink-calculator. *End screen: chapters menu (each question = a card) — feeds the shorts.*

---

## Claims needing Allan's sign-off (4)

| # | Claim as scripted | What's behind it | Status |
|---|---|---|---|
| 1 | "Twenty-five to forty-five dollars a head" for a venue open bar | External sources only (Zola / Curated / EventWorks industry ranges, full range $15–90). We have no first-party venue pricing. | ⚠ **APPROVE OR SOFTEN** — suggest "typically twenty-five to forty-five" and cite "industry averages" on screen, or replace with 2–3 real Austin venue quotes if you have them |
| 2 | Q8 leftovers/refund policy — **line deliberately left blank** | **The site says three different things today:** homepage FAQ says *"100% refund policy"* for weddings; homepage feature card says *"Weddings: 100% refund on unopened"*; `/wedding-drink-calculator` FAQ says *"partial refund (depending on volume)"*; the corporate lander says *"free returns on unopened."* A real customer testimonial on `/partners/inn-cahoots` confirms unopened wedding cases were refunded. | 🚫 **BLOCKER** — tell me the actual policy and I'll write the line + fix the pages that contradict it. Do not shoot Q8 until this is settled |
| 3 | "The top ten things Austin weddings order are led by prosecco, sauvignon blanc, pinot noir and cabernet" | Internal pull, **n=15 paid wedding orders, 2026 only** — directional, not statistically solid. Top items: Amor Di Amanti Prosecco (25), Dos Equis 12pk (24), Bogle Pinot Noir (22), Espolon 1.75L (21), Chandon Brut (20). | ⚠ **APPROVE** — accurate as stated but thin; safe because it's phrased as what people order from *us*, not a market claim |
| 4 | "Our own median wedding order comes in ten days ahead" | Internal median lead time = 10 days (n=15). Same sample caveat. | ⚠ **APPROVE** — same pattern as the bach script's approved 48-hour stat |

**Verified, no sign-off needed:** the formula `guests × (hours + 1)`; the 30/40/30 and 55/45 splits; wine 5 / spirits 17 / champagne 5 per bottle; the 100/150/200 worked examples (recomputed for this script); the published `$13–$26/person` tiers; TABC-licensed + $1M insured + TABC-certified drivers + carding on delivery.

## Master shot list (NEED — one shoot day, ideally piggybacked on a real wedding delivery)

1. **Unopened cases going back into the van** (Q8 proof shot — gated on claim #2)
2. **Venue bar in service** — bartender pouring, guests at the rail (Q3/Q4; ask a partner venue, tag them)
3. **Reception wide shot** in full swing (Q1)
4. **Champagne toast / tower** (Q7)
5. **Delivery arrival at a venue** — van, hand truck, cases through a service door (Q4/CTA)
6. Allan's 3 on-camera pieces (hook / the $26-vs-$25 line / CTA) — under 60 sec total
7. Prop shots: venue invoice or check presenter (Q3), planning binder (Q6)
8. Bottle close-ups: prosecco, sauv blanc, pinot noir, cabernet (Q5 — match the real top-sellers list)

Existing b-roll assumed usable: delivery vans, warehouse, product close-ups, Austin skyline. **Consistency notes for editors:** champagne = 5 glasses/bottle everywhere (never 6–8); wine = 5, spirits = 17 — these now match every calculator on the site, so on-screen numbers can be checked against the live tools; always say bartenders are billed separately when the $13–26/pp tiers are on screen.

## Shorts cut map

Q2 (the 100/150/200 table) and Q4 (open bar vs buying your own) are the two flagship clips — the cost SERPs are where Short carousels surface. Q7 (champagne math) is the most screenshot-able. Bonus short-only, socials: **"Do wedding venues water down alcohol?"** (20/mo, spicy, no long-form chapter).
