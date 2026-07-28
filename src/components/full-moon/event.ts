/**
 * Lake Travis Full Moon Party — event configuration (template variables).
 *
 * This is the single source of truth for everything that changes per event:
 * date, times, price, ticket counts, copy, and the image assets each slot uses.
 * Swap these values month-to-month; the components read from here.
 *
 * NOTE (2026-07-28): Rescheduled to Fri, Aug 28, 2026, 7-11 PM (a 4-hour cruise).
 * Aug 28 is the REAL August full moon — unlike the Aug 1 attempt (a ~88% waning
 * gibbous whose moon didn't rise until ~11 PM, after the dance floor peaked).
 * On the true full-moon date the moon rises within about half an hour of sunset,
 * so it clears the ridge DURING the cruise. That's the whole product now, and the
 * schedule + copy lean on it.
 *
 * Sunset in Austin on Aug 28 is ~7:55 PM (Aug 1's 8:26 PM was verified; sunset
 * moves ~1.15 min/day earlier through late August). ⚠ Worth a spot-check before
 * launch — it drives the schedule timeline.
 *
 * $79 ticket includes a TACO BAR (back in as of this round — it was dropped in
 * round 4 of the Aug 1 build), water, ice & cups. Still no drinks — those are
 * ordered ahead through Party On Delivery and iced in a cooler on board.
 *
 * Note that Aug 28 is a FRIDAY. The Aug 1 attempt was a Saturday.
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
   * - `disco`  → shimmering mirror-ball: a metallic sheen with a specular
   *              highlight that sweeps across the letters
   */
  tone: 'moon' | 'water' | 'groovy' | 'disco';
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
  /** Advertised capacity — what the public page shows ("/50", "Boat capacity: 50"). */
  capacity: number;
  /**
   * Real hard cap enforced server-side in the ticket route. Higher than the
   * advertised `capacity` so we keep a small safety buffer without changing the
   * number guests see. Never surfaced publicly.
   */
  hardCap: number;
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
  isoDate: '2026-08-28',
  dateLabel: 'Fri, Aug 28',
  shortDate: 'Fri Aug 28',
  castOff: '7:00 PM',
  backAtDock: '11:00 PM',
  sunset: '7:55 PM',
  price: 79,
  capacity: 50,
  hardCap: 60,
  minimum: 32,
  deadlineDays: 7,
  shareUrl: 'https://partyondelivery.com/full-moon-aug28',
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
   * "ON THE WATER" solid lake-cyan, "DANCE PARTY" the animated rainbow, and
   * "Y'ALL" the shimmering mirror-ball disco treatment.
   */
  headlineLines: [
    { text: 'FULL MOON', tone: 'moon' },
    { text: 'ON THE WATER', tone: 'water' },
    { text: 'DANCE PARTY', tone: 'groovy' },
    { text: "Y'ALL", tone: 'disco' },
  ] as HeadlineLine[],
  sub: 'Watch the sun set over Lake Travis, then dance as the full moon comes up over the water. This is what summer is for.',
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
  { key: 'Cast Off', value: '7:00', suffix: ' PM' },
  { key: 'Back at Dock', value: '11:00', suffix: ' PM' },
];

export const CAROUSEL: CarouselSlide[] = [
  {
    src: '/images/full-moon/moonrise-dance-hero.webp',
    step: 'Full moon',
    caption: 'The dance floor under a Lake Travis full moon',
    alt: 'A crowd dancing on a party boat deck as a full moon rises over Lake Travis',
  },
  {
    src: '/images/full-moon/confetti-dance.webp',
    step: 'The party',
    caption: 'Confetti, dancing, and your whole crew',
    alt: 'Guests dancing in a shower of confetti on a Lake Travis party boat',
  },
  {
    src: '/images/full-moon/crowd-dance.webp',
    step: 'On deck',
    caption: 'Hands up, all the way down the lake',
    alt: 'A packed crowd dancing with hands up on a Lake Travis party cruise',
  },
  {
    src: '/images/full-moon/party-crowd.webp',
    step: 'Your people',
    caption: 'Everybody aboard, everybody in',
    alt: 'A group of guests partying on the deck of a Lake Travis cruise',
  },
  {
    src: '/images/full-moon/lake-party.webp',
    step: 'Lake Travis',
    caption: 'The lake, the boat, the whole crew',
    alt: 'Guests enjoying a party cruise on Lake Travis',
  },
  {
    src: '/images/full-moon/champagne-moon-night.webp',
    step: 'Moonlight',
    caption: 'Pop the bubbles under a full moon',
    alt: 'Champagne-spray celebration on a night cruise under a full moon',
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
    icon: 'taco',
    title: 'Taco Bar Included',
    body: 'A full taco bar on board, included with every ticket. Come hungry.',
  },
  {
    icon: 'bottle',
    title: 'BYOB via POD',
    body: "Order beer, wine, spirits & mixers ahead — we'll have them iced in a cooler on board.",
  },
];

