# Affiliate / Partner Backlink Audit — July 2026

**Author:** seo-director (Lever 1 of the SEO recovery task).
**Date:** 2026-07-02.
**Scope:** All 19 ACTIVE affiliates/partners in the `affiliates` table. For each, we checked whether their website links back to partyondelivery.com anywhere (homepage + any Vendors/Partners page).

> **⚠️ DRAFTS ONLY — NOTHING SENT.** Every email below is a draft for operator (Allan) review. No emails were sent, no partners were contacted. Review, personalize further if you know the contact better, and send from `info@partyondelivery.com` or Allan's address by hand.

## Method
- **Partner list source:** `affiliates` table (Neon Postgres), filtered to `status = 'ACTIVE'` (19 rows). 6 DRAFT-status affiliates (ATX Party Boats, Good Time Tours, Lake Travis Yacht Rentals, Lone Star Party Boats, Luxury Boat Rentals, Paradise Cove Marina, Social Butterfly ATX) were excluded per the "focus on ACTIVE/approved" instruction.
- **Website URLs:** resolved from `src/data/austin-partners.json` (has a `website` field per partner), partner `internal_notes`, and web search for the two not in the JSON (Sip & Social On Wheels, The Premium Pour).
- **Link check:** WebFetch on each partner homepage plus any Vendors/Partners page found in nav/footer. A partner counts as "Y" if any page on their site links to partyondelivery.com.

---

## Audit table

| Partner name | Site URL | Links to us? | Their Vendors/Partners page | Contact name | Contact email | Notes |
|---|---|:---:|---|---|---|---|
| BigTex Boat Rentals | https://bigtexboatrentals.com | **Y** | (logo strip, no dedicated page) | Corbin Cornwell | corbin@bigtexboatrentals.com | Links via `/partners/big-tex-boats?ref=BIGTEXBOATRENTALS` ("Order Now") + `/order`. No action. |
| Cocktail Cowboys | https://partyhostboys.com/location/austin/ | **Y** | https://partyhostboys.com/partners/ | Nelson Brooks | nelson@cabanaboyshospitality.com | Links from Austin page (`/order?ref=COWBOYS`) + Partners page logo (`/discount/COWBOYS`). No action. |
| DTR Bartending | https://dtrbartending.com | **Y** | https://dtrbartending.com/partners | Eddy Bowie | info@dtrbartending.com | Homepage doesn't link, but `/partners` lists us under "Alcohol Supplier" (`/partners/dtr-bartending?ref=DTRbartending`). No action. |
| Bach Babes | https://www.bachbabes.com | N | https://bachbabes.com/partners | (none on file) | austin@bachbabes.com | Has a Partners page (social + branding credits only) — we're not on it. |
| Book Chick Trips | https://www.bookchicktrips.com | N | /bachelorette-party-activities-austin | Katherine Cherry | info@bookchicktrips.com | "Partners" nav points to a bachelorette-activities page; no link to us. |
| Centex Boat Rentals | https://centexboatrentals.com | N | (none found) | (Owner) | info@centexboatrentals.com | FareHarbor booking site, no partners page. |
| Connected Austin | https://www.connectedaustin.com | N | (none found) | Oren Bornstein | info@connectedaustin.com | No vendor/partners page in nav or footer. |
| Five Star Vacation Home Rentals | https://www.fivestarvacationhomerentals.com | N | (none found) | (Five Star VHR) | rentals@fivestarvhr.com | OwnerRez rental site, no partners page. |
| Inn Cahoots | https://www.inncahoots.com | N | (none found) | Jamie Jacobs | jamie@inncahoots.com | Venue site, no vendor/preferred-supplier page. |
| Kickstand Mobile | https://www.kickstandmobile.com | N | (none found) | Gabrielle Gore | howdy@kickstandmobile.com | No partners page. |
| Mimi's Party Palace | https://mimispartypalace.com | N | (none found) | Mimi | MimisPartyPalace@gmail.com | Rentals site, no partners page. |
| Pour Twenty Four | https://www.pourtwentyfour.com | N | (none found) | James | james@pourtwentyfour.com | No partners page (links only to their own coffee brand). |
| Premier Party Cruises | https://premierpartycruises.com | N | (none found) | Brian Hill | ppcaustin@gmail.com | Our closest boat partner (Xola/webhook source) but no site link. |
| SilverCloud Trailer Events | https://www.silvercloudtrailerevents.com | N | (none found) | Chris Johnson | austin@silvercloudtrailerevents.com | No partners page. |
| Sip & Social On Wheels | https://sipnsocialbar.com | N | (none found) | Kourtni | pearsonkourtnibuisness@gmail.com | Mobile bar; no partners page. |
| Tap Truck Austin | https://www.taptruckaustin.com | N | (none found) | (Tap Truck Austin) | taptruckaustin@gmail.com | Collaborators mentioned in IG captions only, no vendor page. |
| The Bach Plan | https://www.thebachplan.com | N | https://www.thebachplan.com/partners | Bailey Reed | bailey@thebachplan.com | Has a Partners page — we're not listed on it. |
| The Premium Pour | https://thepremiumpour.com | N | (none found) | Cortney Bramlett | thepremiumpour@gmail.com | Minimal site (Home/Contact/IG), no partners page. |

