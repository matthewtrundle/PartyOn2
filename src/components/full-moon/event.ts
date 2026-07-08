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
  /** The featured (taco) card gets elevated treatment + pill. */
  featured?: boolean;
  pill?: string;
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
  price: 69,
  capacity: 50,
  minimum: 32,
  deadlineDays: 7,
  shareUrl: 'https://partyondelivery.com/full-moon',
  ordersUrl: '/order',
};

export const SHARE = {
  title: 'Lake Travis Full Moon Party',
  text: `Sunset cruise, moonrise dance party, tacos on deck — ${EVENT.shortDate} on Lake Travis. Come with me?`,
  url: EVENT.shareUrl,
} as const;

/** Hero copy. */
export const HERO = {
  eyebrow: 'Lake Travis · Once a month, when the moon is full',
  /** H1 rendered as two lines; `glow` gets the white glow span. */
  headlineLead: 'DANCE UNDER',
  headlineGlow: 'THE FULL MOON.',
  sub: 'Watch the sun set over Lake Travis. Dance under a bright, nearly-full moon. This is what summer is for.',
  primaryCta: `Get Your Ticket — $${EVENT.price}`,
  secondaryCta: 'See the Night',
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
    caption: 'Tacos hot off the griddle, included',
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
    title: 'Taco Bar Included',
    body: 'Tacos hot off the griddle, on deck. Built into every ticket — not an add-on.',
  },
  {
    icon: 'bottle',
    title: 'Drinks via POD',
    body: 'Order beer, wine and spirits straight to the dock through Party On Delivery.',
  },
];

export const VIBE_LINES: { text: string; accent?: string; tail?: string }[] = [
  { text: 'Cast off at golden hour.' },
  { text: 'Watch the sky turn ', accent: 'coral, then violet,', tail: ' then deep navy.' },
  { text: 'And when the moon owns the water,' },
  { text: 'the deck becomes a dance floor.' },
];

export const VIBE_PHOTO = {
  src: '/images/lake-travis/the-oasis-sunset.webp',
  alt: 'Lake Travis at blue hour from a boat deck',
};

export const INCLUDED: IncludedItem[] = [
  {
    icon: 'boat',
    title: '3 Hours on a 100-ft Boat',
    body: 'A full sunset-to-moonlight cruise on Lake Travis with room to roam, lounge, and dance.',
  },
  {
    icon: 'taco',
    title: 'The Taco Bar',
    body: 'Hot off the griddle, served on deck. Every ticket eats — no upsell, no surprise line item.',
    featured: true,
    pill: 'Included — not +$25',
  },
  {
    icon: 'dj',
    title: 'Live DJ & Dance Floor',
    body: 'A DJ reads the deck as the light fades — easy at sunset, full tilt once the moon is up.',
  },
  {
    icon: 'lights',
    title: 'String Lights & Deck Lounge',
    body: "Warm bulbs overhead, soft seating along the rail. A resort feeling that doesn't take itself too seriously.",
  },
  {
    icon: 'people',
    title: '50 of Your Soon-to-Be Favorites',
    body: 'Capped at 50 guests. Big enough for a party, small enough to actually meet people.',
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
  { time: '9:15', label: 'Tacos hit the deck and the moon takes the lake.', skyColor: '#cfd9ee', moonlight: true },
  { time: '10:00', label: 'Full dance floor under the moon. Peak glow.', skyColor: '#7a3a86' },
  { time: '11:00', label: 'Back to the dock, glowing. Same time next moon.', skyColor: '#2a3566' },
];

export const TACO = {
  src: '/images/gallery/sunset-champagne-pontoon.webp',
  alt: 'A warm spread on the deck of a boat at sunset',
  tag: 'Included with every ticket',
  headlineLead: 'TACOS, HOT OFF',
  headlineTail: 'THE GRIDDLE.',
  body: "Right as the moon takes the lake, the griddle fires up on deck. Real tacos, made on the boat, handed to you warm — no line item, no add-on, no catch. It's the brightest light on the water and it's already yours.",
};

export const DRINKS = {
  eyebrow: 'Bring your own bar, handled',
  headlineLead: 'DRINKS, DELIVERED',
  headlineTail: 'TO THE DOCK.',
  body: "Party On Delivery is how Austin stocks the boat. Order beer, wine, spirits, mixers and ice, and we'll have it dockside before you cast off — cold, no markup, no corkage.",
  note: "A quick heads-up, friend to friend: outside alcohol can't come aboard — it's a Coast Guard rule the captain has to keep. Ordering through POD ahead of time is the easy way to make sure your drinks are waiting at the dock.",
  cta: 'Order Drinks from Party On Delivery',
};

/**
 * Threshold widget state. For the preview this is a static snapshot — production
 * should wire `sold` to real ticket data and derive `state` from it.
 * (working while sold < min before deadline; met once sold >= min; cancelled if
 * sold < min at deadline or on a weather call.)
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
    a: `$${EVENT.price} per person. That covers the 3-hour cruise, the DJ, and the taco bar. Drinks are the only thing ordered separately, through Party On Delivery.`,
  },
  {
    q: 'Where do we board?',
    a: 'A Lake Travis marina — the exact dock and a pin drop go out by text two days before the cruise. Plan to arrive 15 minutes before the 8:00 PM cast-off.',
  },
  {
    q: 'Can I bring my own drinks?',
    a: "Outside alcohol can't come aboard — it's a Coast Guard rule the captain has to keep. Order through POD ahead of time and your drinks will be waiting at the dock, cold and markup-free.",
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
  vibe: 'vibe',
  included: 'included',
  schedule: 'schedule',
  tickets: 'tickets',
  gallery: 'gallery',
  faq: 'faq',
} as const;

/** Open-graph image for the preview (existing asset; regenerate per event at launch). */
export const OG_IMAGE = '/images/hero/austin-skyline-night-lake.webp';
