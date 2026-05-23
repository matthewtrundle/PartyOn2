import type { LandingConfig } from '../types';

// TODO(premier-wedding-photos): swap all hero/package imagery below for
// wedding-specific Premier shots (ceremony on deck, rehearsal dinner on
// boat, brunch on boat). Existing Premier marina/exterior images are
// placeholders. Operator to deliver replacements when Premier provides them.
const PREMIER_HERO = '/images/partners/premierpartycruises-hero.webp';
const PREMIER_TESTIMONIAL = '/images/partners/premierpartycruises-testimonials-bg.jpg';
const SUNSET_DECK = '/images/gallery/sunset-champagne-pontoon.webp';
const HILL_COUNTRY_BAR = '/images/services/weddings/outdoor-bar-setup-travis.webp';

const PHONE_DISPLAY = '(737) 371-9700';

/**
 * Boat-as-Wedding-Venue landing config (WS2 of the wedding cluster build).
 *
 * Targets the VALUE-SEGMENT wedding-venue keyword cluster ("cheap", "small",
 * "intimate", "budget", "affordable" austin wedding venues). NOT the head
 * term "austin wedding venues" — that intent belongs to venue directories.
 *
 * Position Premier Party Cruises boats as a venue for the WHOLE weekend:
 * ceremony, rehearsal dinner, welcome reception, morning-after brunch,
 * wedding photography, post-ceremony getaway cruise. Every visit funnels
 * two ways: book the boat (Premier referral) + book alcohol (Party On).
 */