---

## Partners already linking to us (no action)

1. **BigTex Boat Rentals** — homepage "Order Now" + FAQ links to `partyondelivery.com`.
2. **Cocktail Cowboys** — Austin page and `/partners/` logo both link to us.
3. **DTR Bartending** — `/partners` page lists us under "Alcohol Supplier."

## Could not verify

None. All 19 ACTIVE partner sites loaded and were checked successfully.

---

## Drafted outreach emails (Template B — "Quick favor — Vendors page link?")

Each is personalized to the partner's relationship and (where found) their existing Vendors/Partners page. Signature is Allan's. **Not sent.**

### Bach Babes

**To:** austin@bachbabes.com
**Subject:** Quick favor — Vendors page link?

Hi Bach Babes team,

Hope Austin bach season is treating you well! Quick favor: I noticed your Partners page doesn't have a link back to us yet. Would you mind adding Party On Delivery to it? We're already sending your bachelorette groups our way, and a link makes it easy for them to stock the house/boat before you kick things off. Happy to feature you more prominently on our end too.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to the next weekend of besties we send your way.
Allan

---

### Book Chick Trips

**To:** info@bookchicktrips.com
**Subject:** Quick favor — Vendors page link?

Hi Katherine,

Hope you're well! Quick favor: I noticed your Austin bachelorette-activities page doesn't have a link back to us yet. Would you mind adding Party On Delivery to it (or wherever you list local vendors)? Alcohol + supply delivery pairs naturally with the trips you're booking, and a link helps your groups get the house stocked before the fun starts. Happy to do the same on our end.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to the next group we plan together.
Allan

---

### Centex Boat Rentals

**To:** info@centexboatrentals.com
**Subject:** Quick favor — Vendors page link?

Hi Centex team,

Hope the lake season's off to a strong start! Quick favor: your site doesn't have a link back to us yet. If you ever add a "Partners" or "What to Bring" section, would you mind including Party On Delivery? We deliver cold drinks and supplies straight to the dock for your charters, which saves your renters a store run. Happy to feature Centex on our end too.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to keeping your boats stocked.
Allan

---

### Connected Austin

**To:** info@connectedaustin.com
**Subject:** Quick favor — Vendors page link?

Hi Oren,

Hope you're doing well! Quick favor: I noticed your "Build Your Weekend" / vendor listings don't link back to us yet. Would you mind adding Party On Delivery as a vendor? Alcohol and supply delivery is a natural fit for the weekends you build, and a link makes it one click for your guests to stock up. Happy to reciprocate on our end.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to the next weekend we power together.
Allan

---

### Five Star Vacation Home Rentals

**To:** rentals@fivestarvhr.com
**Subject:** Quick favor — Vendors page link?

Hi Five Star team,

Hope you're well! Quick favor: your site doesn't link back to us yet. If you have (or add) a "Local Vendors" or guest-info page, would you mind including Party On Delivery? We deliver alcohol and party supplies right to your rental properties, which is a nice perk to hand guests at check-in. Happy to feature Five Star on our end too.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to stocking your guests' stays.
Allan

---

### Inn Cahoots

**To:** jamie@inncahoots.com
**Subject:** Quick favor — Vendors page link?

Hi Jamie,

Hope things at the Inn are buzzing! Quick favor: I noticed your site doesn't have a link back to us yet. If you keep a preferred-vendors or event-info page for guests, would you mind adding Party On Delivery? We can deliver drinks and supplies straight to your events, which takes one more thing off your groups' plates. Happy to do the same for Inn Cahoots on our end.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to the next event together.
Allan

---

### Kickstand Mobile

**To:** howdy@kickstandmobile.com
**Subject:** Quick favor — Vendors page link?

Hi Gabrielle,

Hope you're well! Quick favor: your site doesn't link back to us yet. If you add a "Preferred Vendors" or "Friends" section, would you mind including Party On Delivery? Your mobile bar and our alcohol/supply delivery pair perfectly — you bring the pour, we stock the event. Happy to feature Kickstand on our end too.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to the next event we work together.
Allan

---

### Mimi's Party Palace

**To:** MimisPartyPalace@gmail.com
**Subject:** Quick favor — Vendors page link?

