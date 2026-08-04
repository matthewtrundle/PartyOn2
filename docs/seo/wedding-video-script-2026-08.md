# Wedding Video — Plain-Language Script (v1.1, 2026-08-04 — SHOOT-READY, ALL CLAIMS APPROVED)

Companion to [wedding-video-brief-2026-07.md](./wedding-video-brief-2026-07.md). Same format as the approved bach script: **~90% voiceover over b-roll; Allan on camera 3 times only** (hook, the open-bar-math moment, CTA — under 10% of runtime). Venues and partners named.

**Runtime target: ~4:45.** VO is ~730 words at a relaxed 150 wpm (chapter stamps are pre-edit targets — re-time against the final cut before the embed config ships). Every chapter title is the search phrase — say it out loud as written and put it on screen.

> **Status: SHOOT-READY — every claim approved by Allan 2026-08-04** (the tracker at the bottom records each decision and its basis). Refund policy: *return up to 25% of the order unopened, refunded 100%* — cleared 2026-08-03, site copy aligned via PR #359. Q10 timing: **30+ days, push ordering as early as possible.** Verified against live code, published pages, and the package calculator.

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

*On-screen:* "$25–45 per person (industry averages) · 100 guests = $2,500–$4,500 (+ service + gratuity)". · *B-roll:* NEED — venue bar with a bartender working; a check presenter / invoice prop.

## Q4 — "Open bar vs buying your own: the real math" · 1:44–2:20 · **ALLAN ON CAMERA moment #2** (12 sec, standing beside a full delivery)

**The opinion: our most expensive package costs what a venue's cheapest open bar costs.**

> **[Allan, to camera]:** "This is the whole video in one sentence. Our most expensive wedding package is twenty-six dollars a person. A venue's *cheapest* open bar is about twenty-five."
> **[VO resumes]:** "Our tiers run thirteen to twenty-six dollars a head — that's thirteen hundred to twenty-six hundred for a hundred guests, all in. And that's not a teaser rate: price out the middle package for a hundred guests and five hours — champagne toast included — and it comes out just under eighteen hundred dollars. The venue bills twenty-five hundred to forty-five hundred for the same crowd. Same guests, same five hours, same drinks in their hands — the difference is that you're buying bottles at retail instead of renting pours at a markup. You still need bartenders — budget for those separately, and hire good ones. But the alcohol itself is the single easiest line item to cut in half without a single guest noticing."

*On-screen:* side-by-side bars — "Venue open bar $25–45/pp" vs "Party On $13–26/pp", then a receipt-style card: "Real math: 100 guests · 5 hrs · mid package, toast incl. = $1,773". Small print: "bartenders billed separately." · *B-roll:* HAVE — delivery handoff, van, cases going in. · *Evidence: published tiers on /weddings ($13/$16/$20/$23/$26 per person); $1,773 = calculateWeddingPackage(standard-bar, 100 guests, 5 hrs, toast incl.) at 2026-08-04 config prices — the 4-hour variant is $1,560; open-bar range per Zola/Curated/EventWorks (industry averages) — claims #1 ✅.*

## Q5 — "What's the right liquor, wine, and beer split?" · 2:20–2:46

**The opinion: forty percent wine. Weddings are a wine event — but the signature cocktail is where the personality goes.**

> "Thirty percent spirits, forty percent wine, thirty percent beer for a full bar. Doing beer and wine only? Go fifty-five wine, forty-five beer. And here's what we see over and over at Austin weddings: a margarita or an old fashioned as the signature cocktail, prosecco, sauvignon blanc and pinot noir carrying the night, and Austin Beerworks variety packs and Shiner in the coolers. Weddings are wine-first. Bachelor parties are seltzer-first. Do not plan a wedding bar like a bach party."

*On-screen:* pie chart 30/40/30, then the list: "Margaritas · Old Fashioneds · Prosecco · Sauv Blanc · Pinot Noir · ABW Variety · Shiner". · *B-roll:* HAVE — wine and prosecco bottle shots, pour close-ups. NEED — margarita + old-fashioned build close-ups. · *Evidence: splits from DRINK_MIX_FULL_BAR in calculations.ts; drink list = operator observation (Allan, 2026-08-04), deliberately anecdotal — the n=15 pull corroborates the wines and the margarita bases (Espolon/Lunazul) — claims #3 ✅.*

## Q6 — "Who pays for the alcohol at a wedding?" · 2:46–3:06

**The opinion: whoever's name is on the venue contract — and settle it before you taste a single thing.**

> "Traditionally the bride's family covered the reception, and plenty of families still do. Realistically, in 2026, it's whoever is paying for the venue — often the couple. The useful version of this question isn't who *should* pay, it's who *decides*. Alcohol is usually five to ten percent of a wedding budget and it's the line everyone has an opinion about. Name the payer and the decision-maker in the same conversation, early, and you'll never have this fight."

