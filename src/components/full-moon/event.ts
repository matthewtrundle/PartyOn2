/**
 * Lake Travis Full Moon Party — event configuration (template variables).
 *
 * This is the single source of truth for everything that changes per event:
 * date, times, price, ticket counts, copy, and the image assets each slot uses.
 * Swap these values month-to-month; the components read from here.
 *
 * NOTE (2026-07-07): First event is Sat, Aug 1, 2026, 8-11 PM (a 3-hour cruise).
 * Verified: sunset in Austin on Aug 1 is 8:26 PM. Aug 1 is a ~88%-lit waning
 * gibbous (the actual August full moon is Aug 28), so the datestamp intentionally
 * shows Date / Cast Off / Back at Dock rather than a precise moonrise time.
 * $59 ticket includes light bites, water + ice on board. No dinner, no drinks —
 * drinks are ordered ahead through Party On Delivery (iced in a cooler on board).
 */

/** A single hero-carousel slide. */
export interface CarouselSlide {
  /** Public path under /public, or null to show the gradient placeholder. */
  src: string | null;
  /** Short neon step label (e.g. "Golden hour"). */
  step: string;
  /** Fraunces italic caption line. */
  caption: string;
  /** Alt text for the photo. */
  alt: string;
}

/** A quick-fact card. */
export interface FactItem {
  icon: 'sun' | 'moon' | 'taco' | 'bottle';
  title: string;
  body: string;
}

/** A "what's included" card. */
export interface IncludedItem {
  icon: 'boat' | 'taco' | 'dj' | 'lights' | 'people' | 'captain';
  title: string;
  body: string;
}

/** A schedule-timeline stop. */
export interface ScheduleStop {
  time: string;
  label: string;
  /** Sky color at that hour — fills the dot. */
  skyColor: string;
  /** The moon peak stop gets the glowing moon dot. */
  moonlight?: boolean;
}

/** A gallery cell. */
export interface GalleryItem {
  src: string | null;
  alt: string;
  /** Layout spans in the masonry grid. */
  wide?: boolean;
  tall?: boolean;
}

/** A FAQ entry. */
export interface FaqItem {
  q: string;
  a: string;
}

/** The full per-event config. */
export interface FullMoonEvent {
  /** ISO date of the event, for machine use. */
  isoDate: string;
  /** Human date shown in the datestamp / modal. */
  dateLabel: string;
  /** Short share-friendly date (e.g. "Sat Aug 1"). */
  shortDate: string;
  castOff: string;
  backAtDock: string;
  sunset: string;
  price: number;
  capacity: number;
  minimum: number;
  /** Days before the event the minimum must be met. */
  deadlineDays: number;
  shareUrl: string;
  ordersUrl: string;
}

/** Neon accent theme (per-event re-theming hook). Default: cyan + magenta. */
export const THEME = {
  neonA: '#22d3ee',
  neonB: '#e879f9',
  moonGlow: '#eaf2ff',
} as const;

export const EVENT: FullMoonEvent = {
  isoDate: '2026-08-01',
  dateLabel: 'Sat, Aug 1',
  shortDate: 'Sat Aug 1',
  castOff: '8:00 PM',
  backAtDock: '11:00 PM',
  sunset: '8:26 PM',
  price: 59,
  capacity: 50,
  minimum: 32,
  deadlineDays: 7,
  shareUrl: 'https://partyondelivery.com/full-moon',
  ordersUrl: '/order',
};

export const SHARE = {
  title: 'Lake Travis Full Moon Party',
  text: `Sunset cruise, moonrise dance party on Lake Travis — ${EVENT.shortDate}. Come with me?`,
  url: EVENT.shareUrl,
} as const;

/** Hero copy. */
export const HERO = {
  /** H1 rendered as two lines; `glow` gets the white glow span. */
  headlineLead: 'DANCE UNDER',
  headlineGlow: 'THE FULL MOON.',
  sub: 'Watch the sun set over Lake Travis. Dance under a bright, nearly-full moon. This is what summer is for.',
  primaryCta: `Get Your Ticket — $${EVENT.price}`,
} as const;