export const weddingVenueBoatsConfig: LandingConfig = {
  slug: 'austin-wedding-venue-boats',
  metaTitle:
    'Austin Wedding Venue Boats | Small, Intimate, Affordable Lake Travis Weddings | Party On Delivery',
  metaDescription:
    "Cheap, small, and intimate wedding venues in Austin. Premier Party Cruises boats as your venue — ceremony, rehearsal, brunch, photography — paired with TABC-licensed alcohol delivery.",
  ogImage: PREMIER_HERO,

  theme: {
    primary: '#0B74B8',           // brand-blue — lake-water tone
    primaryHover: '#0a5a8f',
    primaryText: '#FFFFFF',
    navy: '#0B2540',
    cream: '#F4F0E6',             // warm ivory
    blue: '#0B74B8',
  },
  eventLabel: 'AUSTIN WEDDING VENUE BOATS',
  audienceTitleCase: 'Wedding On The Lake',

  heroEyebrow: 'AUSTIN WEDDING VENUE BOATS — LAKE TRAVIS',
  heroHeadline: 'Small. Intimate.',
  heroHeadlineAccent: 'Affordable. On The Water.',
  heroSubhead:
    "Looking for a cheap, small, or non-traditional wedding venue in Austin? Premier Party Cruises boats are a venue for the whole weekend — ceremony, rehearsal dinner, brunch, photography. Paired with Austin's TABC-licensed alcohol delivery.",
  heroBullets: [
    'Cheap, small, intimate — venue from $1,500',
    'Ceremony + rehearsal + brunch on the water',
    'Premier Party Cruises — 5-star Lake Travis fleet',
    'Pair with Party On bar service for one-stop weekend',
  ],
  heroImage: PREMIER_HERO,
  heroTrustBadges: ['✓ TABC-licensed bar', '✓ 5-star Premier fleet', '★ Austin\'s lake-venue specialists'],

  trustStats: [
    { stat: '$1,500+', label: 'Venue from' },
    { stat: '20-80', label: 'Guest sweet spot' },
    { stat: '5.0★', label: 'Premier rating' },
    { stat: 'TABC', label: 'Bar licensed' },
  ],

  painHeadline: "Wedding venues in Austin start at $8,000. Boats start at $1,500.",
  painBody:
    "Most Austin wedding directories list venues sized for 150+ guests at $8K–$20K. If you want a small, intimate, or budget-friendly wedding, those directories don't help. Premier Party Cruises boats fit 20-80 guests on the water — ceremony, dinner, dancing — at a fraction of land-venue pricing. We handle the bar; they handle the boat.",

  packagesEyebrow: 'BOATS AS VENUE — WHOLE WEEKEND PACKAGES',
  packagesHeadline: 'Ceremony to brunch. All on the water.',
  packagesBlurb:
    'Each package pairs a Premier boat charter with Party On bar service. Small ceremony packages start at $1,500 boat + bar. Multi-day packages cover the entire wedding weekend.',
  packages: [
    {
      name: 'Ceremony On The Lake',
      price: '$1,899+',
      save: 'Small wedding',
      serves: 'Ceremony + 2-hour reception for 20-30',
      blurb: 'For elopements, micro-weddings, vow renewals. Premier captain, deck setup, champagne toast bar.',
      items: [
        '2-hour boat charter (Premier)',
        'Captain + crew',
        'Toast champagne (Veuve)',
        'Sparkling wine + select beers',
        'TABC bar — drinks for 30',
      ],
      image: SUNSET_DECK,
    },
    {
      name: 'Wedding Weekend On The Water',
      price: '$5,999+',
      save: 'Full weekend',
      serves: '2 days, 40-60 guests',
      blurb: 'Rehearsal dinner on the boat, ceremony on the deck the next day, brunch cruise the morning after. One boat, one weekend.',
      items: [
        '3 separate Premier charters (rehearsal, ceremony, brunch)',
        'Full open bar across all 3 events',
        'Wedding-party getaway cruise after ceremony',
        'Coordinator across both companies',
        'Single invoice — Premier + Party On combined',
      ],
      image: PREMIER_TESTIMONIAL,
      featured: true,
    },
    {
      name: 'Photography & Sunset Cruise',
      price: '$1,499',
      save: '90 minutes',
      serves: 'Photo cruise for 10-20',
      blurb: 'Wedding photography location + sunset golden-hour cruise. Add for the post-ceremony getaway.',
      items: [
        '90-minute Premier sunset cruise',
        'Champagne for the wedding party',
        'Photographer-friendly deck access',
        'Photo-ready setups (florals optional)',
        'Cooler bar for guests',
      ],
      image: HILL_COUNTRY_BAR,
    },
  ],
  customLine:
    "Building a multi-day wedding weekend on the lake? Call us — Premier and Party On coordinate together.",

  stepsHeadline: 'Two companies. One weekend. One invoice.',
  steps: [
    {
      n: '1',
      title: 'Tell us the dates',
      body: 'Pick your dates and event list. Ceremony only? Rehearsal + ceremony + brunch? We sync with Premier to lock the boat schedule.',
      shortBody: 'Lock the dates.',
    },
    {
      n: '2',
      title: 'Combined quote',
      body: 'Itemized quote covering Premier boat charters and Party On bar service. One number, two companies, no surprises.',
      shortBody: 'Quote + lock.',
    },
    {
      n: '3',
      title: 'Cold drinks. Coordinated arrivals.',
      body: "Premier handles the captain, fuel, and dock. Party On handles the bar, ice, glassware. Both arrive on time at each event.",
      shortBody: 'Coordinated weekend.',
    },
  ],

  venuesEyebrow: 'WHERE PREMIER BOATS LAUNCH',
  venuesHeadline: 'Every Lake Travis marina. Hill Country reachable.',
  venues: [
    { area: 'Lake Travis — Hurst Harbor', detail: 'Premier home dock, easy guest access' },
    { area: 'Lake Travis — Volente / Lakeway', detail: 'Quieter sunset venues' },
    { area: 'Lake Austin', detail: 'Smaller boats, downtown access' },
    { area: 'Hill Country lake estates', detail: 'Private docks coordinated case-by-case' },
    { area: 'Marina pickup + boat to ceremony', detail: 'Off-water ceremony, on-water reception' },
    { area: 'Multi-marina logistics', detail: 'Different boats for different events of the weekend' },
  ],
  venuesImage: PREMIER_HERO,

  reviewsEyebrow: '★★★★★ 5.0 ON GOOGLE',
  reviewsHeadline: 'The cheaper, smaller wedding venue Austin doesn\'t list.',
  reviews: [
    {
      quote:
        "We had 32 people on a Premier boat for the ceremony and 12 closest family for brunch the next morning. Total venue cost was less than 1 night at the Driskill. Party On stocked both — bubbles for the toast, mimosas for brunch.",
      author: 'Cassidy + Marcus',
      detail: 'Lake Travis micro-wedding, October 2025',
    },
    {
      quote:
        "Our directories all sent us to venues priced for 150 guests. We were 24. Premier put us on the water for 4 hours, Party On handled the bar, and we got the wedding we actually wanted.",
      author: 'Tessa B.',
      detail: 'Vow renewal, 2025',
    },
    {
      quote:
        "Premier's captain married us — yes, really. Party On stocked the toast champagne and a curated wine pairing for dinner on the lower deck. Best decision we made all year.",
      author: 'Brian + Allan',
      detail: 'Wedding-party charter, 2025',
    },
  ],

  faqHeadline: 'Wedding-on-a-boat questions.',
  faqs: [
    {
      q: 'How small can a wedding on a Premier boat be?',
      a: 'As small as 2. Most micro-weddings on the lake run 20-40 guests; vow renewals and elopements run 8-15. Premier has boats sized for each.',
    },
    {
      q: 'How big can a wedding on a Premier boat be?',
      a: 'Up to roughly 80 guests on a single charter. Beyond that, we sometimes book two boats (one for the ceremony, one for the reception) docked side-by-side.',
    },
    {
      q: 'Are weddings on a Premier boat legal in Texas?',
      a: 'Yes. The captain can be ordained to officiate, or your own officiant can ride along. Marriage licenses are issued by the county, not the venue.',
    },
    {
      q: 'Who handles the bar?',
      a: 'Party On Delivery handles all alcohol. TABC-licensed, $1M insured. Premier doesn\'t sell alcohol on the boat — we deliver it to the marina and stock the boat before guests arrive.',
    },
    {
      q: 'What if it rains?',
      a: 'Premier monitors weather; if the lake is unsafe, the charter reschedules at no charge. Bar service can be redirected to a backup land venue with 24-hour notice.',
    },
    {
      q: 'Does this work for the morning-after brunch?',
      a: 'Yes — brunch cruises are popular. Premier launches mid-morning; we stock mimosas, bloody marys, and pastries. Roughly $1,500 for a 90-minute brunch cruise for 20.',
    },
  ],

  finalCtaHeadline: 'Your wedding venue.',
  finalCtaHeadlineAccent: "On a Premier boat. On Lake Travis.",
  finalCtaSubhead:
    "Small, intimate, affordable — whichever you need. Boat handled by Premier. Bar handled by Party On.",
  finalCtaImage: PREMIER_TESTIMONIAL,

  phoneDisplay: PHONE_DISPLAY,
  phoneTel: 'tel:7373719700',
  primaryCtaHref: '#builder',
  ctaText: 'PLAN MY LAKE WEDDING →',

  planningCallUrl: 'https://123.partyondelivery.com/planning-call',
  secondaryCtaText: 'SCHEDULE A 10-MIN CALL →',

  quoteInbox: 'brian@premierpartycruises.com',

  modal: {
    title: 'Plan A Lake Travis Wedding',
    ctaPrimary: 'PLAN MY LAKE WEDDING →',
    ctaPrimaryShort: 'PLAN MY WEDDING',
    steps: [
      { key: 'basics', label: 'Wedding basics' },
      { key: 'beer', label: 'Beer & seltzers' },
      { key: 'liquor', label: 'Spirits, wine & cocktails' },
      { key: 'mixers', label: 'Mixers & service' },
      { key: 'review', label: 'Review & submit' },
    ],
    beerStepBlurb:
      'For the welcome toast at the marina and the late-night cooler on deck.',
    liquorStepBlurb:
      'Wine for dinner, champagne for the toast, signature cocktails for the dance floor. We coordinate with Premier on what fits the boat.',
    mixersStepBlurb:
      'Mixers, garnishes, glassware, ice. Add a bartender if Premier requires one for your charter size.',
    basicsHeadline: "Let's lock in your lake wedding.",
    basicsBlurb:
      'Tell us guest count, dates, and which events are on the boat. Premier handles the captain; we handle the bar.',
    groupSizeLabel: 'Guest count',
    groupSizeUnit: 'guests',
    defaultPeople: 30,
    reviewHeadline: 'Review & lock it in.',
    successQuoteHeadline: 'Lake wedding quote received. 🥂',
    successCheckoutHeadline: 'Lake wedding quote received.',
    emailNotice:
      "Premier and Party On coordinate jointly. TABC-licensed retailer. Must be 21+ at delivery. Boat charter terms set by Premier.",
    extraQuestion: {
      id: 'events',
      label: 'Which events on the boat?',
      type: 'multi-checkbox',
      options: [
        { value: 'ceremony', label: 'Ceremony' },
        { value: 'rehearsal', label: 'Rehearsal dinner' },
        { value: 'reception', label: 'Reception / dinner cruise' },
        { value: 'brunch', label: 'Morning-after brunch cruise' },
        { value: 'photo', label: 'Photography / sunset cruise' },
        { value: 'getaway', label: 'Wedding-party getaway cruise' },
      ],
    },
  },
};