*On-screen:* "Who pays ≠ who decides. Settle both early." · *B-roll:* HAVE — planning/paperwork b-roll, venue walkthrough.

## Q7 — "How much champagne do you need for the toast?" · 3:06–3:24

**The opinion: one glass per person, five glasses per bottle. That's twenty bottles for a hundred guests.**

> "One toast pour per guest, five pours per bottle. A hundred guests is twenty bottles. Don't fill the flute — a toast pour is half a normal glass, and half your guests will take one sip and set it down. Buy a couple extra bottles for the photos and the second toast nobody planned, and skip the expensive label for the toast itself. Nobody is tasting it. Save the good bottle for the two of you."

*On-screen:* "1 pour per guest · 5 pours per bottle · 100 guests = 20 bottles". · *B-roll:* NEED — champagne tower or toast moment; bottle pour close-up.

## Q8 — "Where do you buy wedding alcohol in bulk — and what happens to the leftovers?" · 3:24–3:52

**The opinion: buy from someone who'll take the unopened cases back — and know the cap before you over-order.**

> "Buy from a licensed retailer who delivers cold, on your timeline, to the venue — not from wherever's cheapest by the bottle. The thing that actually decides this is the leftovers policy, so get it in plain language before you order. Ours is: **drop the unopened cases back at our store the day after, and we refund a hundred percent of up to a quarter of your order — same day, no restocking fee.** So build in a cushion, but build in a twenty percent cushion, not a fifty percent one, because past that quarter it's yours. That's the whole reason you can afford to over-order a little instead of running dry at nine-thirty. Running out at a wedding is the one mistake you can't fix from the parking lot."

*On-screen:* "Bring back up to **25%** unopened → **100% refunded, same day**" then "Cushion by ~20%, not 50%." · *B-roll:* NEED — someone carrying unopened cases into the store counter (**not** a van pickup — the customer brings them back; see note). · *Policy confirmed by Allan 2026-08-03; mechanic per the live copy in `wedding-drink-calculator/sections/WhyYouNeedUs.tsx`.*

> ⚠ **Editor's note — do not shoot this as a pickup.** An earlier draft implied we collect the leftovers. We don't: the customer drops unopened cases back at the store the day after, and the refund is same-day with no restocking fee. Getting this wrong on camera would create an expectation ops has to eat.

## Q9 — "Do you need a bartender, a license, or insurance?" · 3:50–4:10

**The opinion: you need a bartender and they need to be certified. You don't need a license to have alcohol at your own wedding.**

> "You don't need a permit to serve alcohol at your own private wedding — but the second money changes hands for drinks, you do, so don't 'sell' anything. What you actually need is certified bartenders, and most Austin venues require it in writing along with a certificate of insurance. We're a TABC-licensed retailer, we're insured, our drivers are TABC-certified, and we card on delivery because the law says so. Ask your venue for their bar requirements in writing the week you book — not the week of."

*On-screen:* "Private wedding: no permit to serve · Selling drinks: permit required · Venue: ask for bar rules in writing." · *B-roll:* HAVE — TABC badge/licensing graphic, driver carding at a door. · *Evidence: /weddings + corporate lander FAQs (TABC-licensed, $1M insured, COI on request, drivers TABC-certified).*

## Q10 — "When do you order the alcohol?" · 4:10–4:26

**The opinion: at least a month out — and don't wait on the final RSVP count.**

> "Book the venue a year out, the bartenders three months out, and the alcohol at least a month out. That's not caution — **most of our wedding orders already come in thirty-plus days ahead**, and those are the smooth ones: the exact bottles you picked, delivered in the calm week, not the chaos week. Don't wait on final RSVPs. Get close and round up — the return policy covers the difference. Then run the free calculator and order from the number it gives you."

*On-screen:* timeline: venue −12mo · bartenders −3mo · **alcohol −30 days or more**. · *Evidence: operator count (Allan, 2026-08-04) — most weddings arrive via the bartender/private-party channel, untracked as weddings, typically 30+ days out; see claims table #4.*

## CTA — 4:26–4:42 · **ALLAN ON CAMERA #3** (van door, hand truck of cases)

> "We're Party On Delivery, and we've stocked more than a hundred weddings all over Austin — downtown venues, Hill Country ranches, Lake Travis, wherever you're getting married. Free calculator on our site does this math for your exact guest count in about a minute, and we'll deliver it cold to the venue on the day. Link's below. Congratulations — go enjoy it."

*On-screen:* partyondelivery.com/wedding-drink-calculator. *End screen: chapters menu (each question = a card) — feeds the shorts.*

---

## Claims sign-off tracker — ALL RESOLVED 2026-08-04

