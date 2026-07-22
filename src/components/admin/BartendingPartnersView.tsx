'use client';

/**
 * Brian's Stuff → Bartending Partners tab.
 *
 * Thin wrapper around the generic PartnerProspectsView — data comes from
 * the partner_prospects table (src/lib/partners/prospect-store.ts), fetched
 * by the server page and passed in as a prop.
 *
 * The bartender pitch differs from STR: we're not a guest perk, we're
 * their supply chain + referral loop — POD delivers the alcohol/ice/
 * mixers to their gigs (bartenders can't legally sell liquor in TX dry-
 * hire setups; clients must buy it), and we trade referrals both ways.
 */

import type { ReactElement } from 'react';
import PartnerProspectsView, {
  type Prospect,
  type ProspectViewConfig,
} from '@/components/admin/PartnerProspectsView';

const CONFIG: ProspectViewConfig = {
  title: 'Bartending Partners — Austin prospect list',
  intro:
    'Austin mobile-bartending, mobile-bar, and cocktail-catering companies with everything needed to build their partner page and reach out.',
  sizeLabel: 'Scale',
  portfolioLabels: {
    heading: 'Offering',
    count: 'Scale',
    types: 'Formats',
    locations: 'Service area',
    maxGroupSize: 'Event sizes',
  },
  csvCategory: 'BARTENDER',
  masterOutreach: {
    subject: "{{Company}} + Party On Delivery — we handle the alcohol so your bartenders just pour",
    body: `Hi {{FirstName}},

I'm Brian, founder of Party On Delivery — Austin's premium alcohol delivery service. Most Texas mobile bartenders run dry-hire: the client supplies the alcohol, you supply the magic. That handoff is where events go sideways — clients under-buy, forget ice, or show up with the wrong bottles for your menu.

We fix that for you, and pay you for it:

• YOUR CLIENTS ORDER FROM YOUR OWN BRANDED PAGE — a co-branded page (your logo, your look) at partyondelivery.com/partners/{{slug}}. Send it with every booking confirmation; your client orders exactly what your menu needs.
• SHOPPING LISTS THAT MATCH YOUR MENUS — we'll build your cocktail specs into recommended packages so clients buy the right bottles, mixers, and quantities the first time. Custom item requests honored whenever we can source them.
• DELIVERED TO THE VENUE, ICED, BEFORE YOU ARRIVE — spirits, beer, wine, champagne, seltzers, mixers, bulk ice, and cups, timed to your setup window. Same-day and last-minute covered, TABC-licensed.
• A GROUP DASHBOARD FOR PARTY CLIENTS — bachelorette and house-party groups get a private ordering page where everyone adds drinks and splits payment. No more chasing one host to collect for the bar.
• OVER-BUY PROTECTION — money-back on unopened returns (up to 25% of the order), so clients can stock generously without risk — which means your bar never runs dry mid-event.
• YOU EARN ON EVERY ORDER — commission on every client purchase through your link, tracked in your own partner portal (see every client dashboard, engagement, and order status).
• WE SEND YOU WORK TOO — our delivery customers constantly ask for bartenders. Partners get those referrals first.

We already partner with Austin bartending outfits like Cocktail Cowboys and Down To Riff, plus boat and vacation-rental operators.

Worth a 15-minute call this week? I can have your branded page live the same day.

Brian Hill
Founder, Party On Delivery
partyondelivery.com · (737) 371-9700`,
  },
};

export default function BartendingPartnersView({
  prospects,
}: {
  prospects: Prospect[];
}): ReactElement {
  return <PartnerProspectsView config={CONFIG} prospects={prospects} />;
}