/** Datestamp cells (3-cell visual hierarchy). */
export const DATESTAMP: { key: string; value: string; suffix?: string }[] = [
  { key: 'The Date', value: EVENT.dateLabel },
  { key: 'Cast Off', value: '8:00', suffix: ' PM' },
  { key: 'Back at Dock', value: '11:00', suffix: ' PM' },
];

export const CAROUSEL: CarouselSlide[] = [
  {
    src: '/images/boat-heroes/boat-party-epic-sunset.webp',
    step: 'Golden hour',
    caption: 'Cast off as the sky turns to fire',
    alt: 'A party boat on Lake Travis at golden hour',
  },
  {
    src: '/images/hero/austin-skyline-night-lake.webp',
    step: 'Moonlight',
    caption: 'The moon takes the lake, the deck lights up',
    alt: 'Lake Travis at night under a bright sky',
  },
  {
    src: '/images/boat-heroes/boat-party-epic-cove.webp',
    step: 'On deck',
    caption: 'String lights, deck lounge, room to roam',
    alt: 'Guests gathered on the deck of a party boat',
  },
  {
    src: '/images/hero/neon-nights-hero.webp',
    step: 'Moonlit floor',
    caption: 'Dance under a full moon on the water',
    alt: 'A neon-lit dance floor at night',
  },
];

export const FACTS: FactItem[] = [
  {
    icon: 'sun',
    title: 'Sunset Cruise',
    body: 'Cast off at golden hour aboard a 100-ft party boat on Lake Travis.',
  },
  {
    icon: 'moon',
    title: 'Timed to the Moon',
    body: "Once a month, the moon is full and we're on the water beneath it.",
  },
  {
    icon: 'taco',
    title: 'Light Bites Included',
    body: 'Chips, salsa & dips, plus water and ice on board. No dinner — eat beforehand.',
  },
  {
    icon: 'bottle',
    title: 'Drinks via POD',
    body: "Order beer, wine, spirits & mixers ahead — we'll have them iced in a cooler on board.",
  },
];

export const INCLUDED: IncludedItem[] = [
  {
    icon: 'boat',
    title: '3 Hours on a 100-ft Boat',
    body: 'A full sunset-to-moonlight cruise on Lake Travis with room to roam, lounge, and dance.',
  },
  {
    icon: 'taco',
    title: 'Light Bites Included',
    body: 'Chips, salsa, and dips to nibble on — plus water and ice on board. No dinner, so we recommend eating beforehand.',
  },
  {
    icon: 'dj',
    title: 'Moonlit Dance Deck',
    body: 'A moonlit dance deck and feel-good beats by DJ Vic — easy at sunset, full tilt once the moon is up. String lights overhead, soft seating along the rail.',
  },
  {
    icon: 'people',
    title: '50 of Your Soon-to-Be Favorites',
    body: 'Capped at 50 guests. Big enough for a party, small enough to actually meet people. Bring your crew and mingle!',
  },
  {
    icon: 'captain',
    title: 'Captained by Premier Party Cruises',
    body: 'A licensed crew runs the boat. You just have to show up at golden hour.',
  },
];

export const SCHEDULE: ScheduleStop[] = [
  { time: '8:00', label: 'Board at the marina. Cast off into the last warm light.', skyColor: '#f0913f' },
  { time: '8:26', label: 'Sunset over the hills. The sky does its best work.', skyColor: '#d24a6e' },
  { time: '9:15', label: 'The moon takes the lake and the deck lights up.', skyColor: '#cfd9ee', moonlight: true },
  { time: '10:00', label: 'Full dance floor under the moon. Peak glow.', skyColor: '#7a3a86' },
  { time: '11:00', label: 'Back to the dock, glowing. Same time next moon.', skyColor: '#2a3566' },
];

