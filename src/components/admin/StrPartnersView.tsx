'use client';

/**
 * Brian's Stuff → STR Partners tab.
 *
 * Thin wrapper around the generic PartnerProspectsView — data lives in
 * src/data/str-partner-prospects.json (research-compiled, logos resolved
 * via src/lib/partners/logo-scraper.ts, enrichment added per lead).
 */

import type { ReactElement } from 'react';
import PartnerProspectsView, {
  type Prospect,
  type ProspectViewConfig,
} from '@/components/admin/PartnerProspectsView';
import prospectsData from '@/data/str-partner-prospects.json';

const CONFIG: ProspectViewConfig = {
  title: 'STR Partners — Austin prospect list',
  intro:
    'Austin short-term-rental companies (~5+ homes) with everything needed to build their partner page and reach out.',
  sizeLabel: 'Homes',
  portfolioLabels: {
    heading: 'Portfolio',
    count: 'Properties',
    types: 'Types',
    locations: 'Locations',
    maxGroupSize: 'Largest groups',
  },
  csvCategory: 'LODGING',
  masterOutreach: {
    subject: 'Free guest perk for {{Company}} — stocked fridges, zero work for your team',
    body: `Hi {{FirstName}},

I'm Brian, founder of Party On Delivery — Austin's premium alcohol delivery and guest-concierge service. We partner with short-term rental companies like {{Company}} to give your guests a five-star arrival experience without adding a single task to your team's plate.

Here's everything a partnership includes:

• FREE DELIVERY FOR YOUR GUESTS — every guest who books through your link gets free alcohol delivery to their rental (a real perk you can advertise on your listings).
• PRE-ARRIVAL STOCKING — drinks iced, arranged, and waiting when guests walk in. We coordinate timing with your check-ins.
• YOUR OWN BRANDED PAGE — a co-branded page (your logo, your look) at partyondelivery.com/partners/{{slug}} that you drop into welcome emails, guidebooks, or listing descriptions.
• A PERSONAL PARTY DASHBOARD FOR EVERY GROUP — one click and each group gets their own private ordering dashboard: everyone in the party adds what they want, splits payment their own way, zero group-text math. Perfect for bachelorette and birthday groups.
• FULL CATALOG — spirits, beer, wine, seltzers, champagne, cocktail kits, mixers, bulk ice, and cups. Custom item requests honored whenever we can source them.
• SAME-DAY AND LAST-MINUTE — TABC-licensed, always on time, with money-back on unopened returns (up to 25% of the order) so groups can over-buy risk-free.
• YOU EARN ON EVERY ORDER — partners earn a commission on every guest order, tracked in your own partner portal where you can see each dashboard your guests create, how engaged they are, and what they ordered.
• ZERO LIFT — no inventory, no liability, no staff time. You share a link; we do everything else.

We already do this for Austin STR and boat-party operators, and guests consistently call it out in reviews.

Worth a 15-minute call this week? I can have your branded page live the same day.

Brian Hill
Founder, Party On Delivery
partyondelivery.com · (737) 371-9700`,
  },
};

export default function StrPartnersView(): ReactElement {
  return <PartnerProspectsView config={CONFIG} prospects={prospectsData as Prospect[]} />;
}
