# Full Moon Party (Fri Aug 28) — outreach drafts

**STATUS: DRAFTS ONLY. Nothing here has been sent, scheduled, or wired to a provider.**
Every send below is a manual, human-triggered action. Written 2026-07-28.

**Landing page**: https://partyondelivery.com/full-moon-aug28
**Offer**: Fri Aug 28, 7–11 PM · Lake Travis · $79 flat (tax included) · taco bar included · BYOB via POD · adults 25+
**Sell-by math**: 32 tickets to sail, 50 advertised capacity. Deadline is **Fri Aug 21** (event−7d)
— if we're under 32 that morning, the cron postpones and everyone gets refunded.

---

## ⚠️ Read before sending anything

1. **Email consent gap.** Per project memory (`email_list_consolidation_2026_06`), consent status is
   unknown for the non-GHL portion of the ~14.8k list, which blocks cold sends under CAN-SPAM.
   The safe segment is **past POD customers and GHL contacts with a prior relationship**. Do not
   blast the full list on this.
2. **SMS.** A2P is approved but per `corelinq_crm_adoption_state` the new number can't send yet, and
   consent enforcement + the STOP import are prerequisites for any marketing SMS. Treat the SMS
   draft as GHL-only, to contacts who opted in.
3. **Nothing here is scheduled.** There is no cron, no queue, no draft sitting in a provider.

---

## 1. Email — past customers / opted-in list

**Subject line options** (A/B if you send in two waves):
- A: `The moon's full on the 28th. We got a boat.`
- B: `Friday Aug 28: sunset cruise, tacos, and a full moon over Lake Travis`
- C: `You, 49 other people, and a full moon on Lake Travis`

**Preview text**: `$79 flat. Tacos on us. Bring your own drinks — we’ll ice them.`

**Body:**

> Hey {{first_name}},
>
> On Friday, August 28th we're taking a 60-foot party boat out on Lake Travis for four hours, and
> the moon is doing us a favor: August 28th is the actual full moon, and it comes up over the water
> right after sunset. We'll be out there when it does.
>
> Here's the deal:
>
> - **7:00 PM** — cast off from the marina into golden hour
> - **7:55 PM** — sunset over the hills
> - **8:30 PM** — taco bar opens as the moon clears the ridge
> - **10:00 PM** — full dance floor, DJ Trey, peak glow
> - **11:00 PM** — back at the dock
>
> **$79 a ticket, flat — tax included.** That covers the cruise, the captain and crew, DJ Trey, a full taco bar, and
> water, ice and cups. Adults 25 and up.
>
> Drinks are the one thing we don't include — it's BYOB, and you order them ahead through us. We'll
> have your beer, wine, and mixers iced down in a cooler on board waiting for you at cast off.
>
> We need 32 people to sail and the boat holds 50. If we don't hit 32 by the 21st, it rolls to the
> next full moon and every ticket is refunded automatically — you don't have to do anything.
>
> [**Grab your ticket →**](https://partyondelivery.com/full-moon-aug28)
>
> Come with your people. It's better full.
>
> — Allan
> Party On Delivery
>
> *If you're drinking, please have a plan to get home. Coming as a group? Fetii's running 25% off
> with code **PartyOn**.*

**Footer must include**: physical mailing address + one-click unsubscribe (CAN-SPAM).

---

## 2. Follow-up bump — send ~Aug 17 only to non-openers/non-buyers

**Subject**: `Four days to fill the boat`

> Quick one — the Lake Travis full moon cruise on Friday the 28th needs 32 people to sail, and we
> decide on the 21st.
>
> {{tickets_sold}} spots are spoken for. $79 flat gets you four hours on the water, a taco bar, DJ Trey,
> and a full moon coming up over the lake. BYOB, and we ice your drinks for you.
>
> [**Ticket →**](https://partyondelivery.com/full-moon-aug28)
>
> If we come up short it rolls forward and you're refunded in full, so there's no risk in claiming a
> spot now.
>
> — Allan

*(`{{tickets_sold}}` is on `/ops/full-moon`. Only use this line if the number is flattering —
"3 spots are spoken for" reads worse than saying nothing.)*

---

## 3. SMS — GHL, opted-in contacts only

Keep under 160 chars where possible. Include STOP language per the A2P campaign.

**Announce:**
> Party On: Full moon cruise on Lake Travis, Fri Aug 28, 7-11pm. $79 w/ taco bar, BYOB. 50 spots.
> partyondelivery.com/full-moon-aug28 Reply STOP to opt out

**Bump (Aug 19–20):**
> Party On: Last call for the Aug 28 full moon cruise — we need 32 to sail & we decide Fri.
> partyondelivery.com/full-moon-aug28 Reply STOP to opt out

---

## 4. Social — organic

Per memory (`social_media_posting_state`) nothing is wired for automated posting, so these are for
manual posting.

**Instagram / Facebook caption:**
> FRIDAY AUGUST 28 🌕
>
> The moon's full and we've got a 60-foot boat on Lake Travis.
>
> 7pm cast off · sunset at 7:55 · taco bar when the moon clears the ridge · DJ Trey all night ·
> back at the dock at 11.
>
> $79 flat, tax included. Tacos on us. Drinks are BYOB and we'll ice them down for you.
>
> 50 spots, 25+. Link in bio.
>
> #austin #laketravis #fullmoon #atx #austinevents #boatparty

**Story frames** (3): (1) the moonrise-dance hero image + "AUG 28", (2) the schedule timeline,
(3) "50 spots" + link sticker.

---

## 5. Cheapest real distribution (no send required)

These are worth more than the email list given the consent problem:

- **Homepage / nav placement** — a strip or banner pointing at the event. The site already gets
  traffic; the Aug 1 page got 10 visitors because nothing on the site linked to it.
- **Premier Party Cruises cross-promo** — they're the co-brand and have their own audience.
- **The `/partners/*` pages** — partner audiences are already warm to boat events.
- **Existing group-order dashboards** — people who've booked boat parties are the exact buyer.

---

## Measurement (now actually wired)

After launch, the analytics hub has a **Full Moon** tab (`landing-pages.ts` key `full-moon`).
Watch: pageviews by source, `cta_click` by section (`hero` / `final_cta` / `services`), and
tickets sold on `/ops/full-moon`.

If the page gets real traffic and still doesn't convert, that's an offer/price problem.
If it gets no traffic again, that's a distribution problem — and this time the data will say which.