export const DRINKS = {
  eyebrow: 'The bar, handled',
  headlineLead: 'DRINKS —',
  headlineTail: 'ORDER AHEAD & CHILL.',
  body: "Party On Delivery is how Austin stocks the boat. Order beer, wine, spirits, and mixers, and we'll have it in a cooler on board on ice, ready to go at cast off.",
  cta: 'Order Now',
};

/**
 * Threshold widget state. For the preview this is a static snapshot — production
 * derives `sold` from the live count endpoint (working while sold < min; met
 * once sold >= min). `cancelled` is a manual override for a postponed date.
 */
export const THRESHOLD = {
  state: 'working' as 'working' | 'met' | 'cancelled',
  sold: 26,
};

export const GALLERY: GalleryItem[] = [
  { src: '/images/boat-heroes/boat-party-epic-night.webp', alt: 'Boat party at night on Lake Travis', wide: true, tall: true },
  { src: '/images/lake-travis/devils-cove-party.webp', alt: 'Boats rafted together at Devils Cove' },
  { src: '/images/hero/neon-nights-hero.webp', alt: 'Neon-lit dance floor' },
  { src: '/images/boat-heroes/boat-party-epic-sunset.webp', alt: 'Party boat at sunset', wide: true },
  { src: '/images/services/boat-parties/multiple-yachts-party.webp', alt: 'Multiple yachts at a lake party' },
  { src: '/images/lake-travis/the-oasis-sunset.webp', alt: 'Sunset over Lake Travis at The Oasis' },
];

export const FAQS: FaqItem[] = [
  {
    q: "What's the ticket price, exactly?",
    a: `$${EVENT.price} per person. That covers the 3-hour cruise, the DJ, and light bites (chips, salsa & dips) with water and ice. Drinks are ordered separately through Party On Delivery — we ice them in a cooler on board.`,
  },
  {
    q: 'Where do we board?',
    a: 'A Lake Travis marina — the exact dock and a pin drop go out by text two days before the cruise. Plan to arrive 15 minutes before the 8:00 PM cast-off.',
  },
  {
    q: 'How do drinks work?',
    a: "No drinks or dinner are included. Order beer, wine, spirits, and mixers through Party On Delivery ahead of time and we'll have them iced in a cooler on board, ready to go at cast off.",
  },
  {
    q: "What happens if it doesn't fill up?",
    a: `We need ${EVENT.minimum} guests to cast off. If we're short ${EVENT.deadlineDays} days out, the cruise rolls to the next full moon and every ticket is refunded in full — you don't have to do anything.`,
  },
  {
    q: 'What if the weather turns?',
    a: 'Safety calls are the captain’s. If the lake isn’t safe, we reschedule to the next available full-moon date or refund you in full — your choice.',
  },
  {
    q: 'Is it every month?',
    a: 'Once a month, timed to the full moon, all summer long. Miss one and the next is never more than a few weeks away.',
  },
];

export const FOOTER = {
  editorial: 'Cast off at golden hour. Come back glowing.',
  legal: '© 2026 Party On Delivery LLC · TABC Licensed · Must be 21+ · Drink responsibly',
  legalNote: 'Sunset & moonrise times are forecasts and may shift slightly.',
};

/** Section anchor ids used by the nav. */
export const SECTIONS = {
  top: 'top',
  facts: 'facts',
  included: 'included',
  schedule: 'schedule',
  tickets: 'tickets',
  gallery: 'gallery',
  faq: 'faq',
} as const;

/** Open-graph image for the preview (existing asset; regenerate per event at launch). */
export const OG_IMAGE = '/images/hero/austin-skyline-night-lake.webp';

/**
 * Ticketing (real Stripe checkout). The ticket is a DRAFT Product created by
 * scripts/full-moon/upsert-ticket-product.mjs; the purchase endpoint is gated
 * by the FULL_MOON_TICKETS_LIVE env flag so nothing is publicly purchasable
 * until an operator flips it on.
 */
export const TICKET_PRODUCT_HANDLE = 'full-moon-party-ticket';
export const MAX_TICKETS_PER_ORDER = 8;
