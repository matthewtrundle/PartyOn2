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

/** One line of the hero headline + its color treatment. */
export interface HeadlineLine {
  text: string;
  /**
   * Color treatment:
   * - `moon`   → one solid moonlight color (like the moon)
   * - `water`  → one solid lake-cyan color (like the water)
   * - `groovy` → the animated rainbow gradient
   */
  tone: 'moon' | 'water' | 'groovy';
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
  backAtDock: '11:30 PM',
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
  /**
   * H1 rendered one line per entry. Per-line color: "FULL MOON" solid moonlight,
   * "ON THE WATER" solid lake-cyan, "DANCE PARTY" / "Y'ALL" the animated rainbow.
   */
  headlineLines: [
    { text: 'FULL MOON', tone: 'moon' },
    { text: 'ON THE WATER', tone: 'water' },
    { text: 'DANCE PARTY', tone: 'groovy' },
    { text: "Y'ALL", tone: 'groovy' },
  ] as HeadlineLine[],
  sub: 'Watch the sun set over Lake Travis. Dance under a bright, nearly-full moon. This is what summer is for.',
  primaryCta: `Get Your Ticket — $${EVENT.price}`,
};

/** Where we board (shown under the datestamp). Verify the exact street number before launch. */
export const LOCATION = {
  name: 'Anderson Mill Marina',
  address: '13993 FM 2769, Leander, TX 78641',
};

/** Datestamp cells (3-cell visual hierarchy). */
export const DATESTAMP: { key: string; value: string; suffix?: string }[] = [
  { key: 'The Date', value: EVENT.dateLabel },
  { key: 'Cast Off', value: '8:00', suffix: ' PM' },
  { key: 'Back at Dock', value: '11:30', suffix: ' PM' },
];

export const CAROUSEL: CarouselSlide[] = [
  {
    src: '/images/full-moon/moonrise-dance-hero.webp',
    step: 'Full moon',
    caption: 'The dance floor under a Lake Travis full moon',
    alt: 'A crowd dancing on a party boat deck as a full moon rises over Lake Travis',
  },
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
    body: 'Cast off at golden hour aboard a 60-foot party boat on Lake Travis. Adults only, 25 and up.',
  },
  {
    icon: 'moon',
    title: 'Dancing in the Moonlight',
    body: "Austin's best DJ and a floating dance floor — a one-of-a-kind Austin experience.",
  },
  {
    icon: 'bottle',
    title: 'Water, Ice & Cups',
    body: 'Life jackets and floating devices too — everything on board but the drinks.',
  },
  {
    icon: 'bottle',
    title: 'BYOB via POD',
    body: "Order beer, wine, spirits & mixers ahead — we'll have them iced in a cooler on board.",
  },
];

/** "What's on board" — a single tile with two lists. */
export const BOARD_INCLUDED: string[] = [
  'A three-and-a-half-hour cruise around Lake Travis with a captain & crew on board',
  'Smooth beats by DJ Trey',
  'Water, ice & cups',
  'Life jackets & floating devices',
  'An absolutely incredible time',
];

export const BOARD_BRING: string[] = [
  'Drinks! This event is BYOB — please order through our partner, Party On Delivery (see below)',
  'A towel, if you like',
  "A plan to get home if you're drinking (FM 2769 is no joke)",
];

export const SCHEDULE: ScheduleStop[] = [
  { time: '8:00', label: 'Board at the marina. Cast off into the last warm light.', skyColor: '#f0913f' },
  { time: '8:26', label: 'Sunset over the hills. The sky does its best work.', skyColor: '#d24a6e' },
  { time: '9:15', label: 'The moon takes the lake and the deck lights up.', skyColor: '#cfd9ee', moonlight: true },
  { time: '10:00', label: 'Full dance floor under the moon. Peak glow.', skyColor: '#7a3a86' },
  { time: '11:30', label: 'Back to the dock, glowing. Same time next moon.', skyColor: '#2a3566' },
];

export const DRINKS = {
  eyebrow: 'The bar, handled',
  headlineLead: 'DRINKS —',
  headlineTail: 'ORDER AHEAD & CHILL.',
  body: "Party On Delivery is how Austin stocks the boat. Order beer, wine, spirits, and mixers, and we'll have it in a cooler on board on ice, ready to go at cast off.",
  cta: 'Order Now',
};

/** "Very important" safety note, shown between the tickets and gallery sections. */
export const SAFETY = {
  title: 'Very important',
  body: 'If you will be drinking, please have a plan to get home.',
  fetiiLead: 'Coming with a group? We recommend',
  fetiiPartner: 'Fetii',
  fetiiMid: '— use our discount code',
  fetiiCode: 'PartyOn',
  fetiiTail: 'for 25% off.',
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
  { src: '/images/full-moon/confetti-dance.webp', alt: 'Guests dancing in a shower of confetti on a Lake Travis party boat', wide: true, tall: true },
  { src: '/images/full-moon/crowd-dance.webp', alt: 'A packed crowd dancing with hands up on a Lake Travis party cruise' },
  { src: '/images/full-moon/champagne-moon-night.webp', alt: 'Champagne-spray celebration on a night cruise under a full moon' },
  { src: '/images/full-moon/lake-party.webp', alt: 'Guests enjoying a party cruise on Lake Travis', wide: true },
  { src: '/images/full-moon/party-crowd.webp', alt: 'A group of guests partying on the deck of a Lake Travis cruise' },
];

export const FAQS: FaqItem[] = [
  {
    q: "What's the ticket price, exactly?",
    a: `$${EVENT.price} per person for the three-and-a-half-hour cruise, the captain & crew, DJ Trey, and water, ice & cups. It's BYOB — order your drinks ahead through Party On Delivery and we'll have them iced in a cooler on board.`,
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
  legal: '© 2026 Party On Delivery LLC · TABC Licensed · Adults 25+ only · Drink responsibly',
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
