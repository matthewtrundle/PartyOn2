import type { EventInvite } from './types';

/**
 * Demo event registry.
 *
 * Mockup mode — no database. Edit this file to add new demo events, then
 * visit /events/<slug>.
 *
 * Brian's 41st is the canonical demo: organizer page links here so we can
 * showcase the full end-to-end UX before wiring persistence.
 */
export const DEMO_EVENTS: Record<string, EventInvite> = {
  'brian-41st-birthday': {
    slug: 'brian-41st-birthday',
    title: "Brian's 41st Birthday Bash",
    hostName: 'Brian Hill',
    hostTagline: '+ The Hill Crew',
    startsAt: '2027-03-15T19:00:00-05:00',
    endsAt: '2027-03-16T01:00:00-05:00',
    timezone: 'America/Chicago',
    venue: 'The Hill House',
    address: '2002 East 7th Street, Austin, TX 78702',
    cityState: 'Austin, TX',
    tagline: 'One night. Lake views. Open bar (kind of).',
    description:
      "It's my 41st and we're going BIG. Backyard takeover, fire pit lit, sunset over the lake, and a curated drink menu you can order from before you show up — your bottles delivered ice-cold to the house with YOUR name on the box. Pay your own way, drink what you actually like, no Venmo chaser the next morning.",
    theme: 'birthday',
    status: 'live',
    heroImage: '/images/hero/bach-hero-rainey.webp',
    gallery: [
      '/images/gallery/sunset-champagne-pontoon.webp',
      '/images/services/bach-parties/bachelor-party-epic.webp',
      '/images/hero/bach-hero-brewery.webp',
      '/images/services/bach-parties/late-night-party-supplies.webp',
      '/images/hero/bach-hero-party-bus.webp',
    ],
    details: [
      { label: 'Dress code', value: 'Lake-house casual. Bring a jacket if it dips.' },
      { label: 'Parking', value: 'Free on-street + valet from 7pm. Uber drop at front gate.' },
      { label: 'Food', value: 'BBQ trailer 8pm – 10pm. Late-night tacos at midnight.' },
      { label: 'Music', value: 'Live DJ from 9pm. Outdoor speakers until 12am.' },
      { label: 'Bring', value: 'Just yourself. Order your drinks below — POD handles delivery.' },
    ],
    capacity: 80,
    rsvpDeadline: '2027-03-10T23:59:00-05:00',
    dayOfContactName: 'Brian',
    dayOfContactPhone: '(737) 371-9700',
    drinks: {
      enabled: true,
      mode: 'curated',
      blurb:
        "Pick what YOU want to drink. Pay your own way, delivered to the venue with your name on it. Bottles arrive ice-cold 30 min before showtime — no one's making a beer run.",
      perPersonHint: '$25–$60 per person is plenty. Drink what you love.',
      cutoffAt: '2027-03-14T18:00:00-05:00',
      curatedHandles: [
        'titos-handmade-vodka-750ml',
        'casamigos-blanco-750ml',
        'jameson-irish-whiskey-750ml',
        'truly-hard-seltzer-variety-12pk',
        'white-claw-variety-12pk',
        'topo-chico-hard-seltzer-12pk',
        'fresh-victor-lake-travis-ranch-water',
        'fresh-victor-keep-austin-spicy-marg',
      ],
    },
    sponsors: [
      { name: 'Party On Delivery', url: 'https://partyondelivery.com' },
      { name: 'Premier Party Cruises' },
    ],
  },
};

/**
 * Resolve a slug to an event, or null.
 *
 * The own-property check is load-bearing, not defensive noise: `slug` is
 * caller-supplied (it arrives on an unauthenticated POST and in a public URL),
 * and a bare `DEMO_EVENTS[slug]` inherits from Object.prototype — so
 * `getDemoEvent('constructor')` returns the Object constructor, which is
 * truthy. Every `if (!event)` guard downstream would pass and then read
 * `undefined` off it. Same class of bug as the source-taxonomy registry.
 */
export function getDemoEvent(slug: string): EventInvite | null {
  if (!Object.prototype.hasOwnProperty.call(DEMO_EVENTS, slug)) return null;
  return DEMO_EVENTS[slug] ?? null;
}

export function listDemoEvents(): EventInvite[] {
  return Object.values(DEMO_EVENTS);
}