| # | Claim as scripted | What's behind it | Status |
|---|---|---|---|
| 1 | "Twenty-five to forty-five dollars a head" for a venue open bar | External sources only (Zola / Curated / EventWorks industry ranges, full range $15–90). Mitigations applied 2026-08-04: "(industry averages)" tag on the Q3 card, and Q4 now anchors on our first-party number — mid package, 100 guests, 5 hrs, toast included = **$1,773** (calculator-verified) — so the external range is context, not the load-bearing claim. | ✅ **APPROVED by Allan 2026-08-04** (with first-party anchor added) |
| 2 | Q8 — "return up to a quarter of your order unopened, 100% of your money back on what you return" | **RESOLVED by Allan 2026-08-03: the cap is on volume, not on the refund rate — up to 25% of the total order can come back, and that 25% is refunded in full.** ⚠ One assumption I made and you should correct if wrong: that **unopened** is a condition of the return. | ✅ **CLEARED — Q8 is shootable.** But see below: three pages on the site still describe this policy wrongly and need fixing before the video points people at them |
| 3 | Q5 drink list — was "top ten … led by prosecco, sauvignon blanc, pinot noir and cabernet" (an n=15 data claim) | **Softened per Allan 2026-08-04** to operator observation: "what we see over and over at Austin weddings" — margaritas, old fashioneds, prosecco, sauv blanc, pinot noir, ABW variety packs, Shiner. No "top ten"/data framing, so the thin n=15 no longer has to carry it (the pull still corroborates the wines + margarita bases; old fashioneds and ABW/Shiner are operator-observed). | ✅ **APPROVED by Allan 2026-08-04** (softened, list per Allan) |
| 4 | Q10 — "most of our wedding orders already come in thirty-plus days ahead" | **Allan's operator count, 2026-08-04**: most weddings arrive as bartender-referred private parties, untracked as weddings in the DB (~30 of ~50 in 2026), and those book 30+ days out. Tagged-channel medians are shorter (pay→delivery 10d, n=15; invoice-created 14.5d, n=6) but cover only the minority. Phrased as "**most**", not "median", to match the evidence we actually have. | ✅ **APPROVED by Allan 2026-08-04** — Q10 rewritten to push ordering as early as possible (the business goal); the stat stays as social proof |
| 5 | CTA — "we've stocked more than a hundred weddings all over Austin" | Allan 2026-08-04: 50+ weddings in 2026 alone → 100+ served all-time is comfortable. DB corroborates: 125 wedding-tagged dashboards (in a 2026-only table) + 6 paid wedding invoices, plus the untagged majority. Same conservative no-time-qualifier pattern as the bach script's approved "500+ parties". | ✅ **APPROVED by Allan 2026-08-04** |

**Verified, no sign-off needed:** the formula `guests × (hours + 1)`; the 30/40/30 and 55/45 splits; wine 5 / spirits 17 / champagne 5 per bottle; the 100/150/200 worked examples (recomputed for this script); the published `$13–$26/person` tiers; TABC-licensed + $1M insured + TABC-certified drivers + carding on delivery.

## ✅ Site copy contradiction — RESOLVED 2026-08-03 (PR #359, merged to main)

All four surfaces the earlier draft flagged now state the real policy: homepage FAQ + wedding card (`src/app/page.tsx`), the wedding-calculator FAQ, the corporate lander config (so the cap **does** apply to corporate), plus the hotels-resorts and venue pages. Standard language everywhere: **100% refund on up to 25% of your order, dropped back at the store unopened, same day, no restocking fees.** On-screen refund copy in this video can be checked against any of those live pages.

## Master shot list (NEED — one shoot day, ideally piggybacked on a real wedding delivery)

1. **Unopened cases carried into the store counter** (Q8 proof shot — the customer brings them back; do NOT stage this as a van pickup)
2. **Venue bar in service** — bartender pouring, guests at the rail (Q3/Q4; ask a partner venue, tag them)
3. **Reception wide shot** in full swing (Q1)
4. **Champagne toast / tower** (Q7)
5. **Delivery arrival at a venue** — van, hand truck, cases through a service door (Q4/CTA)
6. Allan's 3 on-camera pieces (hook / the $26-vs-$25 line / CTA) — under 60 sec total
7. Prop shots: venue invoice or check presenter (Q3), planning binder (Q6)
8. Q5 drink shots: margarita + old-fashioned builds, prosecco / sauv blanc / pinot noir bottles, ABW variety pack + Shiner (match the spoken list)

Existing b-roll assumed usable: delivery vans, warehouse, product close-ups, Austin skyline. **Consistency notes for editors:** champagne = 5 glasses/bottle everywhere (never 6–8); wine = 5, spirits = 17 — these now match every calculator on the site, so on-screen numbers can be checked against the live tools; always say bartenders are billed separately when the $13–26/pp tiers are on screen.

## Shorts cut map

Q2 (the 100/150/200 table) and Q4 (open bar vs buying your own) are the two flagship clips — the cost SERPs are where Short carousels surface. Q7 (champagne math) is the most screenshot-able. Bonus short-only, socials: **"Do wedding venues water down alcohol?"** (20/mo, spicy, no long-form chapter).