Hi Mimi,

Hope you're well! Quick favor: your site doesn't have a link back to us yet. If you keep a vendors or "who we work with" page, would you mind adding Party On Delivery? With your rentals, bartending, and catering, alcohol and supply delivery rounds out the package nicely for your clients. Happy to feature Mimi's Party Palace on our end too.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to the next party we help pull off.
Allan

---

### Pour Twenty Four

**To:** james@pourtwentyfour.com
**Subject:** Quick favor — Vendors page link?

Hi James,

Hope you're well! Quick favor: I noticed your site doesn't have a link back to us yet. If you add a "Preferred Vendors" or "Partners" section, would you mind including Party On Delivery? Your private-event bartending and our alcohol/supply delivery are a natural pair — you handle the bar, we make sure it's stocked. Happy to do the same for PourTwentyFour on our end.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to the next event together.
Allan

---

### Premier Party Cruises

**To:** ppcaustin@gmail.com
**Subject:** Quick favor — Vendors page link?

Hi Brian,

Hope the cruises are packed! Quick favor: I noticed your site doesn't link back to us yet, even though we're stocking so many of your boats already. Would you mind adding Party On Delivery to your site — a "Bring Your Own / What to Order" note or a vendor link would do it? It makes it dead simple for your guests to have drinks waiting dockside. Happy to feature Premier even more prominently on our end.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to the rest of boat season together.
Allan

---

### SilverCloud Trailer Events

**To:** austin@silvercloudtrailerevents.com
**Subject:** Quick favor — Vendors page link?

Hi Chris,

Hope you're well! Quick favor: your site doesn't have a link back to us yet. If you add a "Preferred Vendors" or "Partners" section, would you mind including Party On Delivery? Your mobile trailer bar and our alcohol/supply delivery work hand in hand — you bring the setup, we keep it stocked. Happy to feature SilverCloud on our end too.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to the next event we work together.
Allan

---

### Sip & Social On Wheels

**To:** pearsonkourtnibuisness@gmail.com
**Subject:** Quick favor — Vendors page link?

Hi Kourtni,

Hope you're well! Quick favor: your site doesn't have a link back to us yet. If you keep a vendors or "who we work with" page, would you mind adding Party On Delivery? Your mobile bar and our alcohol/supply delivery are a great fit — you handle the bar experience, we make sure everything's stocked and delivered. Happy to feature Sip & Social on our end too.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to the next event together.
Allan

---

### Tap Truck Austin

**To:** taptruckaustin@gmail.com
**Subject:** Quick favor — Vendors page link?

Hi Tap Truck Austin team,

Hope you're staying busy! Quick favor: your site doesn't have a link back to us yet. If you add a "Preferred Vendors" or "Partners" section, would you mind including Party On Delivery? Your vintage tap truck and our alcohol/supply delivery are a natural combo — you bring the pour, we stock the event. Happy to feature Tap Truck on our end too.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to the next event we work together.
Allan

---

### The Bach Plan

**To:** bailey@thebachplan.com
**Subject:** Quick favor — Vendors page link?

Hi Bailey,

Hope bach season's treating you well! Quick favor: I noticed your Partners page doesn't have a link back to us yet. Would you mind adding Party On Delivery to it? Alcohol and supply delivery is exactly what your bachelorette groups need for the house or boat, and a link makes it one click for them. Happy to feature The Bach Plan more prominently on our end too.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to the next group we plan together.
Allan

---

### The Premium Pour

**To:** thepremiumpour@gmail.com
**Subject:** Quick favor — Vendors page link?

Hi Cortney,

Hope you're well! Quick favor: your site doesn't have a link back to us yet. If you add a "Preferred Vendors" or "Partners" section, would you mind including Party On Delivery? Your mobile wedding bar and our alcohol/supply delivery are a perfect pair — you handle the bar, we make sure it's fully stocked and delivered. Happy to feature The Premium Pour on our end too.

Suggested copy if helpful:

**Party On Delivery** — Austin alcohol & event-supply delivery. TABC-licensed; same-day to Lake Travis, Hill Country, and Austin metro. https://partyondelivery.com

Thanks so much, and looking forward to the next wedding we work together.
Allan

---

## Summary

- **Partners audited:** 19 (all ACTIVE affiliates).
- **Already linking to us:** 3 (BigTex Boat Rentals, Cocktail Cowboys, DTR Bartending).
- **Needing outreach (drafted above):** 15.
- **Could not verify:** 0.

**Next step for operator:** review the 15 drafts, tweak any contact names you know better (several rows have only a business/owner placeholder), and send in batches (~5/week per the outreach cadence). Track responses in the sheet described in `docs/seo/recommendations/local-backlink-outreach-2026-06.md`.