/** "What's on board" — a single tile with two lists. */
export const BOARD_INCLUDED: string[] = [
  'A four-hour cruise around Lake Travis with a captain & crew on board',
  'A full taco bar, included with your ticket',
  'Smooth beats by DJ Trey',
  'Water, ice & cups',
  'Life jackets & floating devices',
  'An absolutely incredible time',
];

export const BOARD_BRING: string[] = [
  'Drinks! This event is BYOB — please order through our partner, Party On Delivery (see below)',
  'A towel, if you like',
  "A plan to get home if you're drinking (FM 2769 is no joke)",
  'An appetite — the tacos are on us',
];

export const SCHEDULE: ScheduleStop[] = [
  { time: '7:00', label: 'Board at the marina. Cast off into the last warm light.', skyColor: '#f0913f' },
  { time: '7:55', label: 'Sunset over the hills. The sky does its best work.', skyColor: '#d24a6e' },
  { time: '8:30', label: 'Taco bar opens as the full moon clears the ridge.', skyColor: '#cfd9ee', moonlight: true },
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
  sold: 3,
};

export const GALLERY: GalleryItem[] = [
  { src: '/images/full-moon/premier-9895.webp', alt: 'Premier Party Cruises guests on Lake Travis', wide: true, tall: true },
  { src: '/images/full-moon/premier-7270.webp', alt: 'Friends celebrating on a Premier party cruise', tall: true },
  { src: '/images/full-moon/premier-289.webp', alt: 'Guests dancing on a Premier party cruise', tall: true },
  { src: '/images/full-moon/premier-7217.webp', alt: 'A group toasting on a Premier party cruise', tall: true },
  { src: '/images/full-moon/premier-273.webp', alt: 'A packed Premier party cruise on Lake Travis', wide: true },
  { src: '/images/full-moon/premier-7468.webp', alt: 'Guests partying on a Premier cruise on Lake Travis' },
  { src: '/images/full-moon/premier-7318.webp', alt: 'A Premier Party Cruises crowd on Lake Travis' },
];

export const FAQS: FaqItem[] = [
  {
    q: "What's the ticket price, exactly?",
    a: `$${EVENT.price} per person for the four-hour cruise, the captain & crew, DJ Trey, a full taco bar, and water, ice & cups. Drinks are the one thing that isn't included — it's BYOB, so order yours ahead through Party On Delivery and we'll have them iced in a cooler on board.`,
  },
  {
    q: 'Where do we board?',
    a: 'A Lake Travis marina — the exact dock and a pin drop go out by text two days before the cruise. Plan to arrive 15 minutes before the 7:00 PM cast-off.',
  },
  {
    q: 'Is there food?',
    a: "Yes — a full taco bar is included with every ticket, served on board once we're out on the water. Come hungry.",
  },
  {
    q: 'How do drinks work?',
    a: "Drinks aren't included — this is a BYOB cruise. Order beer, wine, spirits, and mixers through Party On Delivery ahead of time and we'll have them iced in a cooler on board, ready to go at cast off.",
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
  {
    q: 'Is the moon actually full that night?',
    a: 'Yes — August 28 is the real full moon, and it rises within about half an hour of sunset, so it comes up over the water while we’re out there. That’s the whole reason we picked this date.',
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

/** Open-graph / link-preview image: the moonrise dance-floor hero shot. */
export const OG_IMAGE = '/images/full-moon/moonrise-dance-hero.webp';

/**
 * Ticketing (real Stripe checkout). The ticket is a DRAFT Product created by
 * scripts/full-moon/upsert-ticket-product.mjs; the purchase endpoint is gated
 * by the FULL_MOON_TICKETS_LIVE env flag so nothing is publicly purchasable
 * until an operator flips it on.
 *
 * ONE PRODUCT PER EVENT. The handle is date-scoped so the roster, the sold
 * count, the guest list, and any batch refund only ever see THIS event's
 * orders. The Aug 1 attempt used `full-moon-party-ticket` (3 comps, 0 paid
 * sales); those rows stay put as history and are invisible here.
 * When you set up the next cruise: bump this handle, then re-run
 * upsert-ticket-product.mjs --apply.
 */
export const TICKET_PRODUCT_HANDLE = 'full-moon-party-ticket-aug28';
export const MAX_TICKETS_PER_ORDER = 8;
